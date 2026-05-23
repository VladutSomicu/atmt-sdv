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

    req_json = request.get_json() or {}
    is_admin = bool(req_json.get('is_admin', False))

    new_user = User(
        email=data.email,
        password_hash=hashed_password,
        full_name=data.full_name,
        is_admin=is_admin
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
    admin_id = get_jwt_identity()
    if str(user.id) == admin_id:
        return jsonify({"error": "Cannot delete your own account"}), 400

    try:
        from ..models.project import Project
        from ..models.diagram import Diagram
        from ..models.project_member import ProjectMember
        from ..models.audit_log import AuditLog
        from ..models.revoked_token import RevokedToken

        # 1. Release locks held by the user
        Project.query.filter_by(locked_by=user.id).update({
            "is_locked": False,
            "locked_by": None,
            "locked_at": None
        }, synchronize_session=False)

        # 2. Reassign projects created by the user to the deleting admin
        Project.query.filter_by(created_by=user.id).update({
            "created_by": admin_id
        }, synchronize_session=False)

        # 3. Reassign diagrams saved by the user to the deleting admin
        Diagram.query.filter_by(saved_by=user.id).update({
            "saved_by": admin_id
        }, synchronize_session=False)

        # 4. Nullify invited_by in ProjectMember
        ProjectMember.query.filter_by(invited_by=user.id).update({
            "invited_by": None
        }, synchronize_session=False)

        # 5. Delete project memberships of this user
        ProjectMember.query.filter_by(user_id=user.id).delete(synchronize_session=False)

        # 6. Reassign audit logs of this user to the deleting admin
        AuditLog.query.filter_by(user_id=user.id).update({
            "user_id": admin_id
        }, synchronize_session=False)

        # 7. Delete revoked tokens of this user
        RevokedToken.query.filter_by(user_id=user.id).delete(synchronize_session=False)

        # 8. Delete the user itself
        db.session.delete(user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete user: {str(e)}"}), 500

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
                "vehicle_types": a.vehicle_types,
                "data_types": a.data_types,
                "physical_accessibility": a.physical_accessibility,
                "asil_level": a.asil_level,
                "default_safety": a.default_safety or 3,
                "default_financial": a.default_financial or 3,
                "default_operational": a.default_operational or 3,
                "default_privacy": a.default_privacy or 3,
                "flags": a.flags
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
        default_financial=int(data.get('default_financial', 3)),
        default_operational=int(data.get('default_operational', 3)),
        default_privacy=int(data.get('default_privacy', 3)),
        flags=data.get('flags', []),
        vehicle_types=data.get('vehicle_types', ['ICE', 'EV', 'Hybrid']),
        architectures=data.get('architectures', ['Classic', 'SDV'])
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
                "default_impact_safety": t.default_impact_safety,
                "default_impact_financial": t.default_impact_financial,
                "default_impact_operational": t.default_impact_operational,
                "default_impact_privacy": t.default_impact_privacy,
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
        default_impact_safety=int(data.get('default_impact_safety', 3)),
        default_impact_financial=int(data.get('default_impact_financial', 3)),
        default_impact_operational=int(data.get('default_impact_operational', 3)),
        default_impact_privacy=int(data.get('default_impact_privacy', 3)),
        default_feasibility=int(data.get('default_feasibility', 3)),
        vehicle_types=data.get('vehicle_types', ['ICE', 'EV', 'Hybrid']),
        architectures=data.get('architectures', ['Classic', 'SDV'])
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
                "reduction_value": c.reduction_value,
                "reduction_target": c.reduction_target,
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
        reduction_value=int(data.get('reduction_value', 1)),
        reduction_target=data.get('reduction_target', 'Feasibility'),
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
    architecture = request.args.get('architecture')

    query = RefAsset.query
    if vehicle_type:
        from sqlalchemy import or_
        query = query.filter(or_(
            RefAsset.vehicle_types.any(vehicle_type),
            RefAsset.vehicle_types.any('ALL')
        ))
    if architecture:
        from sqlalchemy import or_
        query = query.filter(or_(
            RefAsset.architectures.any(architecture),
            RefAsset.architectures.any('ALL')
        ))

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
                "default_safety": a.default_safety or 3,
                "default_financial": a.default_financial or 3,
                "default_operational": a.default_operational or 3,
                "default_privacy": a.default_privacy or 3,
                "flags": a.flags,
                "vehicle_types": a.vehicle_types,
                "architectures": a.architectures
            }
            for a in assets
        ],
        "total": len(assets)
    }), 200

