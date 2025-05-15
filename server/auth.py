"""
server/auth.py

authentication and registration routes
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from models import db, User
import os
import secrets
import base64

auth = Blueprint('auth', __name__)
ph = PasswordHasher()

# POST /register
@auth.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data:
        return jsonify({"msg": "無法解析請求數據"}), 400
        
    email = data.get('email')
    login_key = data.get('login_key')  # 從PBKDF2推導的登入金鑰
    
    if not email or not login_key:
        return jsonify({"msg": "需要電子郵件和登入金鑰"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "用戶已存在"}), 400

    try:
        # 使用Argon2雜湊登入金鑰
        hashed_login_key = ph.hash(login_key)
        
        # 生成數據鹽值用於E2EE加密 (32字節)
        data_salt = secrets.token_bytes(32)
        data_salt_b64 = base64.b64encode(data_salt).decode('utf-8')
        
        # 創建新用戶
        new_user = User(
            email=email, 
            password_hash=hashed_login_key,
            data_salt=data_salt_b64
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # 返回成功訊息與數據鹽值
        return jsonify({
            "msg": "用戶註冊成功",
            "data_salt": data_salt_b64
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "創建用戶時出錯", "error": str(e)}), 500

# POST /login
@auth.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data:
        return jsonify({"msg": "無法解析請求數據"}), 400
        
    email = data.get('email')
    login_key = data.get('login_key')  # 從PBKDF2推導的登入金鑰
    
    if not email or not login_key:
        return jsonify({"msg": "需要電子郵件和登入金鑰"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "無效的憑證"}), 401
    
    try:
        # 使用Argon2驗證提交的登入金鑰
        ph.verify(user.password_hash, login_key)
        
        # 創建JWT令牌
        token = create_access_token(identity=str(user.id))
        
        # 檢查是否是首次登入
        is_first_login = user.login_count == 0
        
        # 更新登入計數
        user.login_count += 1
        db.session.commit()
        
        # 返回令牌、用戶ID、數據鹽值和是否首次登入
        return jsonify({
            "token": token, 
            "user_id": user.id,
            "data_salt": user.data_salt,
            "is_first_login": is_first_login
        }), 200
        
    except VerifyMismatchError:
        return jsonify({"msg": "無效的憑證"}), 401
    except Exception as e:
        return jsonify({"msg": "登入失敗", "error": str(e)}), 500
