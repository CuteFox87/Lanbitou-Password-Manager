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

    current_user = int(get_jwt_identity())

    # Extract data from request
    site = data.get('site')
    account = data.get('account')
    password = data.get('password')
    
    if not site:
        return jsonify({"msg": f"{'site' if not site else ''} are required"}), 400
    
    new_entry = UserPassword(user_id=current_user, site=site, account_hash=account, password_hash=password)
    db.session.add(new_entry)
    db.session.commit()

    return jsonify({"msg": "Password stored successfully"}), 201

    
