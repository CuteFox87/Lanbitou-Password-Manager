# server/permission_storage.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, UserPassword, PasswordAccess, GroupMembership, PermissionEnum, User, Group

permission_storage = Blueprint('permission_storage', __name__)

def get_user_permission(user_id, password_id):
    permission_order = {
        "READ": 1,
        "WRITE": 2,
        "DELETE": 3
    }
    highest_perm_found = None

    password_entry = UserPassword.query.get(password_id)
    if password_entry and password_entry.user_id == user_id:
        return PermissionEnum.DELETE

    direct_access = PasswordAccess.query.filter_by(
        user_id=user_id,
        password_id=password_id,
        group_id=None
    ).first()
    if direct_access:
        highest_perm_found = direct_access.permission

    group_memberships = GroupMembership.query.filter_by(user_id=user_id).all()
    group_ids = [gm.group_id for gm in group_memberships]
    membership_perms = {gm.group_id: gm.permission for gm in group_memberships}

    group_accesses = PasswordAccess.query.filter(
        PasswordAccess.group_id.in_(group_ids),
        PasswordAccess.password_id == password_id,
        PasswordAccess.user_id.is_(None)
    ).all()

    for entry in group_accesses:
        gm_perm = membership_perms.get(entry.group_id)
        if gm_perm:
            effective = min(
                [entry.permission, gm_perm],
                key=lambda p: permission_order[p.value]
            )
            if not highest_perm_found or permission_order[effective.value] > permission_order[highest_perm_found.value]:
                highest_perm_found = effective

    return highest_perm_found


@permission_storage.route('/api/storage/<int:password_id>', methods=['GET'])
@jwt_required()
def get_protected_password(password_id):
    user_id = int(get_jwt_identity())
    perm = get_user_permission(user_id, password_id)

    if not perm:
        return jsonify({"msg": "Access denied"}), 403

    password = UserPassword.query.get(password_id)
    if not password:
        return jsonify({"msg": "Password not found"}), 404

    return jsonify({
        'id': password.id,
        'site': password.site,
        'encrypted_data': password.encrypted_data,
        'iv': password.iv,
        'notes': password.notes,
        'owner_id': password.user_id
    })

@permission_storage.route('/api/storage/<int:password_id>', methods=['PUT'])
@jwt_required()
def update_protected_password(password_id):
    user_id = int(get_jwt_identity())
    perm = get_user_permission(user_id, password_id)

    if perm not in [PermissionEnum.WRITE, PermissionEnum.DELETE]:
        return jsonify({"msg": "Write permission required"}), 403

    data = request.get_json()
    password = UserPassword.query.get(password_id)
    if not password:
        return jsonify({"msg": "Password not found"}), 404

    password.site = data.get("site", password.site)
    password.encrypted_data = data.get("encrypted_data", password.encrypted_data)
    password.iv = data.get("iv", password.iv)
    password.notes = data.get("notes", password.notes)

    db.session.commit()
    return jsonify({"msg": "Password updated successfully"}), 200

@permission_storage.route('/api/storage/<int:password_id>', methods=['DELETE'])
@jwt_required()
def delete_protected_password(password_id):
    user_id = int(get_jwt_identity())
    perm = get_user_permission(user_id, password_id)

    if perm != PermissionEnum.DELETE:
        return jsonify({"msg": "Delete permission required"}), 403

    password = UserPassword.query.get(password_id)
    if not password:
        return jsonify({"msg": "Password not found"}), 404

    try:
        db.session.delete(password)
        db.session.commit()
        return jsonify({"msg": "Password deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Failed to delete password", "error": str(e)}), 500

