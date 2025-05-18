"""
server/storage.py

storage routes for storing and retrieving passwords
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from models import db, UserPassword

storage = Blueprint('storage', __name__)
ph = PasswordHasher()

# POST /storage
@storage.route('/storage', methods=['POST'])
@jwt_required()
def store_password():
    data = request.get_json()

    current_user_id = int(get_jwt_identity())

    # Extract data from request
    site = data.get('site')
    encrypted_data = data.get('encrypted_data')
    iv = data.get('iv')
    
    if not site or not encrypted_data or not iv:
        return jsonify({"msg": f"{'site' if not site else ''} are required"}), 400
    
    new_entry = UserPassword(
        user_id=current_user_id,
        site=site,
        encrypted_data=encrypted_data,
        iv=iv
    )

    db.session.add(new_entry)
    db.session.commit()

    return jsonify({"msg": "Password stored successfully"}), 201

# PUT /storage/<password_id>
@storage.route('/storage/<int:password_id>', methods=['PUT'])
@jwt_required()
def update_password(password_id):
    data = request.get_json()
    current_user_id = int(get_jwt_identity())
    
    # 尋找目標密碼
    password_entry = UserPassword.query.filter_by(id=password_id).first()
    
    if not password_entry:
        return jsonify({"msg": "Password not found"}), 404
    
    # 檢查權限：只能更新自己的密碼
    if password_entry.user_id != current_user_id:
        return jsonify({"msg": "You don't have permission to update this password"}), 403
    
    # 提取請求資料
    site = data.get('site')
    encrypted_data = data.get('encrypted_data')
    iv = data.get('iv')
    
    if not site or not encrypted_data or not iv:
        return jsonify({"msg": "Missing required fields"}), 400
    
    # 更新密碼資料
    password_entry.site = site
    password_entry.encrypted_data = encrypted_data
    password_entry.iv = iv
    
    db.session.commit()
    
    return jsonify({"msg": "Password updated successfully"}), 200

# DELETE /storage/<password_id>
@storage.route('/storage/<int:password_id>', methods=['DELETE'])
@jwt_required()
def delete_password(password_id):
    current_user_id = int(get_jwt_identity())
    
    # 尋找目標密碼
    password_entry = UserPassword.query.filter_by(id=password_id).first()
    
    if not password_entry:
        return jsonify({"msg": "Password not found"}), 404
    
    # 檢查權限：只能刪除自己的密碼
    if password_entry.user_id != current_user_id:
        return jsonify({"msg": "You don't have permission to delete this password"}), 403
    
    # 刪除密碼
    db.session.delete(password_entry)
    db.session.commit()
    
    return jsonify({"msg": "Password deleted successfully"}), 200
    
