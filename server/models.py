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

class UserPassword(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    site = db.Column(db.String(120), nullable=False)
    # i think account and password can be nullable
    account_hash = db.Column(db.String(256), nullable=True)
    password_hash = db.Column(db.String(256), nullable=True)
    user = db.relationship('User', backref=db.backref('passwords', lazy=True))