@permission_storage.route('/permission/grant', methods=['POST'])
@jwt_required()
def grant_permission():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    password_id = data.get('password_id')
    target_user_id = data.get('user_id')
    target_group_id = data.get('group_id')
    permission_str = data.get('permission')

    if not password_id or not permission_str:
        return jsonify({"msg": "Missing password_id or permission"}), 400
    if not target_user_id and not target_group_id:
        return jsonify({"msg": "Missing target_user_id or target_group_id"}), 400
    if target_user_id and target_group_id:
        return jsonify({"msg": "Cannot grant to both user and group simultaneously"}), 400

    password = UserPassword.query.get(password_id)
    if not password or password.user_id != current_user_id:
        return jsonify({"msg": "You do not own this password or it does not exist"}), 403

    try:
        permission_enum = PermissionEnum(permission_str.upper())
    except ValueError:
        return jsonify({"msg": "Invalid permission type"}), 400

    existing_access = None
    if target_user_id:
        existing_access = PasswordAccess.query.filter_by(
            password_id=password_id, user_id=target_user_id, group_id=None
        ).first()
    elif target_group_id:
        existing_access = PasswordAccess.query.filter_by(
            password_id=password_id, group_id=target_group_id, user_id=None
        ).first()

    if existing_access:
        return jsonify({"msg": "Permission already exists for this target. Use PATCH /permission/update to change it."}), 409

    new_access = PasswordAccess(
    password_id=password_id,
    user_id=target_user_id if target_user_id else None,
    group_id=target_group_id if target_group_id else None,
    permission=permission_enum
)

    db.session.add(new_access)
    db.session.commit()
    return jsonify({"msg": "Permission granted successfully", "access_id": new_access.id}), 201

@permission_storage.route('/permission/revoke', methods=['DELETE'])
@jwt_required()
def revoke_permission():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    password_id = data.get('password_id')
    target_user_id = data.get('user_id')
    target_group_id = data.get('group_id')

    if not password_id:
        return jsonify({"msg": "Missing password_id"}), 400
    if not target_user_id and not target_group_id:
        return jsonify({"msg": "Missing target_user_id or target_group_id"}), 400
    if target_user_id and target_group_id:
        return jsonify({"msg": "Cannot revoke from both user and group simultaneously"}), 400

    password = UserPassword.query.get(password_id)
    if not password or password.user_id != current_user_id:
        return jsonify({"msg": "You do not own this password or it does not exist"}), 403

    access_to_revoke = None
    if target_user_id:
        access_to_revoke = PasswordAccess.query.filter_by(
            password_id=password_id, user_id=target_user_id, group_id=None
        ).first()
    elif target_group_id:
        access_to_revoke = PasswordAccess.query.filter_by(
            password_id=password_id, group_id=target_group_id, user_id=None
        ).first()

    if not access_to_revoke:
        return jsonify({"msg": "Permission not found"}), 404

    db.session.delete(access_to_revoke)
    db.session.commit()
    return jsonify({"msg": "Permission revoked successfully"}), 200

@permission_storage.route('/permission/password/<int:password_id>', methods=['GET'])
@jwt_required()
def get_password_permissions(password_id):
    current_user_id = int(get_jwt_identity())

    password = UserPassword.query.get(password_id)
    if not password or password.user_id != current_user_id:
        return jsonify({"msg": "You do not own this password or it does not exist"}), 403

    access_entries = PasswordAccess.query.filter_by(password_id=password_id).all()
    permissions_list = []
    for entry in access_entries:
        entry_data = {
            "id": entry.id,
            "password_id": entry.password_id,
            "permission": entry.permission.value
        }
        if entry.user_id:
            user = User.query.get(entry.user_id)
            entry_data["target_type"] = "user"
            entry_data["target_id"] = entry.user_id
            entry_data["target_email"] = user.email if user else "Unknown User"
        elif entry.group_id:
            group = Group.query.get(entry.group_id)
            entry_data["target_type"] = "group"
            entry_data["target_id"] = entry.group_id
            entry_data["target_name"] = group.name if group else "Unknown Group"
        permissions_list.append(entry_data)

    return jsonify(permissions_list), 200

@permission_storage.route('/permission/update/<int:access_id>', methods=['PATCH'])
@jwt_required()
def update_permission(access_id):
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    new_permission_str = data.get('permission')

    if not new_permission_str:
        return jsonify({"msg": "New permission is required"}), 400

    access_entry = PasswordAccess.query.get(access_id)
    if not access_entry:
        return jsonify({"msg": "Permission entry not found"}), 404

    password = UserPassword.query.get(access_entry.password_id)
    if not password or password.user_id != current_user_id:
        return jsonify({"msg": "You do not own the password associated with this permission"}), 403

    try:
        new_permission_enum = PermissionEnum(new_permission_str.upper())
    except ValueError:
        return jsonify({"msg": "Invalid permission type"}), 400

    access_entry.permission = new_permission_enum
    db.session.commit()
    return jsonify({"msg": "Permission updated successfully", "new_permission": new_permission_enum.value}), 200
