import requests
import base64
import json
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes

BASE_URL = "http://127.0.0.1:5000"

# Sample user credentials
email = "test@example.com"
password = "testtest"
login_key = "sP+8fOkp05nZRuk1mAoOMO2WLpcZ+si0uF3Tex3QGdM="

def test_register():
    url = f"{BASE_URL}/register"
    payload = {
        "email": email,
        "login_key": password
    }
    response = requests.post(url, json=payload)
    print("\n---------- REGISTER ----------")
    print("Status Code:", response.status_code)
    print("Response:", response.json())

def test_login():
    url = f"{BASE_URL}/login"
    payload = {
        "email": email,
        "login_key": password
    }
    response = requests.post(url, json=payload)
    print("\n---------- LOGIN ----------")
    print("Status Code:", response.status_code)
    print("Response:", response.json())
    
    if response.status_code == 200:
        token = response.json()["token"]
        return token
    else:
        return None
    
def storage_passwords(jwt_token):
    url = f"{BASE_URL}/storage"
    headers = {
        "Authorization": f"Bearer {jwt_token}"
    }

    # 假設此為預設測試用 key（實際應從 server 的 salt 衍生）
    aes_key = b"1234567890abcdef1234567890abcdef"  # 32 bytes key

    encrypted_data, iv = encrypt_data("testuser@example.com", "mypassword123", aes_key)

    data = {
        "site": "example.com",
        "encrypted_data": encrypted_data,
        "iv": iv
    }

    response = requests.post(url, json=data, headers=headers)
    print("Store password response:", response.status_code, response.json())

def encrypt_data(account, password, key):
    # 封裝成 JSON 字串
    json_data = json.dumps({"account": account, "password": password}).encode()

    # 隨機生成 IV
    iv = get_random_bytes(12)

    # 使用 AES-GCM 進行加密
    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
    ciphertext, tag = cipher.encrypt_and_digest(json_data)

    # 將加密資料、tag 一起包裝成 base64 字串
    encrypted_payload = {
        "ciphertext": base64.b64encode(ciphertext).decode(),
        "tag": base64.b64encode(tag).decode()
    }

    return base64.b64encode(json.dumps(encrypted_payload).encode()).decode(), base64.b64encode(iv).decode()

def test_get_passwords(jwt_token):
    url = f"{BASE_URL}/passwords"
    headers = {
        "Authorization": f"Bearer {jwt_token}"
    }
    response = requests.get(url, headers=headers)
    print("\n---------- GET PASSWORDS ----------")
    print("Status Code:", response.status_code)
    try:
        print("Response:", response.json())
    except Exception as e:
        print("Failed to parse JSON:", response.text)

if __name__ == "__main__":
    test_register()
    jwt_token = test_login()
    if jwt_token:
        storage_passwords(jwt_token)
        test_get_passwords(jwt_token)
