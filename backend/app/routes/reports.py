from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
import io

from ..models.project import Project
from ..models.threat import Threat
from ..models.diagram import Diagram
from ..models.project_member import ProjectMember
from ..models.user import User
from ..utils.auth_decorators import requires_project_role
from ..utils.report_generator import ReportGenerator
from ..routes.compliance import _run_r155_checks, _run_r156_checks, _run_general_checks
from ..utils.audit import log_action

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


@reports_bp.route('/global', methods=['GET'])
@jwt_required()
def get_global_reports():
    """Return aggregated compliance and threat reports across all visible projects."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found or deleted"}), 401

    if user.is_admin:
        projects = Project.query.all()
    else:
        memberships = ProjectMember.query.filter_by(user_id=user_id).all()
        project_ids = [m.project_id for m in memberships]
        if not project_ids:
            projects = []
        else:
            projects = Project.query.filter(Project.id.in_(project_ids)).all()

    total_projects = len(projects)
    total_threats = 0
    mitigated_threats = 0
    open_threats = 0
    threat_severity = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    project_list = []
    compliance_scores = []

    for p in projects:
        # Get threats
        threats = Threat.query.filter_by(project_id=str(p.id)).all()
        total_threats += len(threats)
        for t in threats:
            if t.status == 'mitigated' or t.status == 'closed':
                mitigated_threats += 1
            else:
                open_threats += 1

            if t.risk_score >= 16:
                threat_severity["critical"] += 1
            elif t.risk_score >= 12:
                threat_severity["high"] += 1
            elif t.risk_score >= 8:
                threat_severity["medium"] += 1
            else:
                threat_severity["low"] += 1

        # Get compliance score
        diagram = Diagram.query.filter_by(project_id=str(p.id)).order_by(Diagram.version.desc()).first()
        graph_json = diagram.graph_json if diagram else {"nodes": [], "edges": []}
        vehicle_profile = p.vehicle_profile or {}

        r155 = _run_r155_checks(graph_json, threats)
        r156 = _run_r156_checks(graph_json, threats, vehicle_profile)
        general = _run_general_checks(threats)
        all_checks = r155 + r156 + general

        passed = sum(1 for c in all_checks if c['status'] == 'pass')
        applicable = sum(1 for c in all_checks if c['status'] != 'n/a')
        score = round((passed / applicable * 100)) if applicable > 0 else 100
        compliance_scores.append(score)

        project_list.append({
            "id": str(p.id),
            "name": p.name,
            "status": p.status,
            "propulsion": vehicle_profile.get("propulsion", "ICE"),
            "sae_level": vehicle_profile.get("sae_level", "Level 2"),
            "compliance_score": score,
            "total_threats": len(threats),
            "open_critical": sum(1 for t in threats if t.risk_score >= 16 and t.status == 'open'),
            "updated_at": p.updated_at.isoformat()
        })

    avg_compliance = round(sum(compliance_scores) / len(compliance_scores)) if compliance_scores else 100

    return jsonify({
        "summary": {
            "total_projects": total_projects,
            "total_threats": total_threats,
            "mitigated_threats": mitigated_threats,
            "open_threats": open_threats,
            "threat_severity": threat_severity,
            "avg_compliance": avg_compliance
        },
        "projects": project_list
    }), 200


@reports_bp.route('/<uuid:project_id>/generate', methods=['POST'])
@jwt_required()
@requires_project_role('engineer', 'manager')
def generate_report(project_id):
    """Generate a TARA report PDF for the project."""
    project = Project.query.get(str(project_id))
    if not project:
        return jsonify({"error": "Project not found"}), 404

    # Get threats
    threats = Threat.query.filter_by(
        project_id=str(project_id)
    ).order_by(Threat.risk_score.desc()).all()

    if not threats:
        return jsonify({"error": "No threats found. Run analysis first."}), 400

    # Check for unresolved critical risks
    open_critical = [t for t in threats if t.risk_score >= 16 and t.status == 'open']
    if open_critical:
        return jsonify({
            "error": f"Cannot generate report: {len(open_critical)} critical risk(s) still open.",
            "open_critical": [
                {"id": str(t.id), "title": t.title, "risk_score": t.risk_score}
                for t in open_critical
            ]
        }), 400

    # Get compliance checks
    diagram = Diagram.query.filter_by(
        project_id=str(project_id)
    ).order_by(Diagram.version.desc()).first()

    graph_json = diagram.graph_json if diagram else {"nodes": [], "edges": []}
    vehicle_profile = project.vehicle_profile or {}

    r155 = _run_r155_checks(graph_json, threats)
    r156 = _run_r156_checks(graph_json, threats, vehicle_profile)
    general = _run_general_checks(threats)
    compliance = {"checks": r155 + r156 + general}

    # Get team members
    memberships = ProjectMember.query.filter_by(project_id=str(project_id)).all()
    members = []
    for m in memberships:
        user = User.query.get(m.user_id)
        if user:
            members.append({
                "full_name": user.full_name,
                "email": user.email,
                "role": m.role
            })

    # Generate PDF
    generator = ReportGenerator()
    pdf_bytes = generator.generate(project, threats, compliance, members)

    # Update project status
    project.status = 'completed'
    from ..extensions import db

    log_action(
        user_id=get_jwt_identity(),
        action='report_generated',
        project_id=str(project_id)
    )
    db.session.commit()

    # Return PDF file
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"TARA_Report_{project.name.replace(' ', '_')}.pdf"
    )