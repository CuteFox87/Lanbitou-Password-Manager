"""
server/app.py

the main Flask application
"""

from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS  # 導入 CORS
from models import db
from auth import auth as auth_blueprint
from storage import storage as storage_blueprint
from get_passwords import get_passwords_bp

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

# 添加簡單的根路由用於健康檢查
@app.route('/')
def health_check():
    return {"status": "ok", "message": "Lanbitou Password Manager API is running"}

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)