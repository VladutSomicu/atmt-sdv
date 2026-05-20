from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import ValidationError
from datetime import datetime, timezone

from ..extensions import db
from ..models.project import Project
from ..models.project_member import ProjectMember
from ..models.user import User
from ..schemas.project import CreateProjectSchema, InviteMemberSchema
from ..utils.auth_decorators import requires_project_role
from ..models.audit_log import AuditLog
from ..models.user import User

projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')


@projects_bp.route('', methods=['GET'])
@jwt_required()
def get_my_projects():
    """Return all projects where the current user is a member."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found or deleted"}), 401

    # Admins see all projects
    if user.is_admin:
        projects = Project.query.order_by(Project.updated_at.desc()).all()
    else:
        # Get projects through project_members
        memberships = ProjectMember.query.filter_by(user_id=user_id).all()
        project_ids = [m.project_id for m in memberships]
        if not project_ids:
            projects = []
        else:
            projects = Project.query.filter(
                Project.id.in_(project_ids)
            ).order_by(Project.updated_at.desc()).all()

    # Build response with role info
    result = []
    for p in projects:
        membership = ProjectMember.query.filter_by(
            project_id=p.id, user_id=user_id
        ).first()

        result.append({
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "status": p.status,
            "vehicle_profile": p.vehicle_profile,
            "my_role": membership.role if membership else "admin",
            "is_locked": p.is_locked,
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat()
        })

    return jsonify({"projects": result, "total": len(result)}), 200


@projects_bp.route('', methods=['POST'])
@jwt_required()
def create_project():
    """Create a new project. Creator becomes manger automatically."""
    try:
        data = CreateProjectSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400

    user_id = get_jwt_identity()

    # Create the project
    project = Project(
        name=data.name,
        description=data.description,
        vehicle_profile=data.vehicle_profile,
        business_objectives=data.business_objectives,
        created_by=user_id
    )

    db.session.add(project)
    db.session.flush()  # Get the project ID before committing

    # Add creator as manager on the project
    member = ProjectMember(
        project_id=project.id,
        user_id=user_id,
        role='manager',
        invited_by=user_id
    )

    db.session.add(member)
    db.session.commit()

    return jsonify({
        "message": "Project created successfully",
        "project": {
            "id": str(project.id),
            "name": project.name,
            "status": project.status,
            "my_role": "manger"
        }
    }), 201


@projects_bp.route('/<uuid:project_id>', methods=['GET'])
@jwt_required()
@requires_project_role('engineer', 'architect', 'manager', 'auditor')
def get_project(project_id):
    """Return project details with members list."""
    project = Project.query.get(str(project_id))

    if not project:
        return jsonify({"error": "Project not found"}), 404

    # Get all members
    members = ProjectMember.query.filter_by(project_id=project.id).all()
    members_list = []
    for m in members:
        user = User.query.get(m.user_id)
        members_list.append({
            "user_id": str(m.user_id),
            "email": user.email if user else None,
            "full_name": user.full_name if user else None,
            "role": m.role,
            "joined_at": m.joined_at.isoformat()
        })

    return jsonify({
        "project": {
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
            "status": project.status,
            "vehicle_profile": project.vehicle_profile,
            "business_objectives": project.business_objectives,
            "is_locked": project.is_locked,
            "locked_by": str(project.locked_by) if project.locked_by else None,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat()
        },
        "members": members_list
    }), 200


@projects_bp.route('/<uuid:project_id>/members', methods=['POST'])
@jwt_required()
@requires_project_role('manager')
def invite_member(project_id):
    """Invite a user to the project with a specific role."""
    try:
        data = InviteMemberSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400

    # Find user by email
    user = User.query.filter_by(email=data.email).first()
    if not user:
        return jsonify({"error": "User not found with this email"}), 404

    # Check if already a member
    existing = ProjectMember.query.filter_by(
        project_id=str(project_id),
        user_id=user.id
    ).first()

    if existing:
        return jsonify({"error": "User is already a member of this project"}), 409

    member = ProjectMember(
        project_id=str(project_id),
        user_id=user.id,
        role=data.role,
        invited_by=get_jwt_identity()
    )

    db.session.add(member)
    db.session.commit()

    return jsonify({
        "message": f"{user.full_name} invited as {data.role}",
        "member": {
            "user_id": str(user.id),
            "email": user.email,
            "role": data.role
        }
    }), 201


@projects_bp.route('/<uuid:project_id>/lock', methods=['PUT'])
@jwt_required()
@requires_project_role('engineer', 'architect')
def lock_project(project_id):
    """Lock the project diagram for editing."""
    project = Project.query.get(str(project_id))

    if not project:
        return jsonify({"error": "Project not found"}), 404

    if project.is_locked:
        locked_user = User.query.get(project.locked_by)
        locked_name = locked_user.full_name if locked_user else "Unknown"
        return jsonify({
            "error": f"Project is already locked by {locked_name}"
        }), 409

    user_id = get_jwt_identity()
    project.is_locked = True
    project.locked_by = user_id
    project.locked_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "Project locked successfully"}), 200


@projects_bp.route('/<uuid:project_id>/unlock', methods=['PUT'])
@jwt_required()
@requires_project_role('engineer', 'architect')
def unlock_project(project_id):
    """Unlock the project diagram."""
    project = Project.query.get(str(project_id))

    if not project:
        return jsonify({"error": "Project not found"}), 404

    user_id = get_jwt_identity()

    # Only the lock holder or admin can unlock
    if project.locked_by and str(project.locked_by) != user_id:
        user = User.query.get(user_id)
        if not user.is_admin:
            return jsonify({"error": "Only the lock holder can unlock"}), 403

    project.is_locked = False
    project.locked_by = None
    project.locked_at = None
    db.session.commit()

    return jsonify({"message": "Project unlocked successfully"}), 200


@projects_bp.route('/<uuid:project_id>/audit', methods=['GET'])
@jwt_required()
@requires_project_role('engineer', 'manager', 'auditor')
def get_audit_log(project_id):
    """Return the audit log for a project."""
    logs = AuditLog.query.filter_by(
        project_id=str(project_id)
    ).order_by(AuditLog.created_at.desc()).all()

    result = []
    for log in logs:
        user = User.query.get(log.user_id)
        result.append({
            "id": str(log.id),
            "action": log.action,
            "user": user.full_name if user else "Unknown",
            "old_value": log.old_value,
            "new_value": log.new_value,
            "justification": log.justification,
            "created_at": log.created_at.isoformat()
        })

    return jsonify({
        "audit_log": result,
        "total": len(result)
    }), 200


from ..utils.audit import log_action

@projects_bp.route('/<uuid:project_id>', methods=['PUT'])
@jwt_required()
@requires_project_role('manager')
def update_project(project_id):
    """Update project metadata. Only manager can edit."""
    project = Project.query.get(str(project_id))
    if not project:
        return jsonify({"error": "Project not found"}), 404

    data = request.get_json() or {}

    if 'name' in data and len(data['name']) >= 2:
        project.name = data['name']
    if 'description' in data:
        project.description = data['description']
    if 'vehicle_profile' in data:
        project.vehicle_profile = data['vehicle_profile']
    if 'business_objectives' in data:
        project.business_objectives = data['business_objectives']

    log_action(
        user_id=get_jwt_identity(),
        action='project_updated',
        project_id=str(project_id),
        new_value=data
    )
    db.session.commit()

    return jsonify({
        "message": "Project updated successfully",
        "project": {
            "id": str(project.id),
            "name": project.name,
            "status": project.status
        }
    }), 200


@projects_bp.route('/<uuid:project_id>', methods=['DELETE'])
@jwt_required()
@requires_project_role('manager')
def delete_project(project_id):
    """Delete a project and all associated data. Only manager can delete."""
    project = Project.query.get(str(project_id))
    if not project:
        return jsonify({"error": "Project not found"}), 404

    project_name = project.name

    # CASCADE handles: project_members, diagrams, threats, audit_log
    db.session.delete(project)
    db.session.commit()

    return jsonify({
        "message": f"Project '{project_name}' deleted successfully"
    }), 200