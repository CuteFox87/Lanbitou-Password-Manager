import requests

BASE_URL = "http://127.0.0.1:5000"

# Sample user credentials
email = "testuser@example.com"
password = "MySecurePassword123"

def test_register():
    url = f"{BASE_URL}/register"
    payload = {
        "email": email,
        "password": password
    }
    response = requests.post(url, json=payload)
    print("\n----------\n")
    print("Register response:\n", response.status_code, response.json())

def test_login():
    url = f"{BASE_URL}/login"
    payload = {
        "email": email,
        "password": password
    }
    response = requests.post(url, json=payload)
    print("\n----------\n")
    print("Login response:\n", response.status_code, response.json())
    
    print("\n----------\n")
    if response.status_code == 200:
        token = response.json()["token"]
        print("JWT Token:", token)
        return token
    else:
        print("Login failed")
        return None

if __name__ == "__main__":
    test_register()
    jwt_token = test_login()
