import requests

# === Server config ===
BASE_URL = "http://127.0.0.1:5000"
LOGIN_URL = f"{BASE_URL}/login"
STORAGE_URL = f"{BASE_URL}/storage"

# === Step 1: Login and get JWT ===
def get_jwt_token():
    response = requests.post(LOGIN_URL, json={
        "email": "testuser@example.com",
        "password": "MySecurePassword123"
    })
    
    if response.status_code == 200:
        return response.json()["token"]
    else:
        print("Login failed:", response.text)
        return None

# === Step 2: Store a password with JWT ===
def test_store_password(token):
    headers = {
        "Authorization": f"Bearer {token}"
    }

    data = {
        "site": "example.com",
        "account": "testuser@example.com",
        "password": "mypassword123"
    }

    response = requests.post(STORAGE_URL, json=data, headers=headers)
    print("Store password response:", response.status_code, response.json())

# === Run test ===
if __name__ == "__main__":
    token = get_jwt_token()
    if token:
        test_store_password(token)
