# server/storage.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from models import db, UserPassword, PermissionEnum # Removed Group, GroupMembership, PasswordAccess as they are not directly used in this module's routes
# Import the centralized permission checker
from permission_storage import get_user_permission # <-- IMPORT THIS!

storage = Blueprint('storage', __name__)
ph = PasswordHasher()

# Remove the has_password_permission helper function here, it's now centralized in permission_storage.py

# POST /storage
@storage.route('/storage', methods=['POST'])
@jwt_required()
def store_password():
    data = request.get_json()
    current_user_id = int(get_jwt_identity())

    site = data.get('site')
    encrypted_data = data.get('encrypted_data')
    iv = data.get('iv')
    notes = data.get('notes')

    if not site or not encrypted_data or not iv:
        missing_fields = []
        if not site: missing_fields.append('site')
        if not encrypted_data: missing_fields.append('encrypted_data')
        if not iv: missing_fields.append('iv')
        return jsonify({"msg": f"Missing required fields: {', '.join(missing_fields)}"}), 400

    new_entry = UserPassword(
        user_id=current_user_id,
        site=site,
        encrypted_data=encrypted_data,
        iv=iv,
        notes=notes
    )

    db.session.add(new_entry)
    db.session.commit()

    return jsonify({"msg": "Password stored successfully", "password_id": new_entry.id}), 201

# PUT /storage/<password_id>
@storage.route('/storage/<int:password_id>', methods=['PUT'])
@jwt_required()
def update_password(password_id):
    data = request.get_json()
    current_user_id = int(get_jwt_identity())

    password_entry = UserPassword.query.get(password_id) # Use .get()
    if not password_entry:
        return jsonify({"msg": "Password not found"}), 404

    # Use the centralized permission function
    perm = get_user_permission(current_user_id, password_id)
    if perm not in [PermissionEnum.WRITE, PermissionEnum.DELETE]: # DELETE implies WRITE
        return jsonify({"msg": "You don't have permission to update this password"}), 403

    site = data.get('site')
    encrypted_data = data.get('encrypted_data')
    iv = data.get('iv')
    notes = data.get('notes')

    if not site or not encrypted_data or not iv:
        missing_fields = []
        if not site: missing_fields.append('site')
        if not encrypted_data: missing_fields.append('encrypted_data')
        if not iv: missing_fields.append('iv')
        return jsonify({"msg": f"Missing required fields: {', '.join(missing_fields)}"}), 400

    password_entry.site = site
    password_entry.encrypted_data = encrypted_data
    password_entry.iv = iv
    password_entry.notes = notes

    db.session.commit()
    return jsonify({"msg": "Password updated successfully"}), 200

# DELETE /storage/<password_id>
@storage.route('/storage/<int:password_id>', methods=['DELETE'])
@jwt_required()
def delete_password(password_id):
    current_user_id = int(get_jwt_identity())

    password_entry = UserPassword.query.get(password_id) # Use .get()
    if not password_entry:
        return jsonify({"msg": "Password not found"}), 404

    # Use the centralized permission function
    perm = get_user_permission(current_user_id, password_id)
    if perm != PermissionEnum.DELETE:
        return jsonify({"msg": "You don't have permission to delete this password"}), 403

    try:
        # Cascade delete is handled by PasswordAccess model, but explicit delete is fine too.
        # PasswordAccess.query.filter_by(password_id=password_id).delete() # This is now handled by permission_storage delete route
        db.session.delete(password_entry)
        db.session.commit()
        return jsonify({"msg": "Password deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Failed to delete password", "error": str(e)}), 500