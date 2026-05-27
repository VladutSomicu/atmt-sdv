from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt
)

from ..extensions import db, bcrypt
from ..models.user import User
from ..schemas.auth import RegisterSchema, LoginSchema

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user with hashed password."""
    # Validate input against schema
    try:
        data = RegisterSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400

    # Check for duplicate email
    if User.query.filter_by(email=data.email).first():
        return jsonify({"error": "Email already registered"}), 409

    # Hash password and create user
    hashed_password = bcrypt.generate_password_hash(data.password).decode('utf-8')

    new_user = User(
        email=data.email,
        password_hash=hashed_password,
        full_name=data.full_name
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": "User created successfully",
        "user_id": str(new_user.id)
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT access token."""
    # Validate input against schema
    try:
        data = LoginSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400

    # Find user and verify password
    user = User.query.filter_by(email=data.email).first()

    if not user or not bcrypt.check_password_hash(user.password_hash, data.password):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is deactivated"}), 403

    # Generate JWT access token
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": user.is_admin,
            "is_demo": user.is_demo
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Revoke the current access token."""
    from ..models.revoked_token import RevokedToken
    from ..models.project import Project

    jwt_data = get_jwt()
    jti = jwt_data['jti']
    token_type = jwt_data['type']
    user_id = jwt_data['sub']

    # Unlock any projects locked by this user
    import uuid
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        Project.query.filter_by(locked_by=user_uuid, is_locked=True).update({
            "is_locked": False,
            "locked_by": None,
            "locked_at": None
        }, synchronize_session=False)
    except Exception as e:
        pass

    revoked = RevokedToken(
        jti=jti,
        token_type=token_type,
        user_id=user_id
    )
    db.session.add(revoked)
    db.session.commit()

    return jsonify({"message": "Successfully logged out"}), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token using a valid refresh token."""
    user_id = get_jwt()['sub']
    new_access_token = create_access_token(identity=user_id)

    return jsonify({"access_token": new_access_token}), 200

@auth_bp.route('/demo', methods=['POST'])
def demo_login():
    """Authenticate as the read-only demo user."""
    demo_user = User.query.filter_by(is_demo=True, is_active=True).first()

    if not demo_user:
        return jsonify({"error": "Demo account is not available"}), 503

    access_token = create_access_token(identity=str(demo_user.id))
    refresh_token = create_refresh_token(identity=str(demo_user.id))

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(demo_user.id),
            "email": demo_user.email,
            "full_name": demo_user.full_name,
            "is_admin": demo_user.is_admin,
            "is_demo": demo_user.is_demo
        }
    }), 200


@auth_bp.route('/check-email', methods=['GET'])
@jwt_required()
def check_email():
    """Check if a user with the given email exists. Used by project wizard."""
    email = request.args.get('email', '').strip().lower()
    if not email:
        return jsonify({"error": "email parameter required"}), 400

    user = User.query.filter_by(email=email).first()
    return jsonify({
        "exists": user is not None,
        "full_name": user.full_name if user else None
    }), 200

@auth_bp.route('/directory', methods=['GET'])
@jwt_required()
def get_user_directory():
    """Return a list of all active users for dropdown selection."""
    users = User.query.filter_by(is_active=True).order_by(User.full_name).all()
    return jsonify({
        "users": [
            {"email": u.email, "full_name": u.full_name}
            for u in users
        ]
    }), 200