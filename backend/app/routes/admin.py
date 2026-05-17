from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db, bcrypt
from ..models.user import User
from ..models.ref_asset import RefAsset
from ..models.ref_threat import RefThreat
from ..models.control import Control
from ..utils.auth_decorators import admin_required
from ..schemas.auth import RegisterSchema
from ..schemas.auth import RegisterSchema
from ..models.audit_log import AuditLog
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

    if 'email' in data and data['email'].strip():
        user.email = data['email'].strip()

    if 'full_name' in data and data['full_name'].strip():
        user.full_name = data['full_name'].strip()

    if 'password' in data and data['password'].strip():
        user.password_hash = bcrypt.generate_password_hash(data['password'].strip()).decode('utf-8')

    db.session.commit()

    return jsonify({
        "message": "User updated successfully",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "is_admin": user.is_admin
        }
    }), 200


@admin_bp.route('/users/<uuid:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """Permanently delete a user account."""
    user = User.query.get(str(user_id))

    if not user:
        return jsonify({"error": "User not found"}), 404

    from flask_jwt_extended import get_jwt_identity
    if str(user.id) == get_jwt_identity():
        return jsonify({"error": "Cannot delete your own account"}), 400

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "User deleted successfully"}), 200


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

@admin_bp.route('/library/assets', methods=['POST'])
@jwt_required()
@admin_required
def create_asset():
    """Create a new reference asset."""
    data = request.get_json() or {}
    
    required_fields = ['name', 'category']
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Missing required field: {field}"}), 400
            
    new_asset = RefAsset(
        name=data['name'],
        category=data['category'],
        interface_types=data.get('interface_types', []),
        data_types=data.get('data_types', []),
        physical_accessibility=data.get('physical_accessibility', 'Internal'),
        asil_level=data.get('asil_level'),
        default_safety=int(data.get('default_safety', 3)),
        default_privacy=int(data.get('default_privacy', 3)),
        flags=data.get('flags', []),
        vehicle_types=data.get('vehicle_types', ['ICE', 'EV'])
    )
    
    db.session.add(new_asset)
    db.session.commit()
    
    return jsonify({
        "message": "Asset created successfully",
        "asset": {
            "id": str(new_asset.id),
            "name": new_asset.name
        }
    }), 201


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

@admin_bp.route('/library/threats', methods=['POST'])
@jwt_required()
@admin_required
def create_threat():
    """Create a new reference threat."""
    data = request.get_json() or {}
    
    required_fields = ['stride_category', 'title', 'description', 'source']
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Missing required field: {field}"}), 400
            
    new_threat = RefThreat(
        stride_category=data['stride_category'],
        title=data['title'],
        description=data['description'],
        source=data['source'],
        source_ref=data.get('source_ref'),
        default_impact=int(data.get('default_impact', 3)),
        default_feasibility=int(data.get('default_feasibility', 3))
    )
    
    db.session.add(new_threat)
    db.session.commit()
    
    return jsonify({
        "message": "Threat created successfully",
        "threat": {
            "id": str(new_threat.id),
            "title": new_threat.title
        }
    }), 201


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

@admin_bp.route('/library/controls', methods=['POST'])
@jwt_required()
@admin_required
def create_control():
    """Create a new security control."""
    data = request.get_json() or {}
    
    if not data.get('title'):
        return jsonify({"error": "Missing required field: title"}), 400
            
    new_control = Control(
        title=data['title'],
        description=data.get('description'),
        applies_to_stride=data.get('applies_to_stride', []),
        applies_to_protocols=data.get('applies_to_protocols', []),
        feasibility_reduction=int(data.get('feasibility_reduction', 1)),
        source_ref=data.get('source_ref')
    )
    
    db.session.add(new_control)
    db.session.commit()
    
    return jsonify({
        "message": "Control created successfully",
        "control": {
            "id": str(new_control.id),
            "title": new_control.title
        }
    }), 201

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

@admin_bp.route('/public/threats', methods=['GET'])
@jwt_required()
def get_public_threats():
    """Return all reference threats for the catalog."""
    threats = RefThreat.query.order_by(
        RefThreat.stride_category, RefThreat.title
    ).all()

    return jsonify({
        "threats": [
            {
                "id": str(t.id),
                "stride_category": t.stride_category,
                "title": t.title,
                "description": t.description,
                "source": t.source,
                "source_ref": t.source_ref,
                "default_impact": t.default_impact,
                "default_feasibility": t.default_feasibility
            }
            for t in threats
        ],
        "total": len(threats)
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

@admin_bp.route('/audit', methods=['GET'])
@jwt_required()
@admin_required
def get_global_audit_log():
    """Return the global audit log across the platform."""
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(500).all()

    result = []
    for log in logs:
        from ..models.user import User
        user = User.query.get(log.user_id)
        project = None
        if log.project_id:
            from ..models.project import Project
            project = Project.query.get(log.project_id)
            
        result.append({
            "id": str(log.id),
            "action": log.action,
            "user": user.full_name if user else "Unknown",
            "project_name": project.name if project else "Global",
            "old_value": log.old_value,
            "new_value": log.new_value,
            "justification": log.justification,
            "created_at": log.created_at.isoformat()
        })

    return jsonify({
        "audit_log": result,
        "total": len(result)
    }), 200