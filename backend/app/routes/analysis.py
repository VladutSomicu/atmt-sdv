from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models.user import User
from ..models.project import Project
from ..models.threat import Threat
from ..models.diagram import Diagram
from ..analysis_engine.engine import ThreatEngine
from ..utils.auth_decorators import requires_project_role
from ..utils.audit import log_action

analysis_bp = Blueprint('analysis', __name__, url_prefix='/api')


@analysis_bp.route('/analyze', methods=['POST'])
@jwt_required()
def run_analysis():
    """
    Run the TARA analysis engine on a project's diagram.
    Requires the project to be locked by the requesting user.
    Clears any previous threats and generates fresh results.
    """
    data = request.get_json() or {}
    project_id = data.get('project_id')

    if not project_id:
        return jsonify({"error": "project_id is required"}), 400

    # Verify project exists
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found or deleted"}), 401
    
    if not user.is_admin:
        from ..models.project_member import ProjectMember
        member = ProjectMember.query.filter_by(
            project_id=project_id,
            user_id=user_id
        ).first()
        
        if not member or member.role not in ['engineer', 'architect']:
            return jsonify({"error": "Only engineers and architects can run the analysis engine"}), 403

    # Get the latest diagram
    diagram = Diagram.query.filter_by(
        project_id=project_id
    ).order_by(Diagram.version.desc()).first()

    if not diagram:
        return jsonify({"error": "No diagram saved yet. Draw and save first."}), 400

    graph_json = diagram.graph_json
    vehicle_profile = project.vehicle_profile or {}

    # Run the engine
    engine = ThreatEngine()
    threats_data = engine.analyze(graph_json, vehicle_profile)

    # Clear previous threats for this project
    Threat.query.filter_by(project_id=project_id).delete()

    # Save new threats to DB
    saved_threats = []
    for t in threats_data:
        threat = Threat(
            project_id=project_id,
            ref_threat_id=t.get('ref_threat_id'),
            asset_id=t['asset_id'],
            asset_name=t.get('asset_label', 'Unknown Component'),
            flow_id=t.get('flow_id'),
            stride_category=t['stride'],
            title=t['threat_title'],
            description=t.get('description'),
            source=t.get('source'),
            source_ref=t.get('source_ref'),
            impact_safety=t['baseline_impact_safety'],
            impact_financial=t['baseline_impact_financial'],
            impact_operational=t['baseline_impact_operational'],
            impact_privacy=t['baseline_impact_privacy'],
            feasibility=t['baseline_feasibility'],
            risk_score=t['baseline_risk_score'],
            status='open'
        )
        db.session.add(threat)
        saved_threats.append(threat)

    # Update project status
    project.status = 'in_analysis'

    log_action(
        user_id=get_jwt_identity(),
        action='analysis_run',
        project_id=project_id,
        new_value={"threats_identified": len(saved_threats)}
    )
    db.session.commit()

    # Build response
    response_threats = []
    for threat in saved_threats:
        response_threats.append({
            "id": str(threat.id),
            "asset_id": threat.asset_id,
            "flow_id": threat.flow_id,
            "stride_category": threat.stride_category,
            "title": threat.title,
            "source": threat.source,
            "source_ref": threat.source_ref,
            "impact_safety": threat.impact_safety,
            "impact_financial": threat.impact_financial,
            "impact_operational": threat.impact_operational,
            "impact_privacy": threat.impact_privacy,
            "feasibility": threat.feasibility,
            "risk_score": threat.risk_score,
            "status": threat.status
        })

    return jsonify({
        "message": f"Analysis complete. {len(saved_threats)} threats identified.",
        "threats_identified": len(saved_threats),
        "threats": response_threats
    }), 200