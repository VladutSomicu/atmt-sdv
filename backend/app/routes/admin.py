from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db, bcrypt
from ..models.user import User
from ..models.ref_asset import RefAsset
from ..models.ref_threat import RefThreat
from ..models.control import Control
from ..utils.auth_decorators import admin_required
from ..schemas.auth import RegisterSchema
from pydantic import ValidationError

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def get_users():
    """Return a list of all users in the platform."""
    users = User.query.order_by(User.created_at.desc()).all()

    return jsonify({
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "is_admin": u.is_admin,
                "is_active": u.is_active,
                "is_demo": u.is_demo,
                "created_at": u.created_at.isoformat()
            }
            for u in users
        ],
        "total": len(users)
    }), 200


@admin_bp.route('/users', methods=['POST'])
@jwt_required()
@admin_required
def create_user():
    """Create a new user account (admin only)."""
    try:
        data = RegisterSchema(**(request.get_json() or {}))
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400

    if User.query.filter_by(email=data.email).first():
        return jsonify({"error": "Email already registered"}), 409

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
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "full_name": new_user.full_name
        }
    }), 201


@admin_bp.route('/users/<uuid:user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_user(user_id):
    """Activate or deactivate a user account."""
    user = User.query.get(str(user_id))

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Prevent admin from deactivating their own account
    from flask_jwt_extended import get_jwt_identity
    if str(user.id) == get_jwt_identity():
        return jsonify({"error": "Cannot modify your own account"}), 400

    data = request.get_json() or {}

    if 'is_active' in data:
        user.is_active = bool(data['is_active'])

    if 'is_admin' in data:
        user.is_admin = bool(data['is_admin'])

    db.session.commit()

    return jsonify({
        "message": "User updated successfully",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin
        }
    }), 200


@admin_bp.route('/library/assets', methods=['GET'])
@jwt_required()
@admin_required
def get_assets():
    """Return all reference assets."""
    assets = RefAsset.query.order_by(RefAsset.category, RefAsset.name).all()

    return jsonify({
        "assets": [
            {
                "id": str(a.id),
                "name": a.name,
                "category": a.category,
                "interface_types": a.interface_types,
                "vehicle_types": a.vehicle_types
            }
            for a in assets
        ],
        "total": len(assets)
    }), 200


@admin_bp.route('/library/threats', methods=['GET'])
@jwt_required()
@admin_required
def get_threats():
    """Return all reference threats."""
    threats = RefThreat.query.order_by(
        RefThreat.stride_category, RefThreat.title
    ).all()

    return jsonify({
        "threats": [
            {
                "id": str(t.id),
                "stride_category": t.stride_category,
                "title": t.title,
                "source": t.source,
                "source_ref": t.source_ref,
                "default_impact": t.default_impact,
                "default_feasibility": t.default_feasibility
            }
            for t in threats
        ],
        "total": len(threats)
    }), 200


@admin_bp.route('/library/controls', methods=['GET'])
@jwt_required()
@admin_required
def get_controls():
    """Return all security controls."""
    controls = Control.query.order_by(Control.title).all()

    return jsonify({
        "controls": [
            {
                "id": str(c.id),
                "title": c.title,
                "applies_to_stride": c.applies_to_stride,
                "feasibility_reduction": c.feasibility_reduction,
                "source_ref": c.source_ref
            }
            for c in controls
        ],
        "total": len(controls)
    }), 200

@admin_bp.route('/public/assets', methods=['GET'])
@jwt_required()
def get_public_assets():
    """Return ref_assets filtered by vehicle_type. Used by canvas sidebar."""
    vehicle_type = request.args.get('vehicle_type')

    query = RefAsset.query
    if vehicle_type:
        query = query.filter(RefAsset.vehicle_types.any(vehicle_type))

    assets = query.order_by(RefAsset.category, RefAsset.name).all()

    return jsonify({
        "assets": [
            {
                "id": str(a.id),
                "name": a.name,
                "category": a.category,
                "interface_types": a.interface_types,
                "data_types": a.data_types,
                "physical_accessibility": a.physical_accessibility,
                "asil_level": a.asil_level,
                "default_safety": a.default_safety,
                "default_privacy": a.default_privacy,
                "flags": a.flags,
                "vehicle_types": a.vehicle_types
            }
            for a in assets
        ],
        "total": len(assets)
    }), 200


@admin_bp.route('/public/controls', methods=['GET'])
@jwt_required()
def get_public_controls():
    """Return controls filtered by stride_category. Used by threat panel."""
    stride = request.args.get('stride_category')

    query = Control.query
    if stride:
        query = query.filter(Control.applies_to_stride.any(stride))

    controls = query.order_by(Control.title).all()

    return jsonify({
        "controls": [
            {
                "id": str(c.id),
                "title": c.title,
                "description": c.description,
                "applies_to_stride": c.applies_to_stride,
                "applies_to_protocols": c.applies_to_protocols,
                "feasibility_reduction": c.feasibility_reduction,
                "source_ref": c.source_ref
            }
            for c in controls
        ],
        "total": len(controls)
    }), 200