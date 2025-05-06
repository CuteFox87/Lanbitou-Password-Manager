from flask import Flask
from flask_jwt_extended import JWTManager
from models import db
from auth import auth as auth_blueprint

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///vault.db'
app.config['JWT_SECRET_KEY'] = 'your-secret-key'
db.init_app(app)
jwt = JWTManager(app)

app.register_blueprint(auth_blueprint)
