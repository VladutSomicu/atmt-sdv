from flask import Blueprint, request, jsonify
from ..extensions import db, bcrypt
from ..models.user import User
from flask_jwt_extended import create_access_token

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user with hashed password."""
    data = request.get_json()

    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({"msg": "Email already exists"}), 400

    hashed_password = bcrypt.generate_password_hash(data.get('password')).decode('utf-8')

    new_user = User(
        email=data.get('email'),
        password_hash=hashed_password,
        full_name=data.get('full_name')
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"msg": "User created successfully"}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token."""
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()

    if user and bcrypt.check_password_hash(user.password_hash, data.get('password')):
        # Create token with user ID as identity
        access_token = create_access_token(identity=str(user.id))
        return jsonify(access_token=access_token), 200

    return jsonify({"msg": "Invalid email or password"}), 401