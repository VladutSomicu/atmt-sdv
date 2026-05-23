from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models.diagram import Diagram
from ..models.project import Project
from ..schemas.diagram import SaveDiagramSchema
from ..utils.auth_decorators import requires_project_role
from pydantic import ValidationError

from .projects import check_project_lock

diagrams_bp = Blueprint('diagrams', __name__, url_prefix='/api/diagrams')


@diagrams_bp.route('', methods=['POST'])
@jwt_required()
def save_diagram():
    """Save a new version of the diagram for a project."""
    try:
        data = SaveDiagramSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400

    project = Project.query.get(data.project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404

    user_id = get_jwt_identity()

    # Check that the project is locked by this user
    is_holder, msg = check_project_lock(project, user_id)
    if not is_holder:
        db.session.commit()
        return jsonify({
            "error": "You must lock the project before saving. " + msg
        }), 403

    # Get the current highest version number
    latest = Diagram.query.filter_by(
        project_id=data.project_id
    ).order_by(Diagram.version.desc()).first()

    new_version = (latest.version + 1) if latest else 1

    diagram = Diagram(
        project_id=data.project_id,
        graph_json=data.graph_json,
        dfd_level=data.dfd_level,
        version=new_version,
        saved_by=user_id
    )

    db.session.add(diagram)
    
    from ..utils.audit import log_action
    log_action(
        user_id=user_id,
        action='diagram_saved',
        project_id=data.project_id,
        new_value={"version": new_version, "dfd_level": data.dfd_level}
    )
    db.session.commit()

    return jsonify({
        "message": f"Diagram saved (version {new_version})",
        "diagram": {
            "id": str(diagram.id),
            "version": diagram.version,
            "dfd_level": diagram.dfd_level,
            "created_at": diagram.created_at.isoformat()
        }
    }), 201


@diagrams_bp.route('/<uuid:project_id>', methods=['GET'])
@jwt_required()
@requires_project_role('engineer', 'architect', 'manager', 'auditor')
def get_diagram(project_id):
    """Return the latest version of the diagram for a project."""
    diagram = Diagram.query.filter_by(
        project_id=str(project_id)
    ).order_by(Diagram.version.desc()).first()

    if not diagram:
        return jsonify({
            "diagram": None,
            "message": "No diagram saved yet"
        }), 200

    return jsonify({
        "diagram": {
            "id": str(diagram.id),
            "project_id": str(diagram.project_id),
            "graph_json": diagram.graph_json,
            "dfd_level": diagram.dfd_level,
            "version": diagram.version,
            "saved_by": str(diagram.saved_by),
            "created_at": diagram.created_at.isoformat()
        }
    }), 200


@diagrams_bp.route('/<uuid:project_id>/versions', methods=['GET'])
@jwt_required()
@requires_project_role('engineer', 'architect', 'manager', 'auditor')
def get_diagram_versions(project_id):
    """Return the version history of diagrams for a project."""
    diagrams = Diagram.query.filter_by(
        project_id=str(project_id)
    ).order_by(Diagram.version.desc()).all()

    return jsonify({
        "versions": [
            {
                "id": str(d.id),
                "version": d.version,
                "dfd_level": d.dfd_level,
                "saved_by": str(d.saved_by),
                "created_at": d.created_at.isoformat()
            }
            for d in diagrams
        ],
        "total": len(diagrams)
    }), 200