"""
server/models.py

Models for the Flask application.
This includes the User and UserPassword models.
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    data_salt = db.Column(db.String(64), nullable=True)  # 用於客戶端E2EE加密的鹽值
    login_count = db.Column(db.Integer, default=0)  # 登入次數，用於判斷是否首次登入

class UserPassword(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    site = db.Column(db.String(120), nullable=False)
    # 加密後的帳號和密碼
    encrypted_data = db.Column(db.Text, nullable=False)  # 整合帳號和密碼的加密JSON數據
    iv = db.Column(db.String(24), nullable=False)  # AES-GCM 初始向量
    # 移除原先的欄位，改用整合加密欄位
    # account_hash = db.Column(db.String(256), nullable=True)
    # password_hash = db.Column(db.String(256), nullable=True)
    user = db.relationship('User', backref=db.backref('passwords', lazy=True))

class PasswordAccess(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=True)
    password_id = db.Column(db.Integer, db.ForeignKey('user_password.id'), nullable=False)
    permission = db.Column(db.String(10), nullable=False)  # 'read' or 'write'

    # 關聯
    user = db.relationship('User', backref='password_accesses')
    group = db.relationship('Group', backref='password_accesses')
    password = db.relationship('UserPassword', backref='accessors')


class Group(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.String(256))
    manager_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    manager = db.relationship('User', backref='managed_groups')