@admin_bp.route('/public/threats', methods=['GET'])
@jwt_required()
def get_public_threats():
    """Return all reference threats for the catalog."""
    vehicle_type = request.args.get('vehicle_type')
    architecture = request.args.get('architecture')
    
    query = RefThreat.query
    if vehicle_type:
        from sqlalchemy import or_
        query = query.filter(or_(
            RefThreat.vehicle_types.any(vehicle_type),
            RefThreat.vehicle_types.any('ALL')
        ))
    if architecture:
        from sqlalchemy import or_
        query = query.filter(or_(
            RefThreat.architectures.any(architecture),
            RefThreat.architectures.any('ALL')
        ))
        
    threats = query.order_by(
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
                "default_impact_safety": t.default_impact_safety,
                "default_impact_financial": t.default_impact_financial,
                "default_impact_operational": t.default_impact_operational,
                "default_impact_privacy": t.default_impact_privacy,
                "default_feasibility": t.default_feasibility,
                "vehicle_types": t.vehicle_types,
                "architectures": t.architectures
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
                "reduction_value": c.reduction_value,
                "reduction_target": c.reduction_target,
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

@admin_bp.route('/library/assets/<uuid:asset_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_asset(asset_id):
    """Update an existing reference asset."""
    asset = RefAsset.query.get(str(asset_id))
    if not asset:
        return jsonify({"error": "Asset not found"}), 404
        
    data = request.get_json() or {}
    
    if 'name' in data:
        asset.name = data['name']
    if 'category' in data:
        asset.category = data['category']
    if 'interface_types' in data:
        asset.interface_types = data['interface_types']
    if 'data_types' in data:
        asset.data_types = data['data_types']
    if 'physical_accessibility' in data:
        asset.physical_accessibility = data['physical_accessibility']
    if 'asil_level' in data:
        asset.asil_level = data['asil_level']
    if 'default_safety' in data:
        asset.default_safety = int(data['default_safety'])
    if 'default_financial' in data:
        asset.default_financial = int(data['default_financial'])
    if 'default_operational' in data:
        asset.default_operational = int(data['default_operational'])
    if 'default_privacy' in data:
        asset.default_privacy = int(data['default_privacy'])
    if 'flags' in data:
        asset.flags = data['flags']
    if 'vehicle_types' in data:
        asset.vehicle_types = data['vehicle_types']
    if 'architectures' in data:
        asset.architectures = data['architectures']
        
    db.session.commit()
    return jsonify({"message": "Asset updated successfully", "asset": {"id": str(asset.id), "name": asset.name}}), 200

@admin_bp.route('/library/assets/<uuid:asset_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_asset(asset_id):
    """Delete a reference asset."""
    asset = RefAsset.query.get(str(asset_id))
    if not asset:
        return jsonify({"error": "Asset not found"}), 404
    db.session.delete(asset)
    db.session.commit()
    return jsonify({"message": "Asset deleted successfully"}), 200

@admin_bp.route('/library/threats/<uuid:threat_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_threat(threat_id):
    """Update an existing reference threat."""
    threat = RefThreat.query.get(str(threat_id))
    if not threat:
        return jsonify({"error": "Threat not found"}), 404
        
    data = request.get_json() or {}
    if 'stride_category' in data:
        threat.stride_category = data['stride_category']
    if 'title' in data:
        threat.title = data['title']
    if 'description' in data:
        threat.description = data['description']
    if 'source' in data:
        threat.source = data['source']
    if 'source_ref' in data:
        threat.source_ref = data['source_ref']
    if 'default_impact_safety' in data:
        threat.default_impact_safety = int(data['default_impact_safety'])
    if 'default_impact_financial' in data:
        threat.default_impact_financial = int(data['default_impact_financial'])
    if 'default_impact_operational' in data:
        threat.default_impact_operational = int(data['default_impact_operational'])
    if 'default_impact_privacy' in data:
        threat.default_impact_privacy = int(data['default_impact_privacy'])
    if 'default_feasibility' in data:
        threat.default_feasibility = int(data['default_feasibility'])
    if 'vehicle_types' in data:
        threat.vehicle_types = data['vehicle_types']
    if 'architectures' in data:
        threat.architectures = data['architectures']
        
    db.session.commit()
    return jsonify({"message": "Threat updated successfully", "threat": {"id": str(threat.id), "title": threat.title}}), 200

@admin_bp.route('/library/threats/<uuid:threat_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_threat(threat_id):
    """Delete a reference threat."""
    threat = RefThreat.query.get(str(threat_id))
    if not threat:
        return jsonify({"error": "Threat not found"}), 404
        
    try:
        from ..models.threat import Threat
        Threat.query.filter_by(ref_threat_id=threat.id).update({"ref_threat_id": None}, synchronize_session=False)
        db.session.delete(threat)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete threat: {str(e)}"}), 500
        
    return jsonify({"message": "Threat deleted successfully"}), 200

@admin_bp.route('/library/controls/<uuid:control_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_control(control_id):
    """Update an existing security control."""
    control = Control.query.get(str(control_id))
    if not control:
        return jsonify({"error": "Control not found"}), 404
        
    data = request.get_json() or {}
    if 'title' in data:
        control.title = data['title']
    if 'description' in data:
        control.description = data['description']
    if 'applies_to_stride' in data:
        control.applies_to_stride = data['applies_to_stride']
    if 'applies_to_protocols' in data:
        control.applies_to_protocols = data['applies_to_protocols']
    if 'reduction_value' in data:
        control.reduction_value = int(data['reduction_value'])
    if 'reduction_target' in data:
        control.reduction_target = data['reduction_target']
    if 'source_ref' in data:
        control.source_ref = data['source_ref']
        
    db.session.commit()
    return jsonify({"message": "Control updated successfully", "control": {"id": str(control.id), "title": control.title}}), 200

@admin_bp.route('/library/controls/<uuid:control_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_control(control_id):
    """Delete a security control."""
    control = Control.query.get(str(control_id))
    if not control:
        return jsonify({"error": "Control not found"}), 404
    db.session.delete(control)
    db.session.commit()
    return jsonify({"message": "Control deleted successfully"}), 200