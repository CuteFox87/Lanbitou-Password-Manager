from flask_sqlalchemy import SQLAlchemy
import enum
from datetime import datetime

db = SQLAlchemy()

class PermissionEnum(enum.Enum):
    READ = "READ"
    WRITE = "WRITE"
    DELETE = "DELETE"

# User table
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    data_salt = db.Column(db.String(64), nullable=True)
    login_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Password entries
class UserPassword(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    site = db.Column(db.String(120), nullable=False)
    encrypted_data = db.Column(db.Text, nullable=False)  # JSON string with encrypted username/password
    iv = db.Column(db.String(24), nullable=False)  # AES-GCM IV
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('passwords', lazy=True))
    accessors = db.relationship(
        'PasswordAccess',
        backref='password',
        cascade='all, delete-orphan',
        passive_deletes=True
    )

# Group table
class Group(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.String(256), nullable=True)
    manager_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    members = db.relationship('User', secondary='group_membership', backref='groups')

# Group membership with permissions
class GroupMembership(db.Model):
    __tablename__ = 'group_membership'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=False, index=True)
    permission = db.Column(db.Enum(PermissionEnum), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'group_id', name='_user_group_uc'),
    )

# Password access control: per user or group
class PasswordAccess(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True, index=True)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=True, index=True)
    password_id = db.Column(
        db.Integer,
        db.ForeignKey('user_password.id', ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    permission = db.Column(db.Enum(PermissionEnum), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='password_accesses')
    group = db.relationship('Group', backref='password_accesses')

    __table_args__ = (
        db.CheckConstraint(
            "user_id IS NOT NULL OR group_id IS NOT NULL",
            name="user_or_group_constraint"
        ),
        db.UniqueConstraint('user_id', 'group_id', 'password_id', name='_user_group_password_uc'),
    )
