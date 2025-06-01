# server/groups.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Group, GroupMembership, PermissionEnum, User

groups_bp = Blueprint('groups', __name__)

# POST /groups - Create a new group
@groups_bp.route('/groups', methods=['POST'])
@jwt_required()
def create_group_route():
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({"msg": "Group name is required"}), 400

    manager_id = int(get_jwt_identity())
    new_group = Group(name=data['name'], description=data.get('description'), manager_id=manager_id)
    db.session.add(new_group)
    db.session.commit()
    return jsonify({"msg": "Group created successfully", "group_id": new_group.id}), 201

# GET /groups - Get all groups managed by the current user
@groups_bp.route('/groups', methods=['GET'])
@jwt_required()
def get_user_managed_groups():
    current_user_id = int(get_jwt_identity())
    groups = Group.query.filter_by(manager_id=current_user_id).all()
    return jsonify([
        {"id": g.id, "name": g.name, "description": g.description, "manager_id": g.manager_id}
        for g in groups
    ]), 200

# GET /groups/<int:group_id> - Get details of a specific group
@groups_bp.route('/groups/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group_details(group_id):
    current_user_id = int(get_jwt_identity())
    group = Group.query.get(group_id)

    if not group:
        return jsonify({"msg": "Group not found"}), 404

    # Ensure current user is manager or a member of the group to view details
    is_member = GroupMembership.query.filter_by(group_id=group_id, user_id=current_user_id).first()
    if group.manager_id != current_user_id and not is_member:
        return jsonify({"msg": "Unauthorized access to group details"}), 403

    memberships = GroupMembership.query.filter_by(group_id=group_id).all()
    members_data = []
    for member_ship in memberships:
        member_user = User.query.get(member_ship.user_id)
        if member_user:
            members_data.append({
                "membership_id": member_ship.id,
                "user_id": member_user.id,
                "email": member_user.email,
                "permission": member_ship.permission.value
            })

    return jsonify({
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "manager_id": group.manager_id,
        "members": members_data
    }), 200

# PUT /groups/<int:group_id> - Update group details
@groups_bp.route('/groups/<int:group_id>', methods=['PUT'])
@jwt_required()
def update_group_route(group_id):
    data = request.get_json()
    current_user_id = int(get_jwt_identity())
    group = Group.query.get(group_id)

    if not group:
        return jsonify({"msg": "Group not found"}), 404
    if group.manager_id != current_user_id:
        return jsonify({"msg": "You are not the manager of this group"}), 403

    group.name = data.get('name', group.name)
    group.description = data.get('description', group.description)
    db.session.commit()
    return jsonify({"msg": "Group updated successfully"}), 200

# DELETE /groups/<int:group_id> - Delete a group
@groups_bp.route('/groups/<int:group_id>', methods=['DELETE'])
@jwt_required()
def delete_group_route(group_id):
    current_user_id = int(get_jwt_identity())
    group = Group.query.get(group_id)

    if not group:
        return jsonify({"msg": "Group not found"}), 404
    if group.manager_id != current_user_id:
        return jsonify({"msg": "You are not the manager of this group"}), 403

    # Delete associated group memberships first
    GroupMembership.query.filter_by(group_id=group_id).delete()
    # Delete associated password accesses (if any were granted via this group)
    # This might require a more sophisticated cascade or manual cleanup if PasswordAccess points to group_id
    # For now, rely on cascade delete if defined in models, or add explicit deletion if not.
    # Assuming `ondelete='CASCADE'` on group_id in PasswordAccess for simplicity here.
    db.session.delete(group)
    db.session.commit()
    return jsonify({"msg": "Group deleted successfully"}), 200

# POST /groups/<int:group_id>/members - Add a user to a group
@groups_bp.route('/groups/<int:group_id>/members', methods=['POST'])
@jwt_required()
def add_group_member(group_id):
    current_user_id = int(get_jwt_identity())
    group = Group.query.get(group_id)

    if not group:
        return jsonify({"msg": "Group not found"}), 404
    if group.manager_id != current_user_id:
        return jsonify({"msg": "You are not the manager of this group"}), 403

    data = request.get_json()
    user_id_to_add = data.get('user_id')
    permission_str = data.get('permission', 'read') # Default to read

    if not user_id_to_add:
        return jsonify({"msg": "User ID is required"}), 400

    user_to_add = User.query.get(user_id_to_add)
    if not user_to_add:
        return jsonify({"msg": "User not found"}), 404

    existing_membership = GroupMembership.query.filter_by(
        user_id=user_id_to_add, group_id=group_id
    ).first()
    if existing_membership:
        return jsonify({"msg": "User is already a member of this group"}), 409

    try:
        permission = PermissionEnum(permission_str.upper()) # Convert to uppercase for enum
    except ValueError:
        return jsonify({"msg": "Invalid permission type"}), 400

    new_member = GroupMembership(user_id=user_id_to_add, group_id=group_id, permission=permission)
    db.session.add(new_member)
    db.session.commit()
    return jsonify({"msg": "User added to group"}), 201

# PUT/PATCH /groups/<int:group_id>/members/<int:user_id> - Update user's group permission
@groups_bp.route('/groups/<int:group_id>/members/<int:user_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_group_member_permission(group_id, user_id):
    current_user_id = int(get_jwt_identity())
    group = Group.query.get(group_id)

    if not group:
        return jsonify({"msg": "Group not found"}), 404
    if group.manager_id != current_user_id:
        return jsonify({"msg": "You are not the manager of this group"}), 403

    membership = GroupMembership.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not membership:
        return jsonify({"msg": "User not found in this group"}), 404

    data = request.get_json()
    new_permission_str = data.get('permission')
    if not new_permission_str:
        return jsonify({"msg": "New permission is required"}), 400

    try:
        new_permission = PermissionEnum(new_permission_str.upper())
    except ValueError:
        return jsonify({"msg": "Invalid permission type"}), 400

    membership.permission = new_permission
    db.session.commit()
    return jsonify({"msg": "Group member permission updated successfully"}), 200


# DELETE /groups/<int:group_id>/members/<int:user_id> - Remove a user from a group
@groups_bp.route('/groups/<int:group_id>/members/<int:user_id>', methods=['DELETE'])
@jwt_required()
def remove_group_member(group_id, user_id):
    current_user_id = int(get_jwt_identity())
    group = Group.query.get(group_id)

    if not group:
        return jsonify({"msg": "Group not found"}), 404
    if group.manager_id != current_user_id:
        return jsonify({"msg": "You are not the manager of this group"}), 403

    membership = GroupMembership.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not membership:
        return jsonify({"msg": "User not found in this group"}), 404

    db.session.delete(membership)
    db.session.commit()
    return jsonify({"msg": "User removed from group"}), 200