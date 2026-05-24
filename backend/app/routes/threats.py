from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import ValidationError

from ..extensions import db
from ..models.threat import Threat
from ..models.control import Control
from ..models.project import Project
from ..schemas.threat import UpdateThreatSchema
from ..utils.auth_decorators import requires_project_role
from ..utils.audit import log_action

threats_bp = Blueprint('threats', __name__, url_prefix='/api/threats')


@threats_bp.route('/<uuid:project_id>', methods=['GET'])
@jwt_required()
@requires_project_role('engineer', 'architect', 'manager', 'auditor')
def get_threats(project_id):
    """Return all threats for a project, sorted by risk score descending."""
    threats = Threat.query.filter_by(
        project_id=str(project_id)
    ).order_by(Threat.risk_score.desc()).all()

    return jsonify({
        "threats": [
            {
                "id": str(t.id),
                "asset_id": t.asset_id,
                "asset_name": t.asset_name,
                "flow_id": t.flow_id,
                "stride_category": t.stride_category,
                "title": t.title,
                "description": t.description,
                "source": t.source,
                "source_ref": t.source_ref,
                "impact_safety": t.impact_safety,
                "impact_financial": t.impact_financial,
                "impact_operational": t.impact_operational,
                "impact_privacy": t.impact_privacy,
                "feasibility": t.feasibility,
                "risk_score": t.risk_score,
                "status": t.status,
                "treatment": t.treatment,
                "justification": t.justification,
                "control_ids": [str(c) for c in t.control_ids] if t.control_ids else [],
                "is_baseline_modified": t.is_baseline_modified,
                "created_at": t.created_at.isoformat()
            }
            for t in threats
        ],
        "total": len(threats),
        "risk_summary": {
            "critical": sum(1 for t in threats if t.risk_score >= 16),
            "high": sum(1 for t in threats if 12 <= t.risk_score <= 15),
            "medium": sum(1 for t in threats if 8 <= t.risk_score <= 11),
            "low": sum(1 for t in threats if 4 <= t.risk_score <= 7),
            "negligible": sum(1 for t in threats if t.risk_score <= 3),
            "open": sum(1 for t in threats if t.status == 'open'),
            "mitigated": sum(1 for t in threats if t.status == 'mitigated'),
        }
    }), 200


@threats_bp.route('/detail/<uuid:threat_id>', methods=['GET'])
@jwt_required()
def get_threat_detail(threat_id):
    """Return a single threat with full details and available controls."""
    threat = Threat.query.get(str(threat_id))

    if not threat:
        return jsonify({"error": "Threat not found"}), 404

    # Find controls that apply to this threat's STRIDE category
    available_controls = Control.query.filter(
        Control.applies_to_stride.any(threat.stride_category)
    ).all()

    return jsonify({
        "threat": {
            "id": str(threat.id),
            "asset_id": threat.asset_id,
            "flow_id": threat.flow_id,
            "stride_category": threat.stride_category,
            "title": threat.title,
            "description": threat.description,
            "source": threat.source,
            "source_ref": threat.source_ref,
            "impact_safety": threat.impact_safety,
            "impact_financial": threat.impact_financial,
            "impact_operational": threat.impact_operational,
            "impact_privacy": threat.impact_privacy,
            "feasibility": threat.feasibility,
            "risk_score": threat.risk_score,
            "status": threat.status,
            "treatment": threat.treatment,
            "justification": threat.justification,
            "control_ids": [str(c) for c in threat.control_ids] if threat.control_ids else [],
            "is_baseline_modified": threat.is_baseline_modified,
        },
        "available_controls": [
            {
                "id": str(c.id),
                "title": c.title,
                "description": c.description,
                "reduction_value": c.reduction_value,
                "reduction_target": c.reduction_target,
                "feasibility_reduction": c.reduction_value if c.reduction_target == 'Feasibility' else 0,
                "source_ref": c.source_ref
            }
            for c in available_controls
        ]
    }), 200


