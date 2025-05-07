"""
server/auth.py

authentication and registration routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from models import db, User

auth = Blueprint('auth', __name__)
ph = PasswordHasher()

# POST /register
@auth.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')  # plaintext from client

    if not email or not password:
        return jsonify({"msg": "Email and password required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "User already exists"}), 400

    try:
        hashed = ph.hash(password)
        new_user = User(email=email, password_hash=hashed)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"msg": "User registered successfully"}), 201
    except Exception as e:
        return jsonify({"msg": "Error creating user", "error": str(e)}), 500

# POST /login
@auth.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')  # plaintext from client

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "Invalid credentials"}), 401

    try:
        ph.verify(user.password_hash, password)
        token = create_access_token(identity=str(user.id))
        return jsonify({"token": token, "user_id": user.id}), 200
    except VerifyMismatchError:
        return jsonify({"msg": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"msg": "Login failed", "error": str(e)}), 500
