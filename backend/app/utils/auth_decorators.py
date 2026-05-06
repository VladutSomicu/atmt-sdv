from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from ..models.user import User


def admin_required(fn):
    """
    Decorator that restricts access to global administrators only.
    Must be used after @jwt_required().
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or not user.is_admin:
            return jsonify({"error": "Administrator access required"}), 403

        return fn(*args, **kwargs)
    return wrapper


def requires_project_role(*allowed_roles):
    """
    Decorator that checks if the current user has one of the allowed roles
    on the project identified by project_id in the URL.
    Global admins (is_admin=True) bypass this check.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user:
                return jsonify({"error": "User not found"}), 404

            # Global admins can access any project
            if user.is_admin:
                return fn(*args, **kwargs)

            # Get project_id from URL parameters
            project_id = kwargs.get('project_id')
            if not project_id:
                return jsonify({"error": "Project ID required"}), 400

            # Check membership and role
            from ..models.project_member import ProjectMember
            member = ProjectMember.query.filter_by(
                project_id=str(project_id),
                user_id=user_id
            ).first()

            if not member or member.role not in allowed_roles:
                return jsonify({"error": "Insufficient permissions on this project"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator