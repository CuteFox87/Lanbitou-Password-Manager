"""
server/app.py

the main Flask application
"""

from flask import Flask, g
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from sqlalchemy import text
from models import db
from auth import auth as auth_blueprint
from storage import storage as storage_blueprint
from get_passwords import get_passwords_bp
from permission_storage import permission_storage as permission_storage_blueprint
from groups import groups_bp 

app = Flask(__name__)

# 配置 CORS
CORS(app, 
     resources={r"/*": {"origins": ["http://localhost:3000", "https://localhost:3000"]}}, 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"])

# 數據庫配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///vault.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT配置
app.config['JWT_SECRET_KEY'] = 'your-secret-key'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 60 * 60 * 24  # 令牌有效期24小時

# 初始化插件
db.init_app(app)
jwt = JWTManager(app)

# 註冊藍圖
app.register_blueprint(auth_blueprint)
app.register_blueprint(storage_blueprint)
app.register_blueprint(get_passwords_bp)
app.register_blueprint(permission_storage_blueprint)
app.register_blueprint(groups_bp)

# 啟用 SQLite 外鍵約束（只在第一次請求時）
@app.before_request
def enable_sqlite_foreign_keys_once():
    if getattr(g, '_fk_checked', False):
        return
    g._fk_checked = True

    if db.engine.dialect.name == 'sqlite':
        with db.engine.connect() as connection:
            connection.execute(text("PRAGMA foreign_keys=ON"))

# 健康檢查路由
@app.route('/')
def health_check():
    return {"status": "ok", "message": "Lanbitou Password Manager API is running"}

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)

from flask import jsonify
@app.route("/debug/access")
def debug_access():
    from models import PasswordAccess
    result = []
    for a in PasswordAccess.query.all():
        result.append({
            "id": a.id,
            "user_id": a.user_id,
            "group_id": a.group_id,
            "password_id": a.password_id,
            "permission": a.permission.value
        })
    return jsonify(result)