@threats_bp.route('/detail/<uuid:threat_id>', methods=['PUT'])
@jwt_required()
def update_threat(threat_id):
    """Update threat scores, status, treatment, and applied controls."""
    try:
        data = UpdateThreatSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400

    threat = Threat.query.get(str(threat_id))
    if not threat:
        return jsonify({"error": "Threat not found"}), 404

    old_risk_score = threat.risk_score
    old_status = threat.status

    user_id = get_jwt_identity()
    from ..models.project_member import ProjectMember
    from ..models.user import User
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found or deleted"}), 401

    if not user.is_admin:
        member = ProjectMember.query.filter_by(
            project_id=threat.project_id,
            user_id=user_id
        ).first()
        if not member or member.role != 'engineer':
            return jsonify({"error": "Only engineers can modify threat scores"}), 403

    updates = data.model_dump(exclude_unset=True)

    new_status = updates.get('status', threat.status)
    new_treatment = updates.get('treatment', threat.treatment)
    new_justification = updates.get('justification', threat.justification)

    # Require justification if status is 'accepted' or treatment is 'accept'
    is_accepted = (new_status == 'accepted' or new_treatment == 'accept')
    if is_accepted and not new_justification:
        return jsonify({"error": "Justification is required when accepting a risk"}), 400

    # Track if baseline was modified
    score_changed = False

    # Update impact scores
    if data.impact_safety is not None:
        if data.impact_safety != threat.impact_safety:
            score_changed = True
        threat.impact_safety = data.impact_safety

    if data.impact_financial is not None:
        if data.impact_financial != threat.impact_financial:
            score_changed = True
        threat.impact_financial = data.impact_financial

    if data.impact_operational is not None:
        if data.impact_operational != threat.impact_operational:
            score_changed = True
        threat.impact_operational = data.impact_operational

    if data.impact_privacy is not None:
        if data.impact_privacy != threat.impact_privacy:
            score_changed = True
        threat.impact_privacy = data.impact_privacy

    if data.feasibility is not None:
        if data.feasibility != threat.feasibility:
            score_changed = True
        threat.feasibility = data.feasibility

    # Apply controls — reduce target dimensions
    if data.control_ids is not None:
        threat.control_ids = [c for c in data.control_ids]

        for control_id in data.control_ids:
            control = Control.query.get(control_id)
            if control and control.reduction_value:
                target = (control.reduction_target or 'Feasibility').lower()
                val = control.reduction_value
                if 'safety' in target:
                    threat.impact_safety = max(1, threat.impact_safety - val)
                elif 'financial' in target:
                    threat.impact_financial = max(1, threat.impact_financial - val)
                elif 'operational' in target:
                    threat.impact_operational = max(1, threat.impact_operational - val)
                elif 'privacy' in target:
                    threat.impact_privacy = max(1, threat.impact_privacy - val)
                else: # Feasibility
                    threat.feasibility = max(1, threat.feasibility - val)
                score_changed = True

    # Update treatment, status and justification
    if 'treatment' in updates:
        threat.treatment = updates['treatment']

    if 'status' in updates:
        threat.status = updates['status']

    if 'justification' in updates:
        threat.justification = updates['justification']

    # Mark as modified if scores changed
    if score_changed:
        threat.is_baseline_modified = True

    # Recalculate risk score
    threat.risk_score = max(
        threat.impact_safety,
        threat.impact_financial,
        threat.impact_operational,
        threat.impact_privacy
    ) * threat.feasibility

    db.session.commit()

    log_action(
        user_id=user_id,
        action='threat_updated',
        project_id=threat.project_id,
        threat_id=threat.id,
        old_value={
            "risk_score": old_risk_score,
            "status": old_status
        },
        new_value={
            "risk_score": threat.risk_score,
            "status": threat.status
        },
        justification=threat.justification
    )
    db.session.commit()

    return jsonify({
        "message": "Threat updated successfully",
        "threat": {
            "id": str(threat.id),
            "title": threat.title,
            "impact_safety": threat.impact_safety,
            "impact_financial": threat.impact_financial,
            "impact_operational": threat.impact_operational,
            "impact_privacy": threat.impact_privacy,
            "feasibility": threat.feasibility,
            "risk_score": threat.risk_score,
            "status": threat.status,
            "treatment": threat.treatment,
            "is_baseline_modified": threat.is_baseline_modified
        }
    }), 200