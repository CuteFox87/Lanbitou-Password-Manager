from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, UserPassword, PasswordAccess, Group

get_passwords_bp = Blueprint('get_passwords', __name__)

@get_passwords_bp.route('/passwords', methods=['GET'])
@jwt_required()
def get_passwords():
    user_id = int(get_jwt_identity())

    # 找出使用者所屬群組 ID
    group_ids = db.session.query(Group.id).join(PasswordAccess).filter(
        PasswordAccess.user_id == user_id
    ).distinct().all()
    group_ids = [gid[0] for gid in group_ids]

    # 1. 自己建立的密碼
    own_passwords = UserPassword.query.filter_by(user_id=user_id).all()

    # 2. 透過 PasswordAccess 授權的密碼
    shared_passwords = UserPassword.query.join(PasswordAccess).filter(
        (PasswordAccess.user_id == user_id) |
        (PasswordAccess.group_id.in_(group_ids))
    ).all()

    # 3. 合併並去除重複
    all_passwords = {p.id: p for p in own_passwords + shared_passwords}
    
    # 4. 序列化
    def serialize(p):
        return {
            "id": p.id,
            "site": p.site,
            "encrypted_data": p.encrypted_data,
            "iv": p.iv,
            "owner_id": p.user_id
        }

    return jsonify([serialize(p) for p in all_passwords.values()])
