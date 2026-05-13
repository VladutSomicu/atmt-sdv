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

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


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
    db.session.commit()

    # Return PDF file
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"TARA_Report_{project.name.replace(' ', '_')}.pdf"
    )