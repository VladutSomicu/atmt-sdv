from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from flask_jwt_extended import create_access_token

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

    return jsonify({
        "access_token": access_token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": user.is_admin,
            "is_demo": user.is_demo
        }
    }), 200