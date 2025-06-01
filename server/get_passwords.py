from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, UserPassword, PasswordAccess, GroupMembership

get_passwords_bp = Blueprint('get_passwords', __name__)

@get_passwords_bp.route('/passwords', methods=['GET'])
@jwt_required()
def get_passwords():
    user_id = int(get_jwt_identity())

    # 1. 使用者自己建立的密碼
    own_passwords = UserPassword.query.filter_by(user_id=user_id).all()

    # 2. 透過 PasswordAccess 授權的密碼（直接授權）
    direct_access_passwords = UserPassword.query.join(PasswordAccess).filter(
        PasswordAccess.user_id == user_id,
        PasswordAccess.group_id == None
    ).all()

    # 3. 透過群組授權
    group_ids = db.session.query(GroupMembership.group_id).filter_by(user_id=user_id).all()
    group_ids = [gid[0] for gid in group_ids]

    group_access_passwords = []
    if group_ids:
        group_access_passwords = UserPassword.query.join(PasswordAccess).filter(
            PasswordAccess.group_id.in_(group_ids),
            PasswordAccess.user_id == None
        ).all()

    # 4. 合併並去除重複
    seen = {}
    for p in own_passwords + direct_access_passwords + group_access_passwords:
        seen[p.id] = p

    # 5. 序列化
    def serialize(p):
        return {
            "id": p.id,
            "site": p.site,
            "encrypted_data": p.encrypted_data,
            "iv": p.iv,
            "owner_id": p.user_id
        }

    return jsonify([serialize(p) for p in seen.values()])
