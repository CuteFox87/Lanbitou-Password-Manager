import requests
import json
import base64
import os
from dotenv import load_dotenv

# Load environment variables (optional, but good practice for secrets)
load_dotenv()

# --- Configuration ---
BASE_URL = "http://localhost:5000"

# --- Test Data ---
TEST_EMAIL = "test_user@example.com"
TEST_LOGIN_KEY = "supersecureloginpassword"
TEST_SITE = "example.com"
TEST_USERNAME = "myusername"
TEST_PASSWORD = "mypassword123"
TEST_NOTES = "Some important notes."

TEST_EMAIL_2 = "test_user2@example.com"
TEST_LOGIN_KEY_2 = "anothersecurelogin"

TEST_GROUP_NAME = "Dev Team"
TEST_GROUP_DESCRIPTION = "Passwords for the development team"

# --- Global Variables to store state between tests ---
# These variables will hold data needed across different test steps
global_jwt_token = None
global_user_id = None
global_data_salt = None
global_password_id = None
global_jwt_token_user2 = None
global_user_id_2 = None
global_group_id = None
global_access_id = None # Used for PATCH /permission/update


# --- Helper Functions ---

def print_test_status(test_name, success, message=""):
    """Prints test status with color coding."""
    status = "SUCCESS" if success else "FAILED"
    color_start = "\033[92m" if success else "\033[91m"  # Green for success, Red for failure
    color_end = "\033[0m"
    print(f"{color_start}[{status}]{color_end} {test_name}: {message}")

def run_test(test_function, *args, **kwargs):
    """Executes a test function and handles basic exceptions."""
    try:
        test_function(*args, **kwargs)
    except AssertionError as e:
        print_test_status(test_function.__name__, False, f"Assertion failed: {e}")
    except requests.exceptions.RequestException as e:
        print_test_status(test_function.__name__, False, f"Request failed: {e}")
    except Exception as e:
        print_test_status(test_function.__name__, False, f"An unexpected error occurred: {e}")

def simulate_client_encryption(username, password, iv, notes):
    """
    A simplified simulation of client-side encryption.
    In a real application, this would use a robust cryptographic library
    to encrypt sensitive data with a derived key.
    For testing, we'll just base64 encode a JSON string.
    """
    data_to_encrypt = json.dumps({
        "username": username,
        "password": password,
        "notes": notes
    })
    encrypted_bytes = base64.b64encode(data_to_encrypt.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')


# --- Test Functions ---

def test_health_check():
    print("\n--- Running Test: Health Check ---")
    response = requests.get(f"{BASE_URL}/")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data.get("status") == "ok", "Status should be 'ok'"
    print_test_status("Health Check", True, data.get("message"))

def test_user_registration():
    global global_data_salt
    print("\n--- Running Test: User Registration ---")
    payload = {
        "email": TEST_EMAIL,
        "login_key": TEST_LOGIN_KEY
    }
    response = requests.post(f"{BASE_URL}/register", json=payload)
    assert response.status_code == 201, f"Expected 201, got {response.status_code} - {response.json()}"
    data = response.json()
    assert "data_salt" in data, "data_salt should be returned"
    assert data.get("msg") == "用戶註冊成功", "Registration message incorrect"
    global_data_salt = data["data_salt"]
    print_test_status("User Registration", True, f"User '{TEST_EMAIL}' registered. Data Salt: {global_data_salt[:10]}...")

def test_user_registration_duplicate():
    print("\n--- Running Test: Duplicate User Registration ---")
    payload = {
        "email": TEST_EMAIL,
        "login_key": TEST_LOGIN_KEY
    }
    response = requests.post(f"{BASE_URL}/register", json=payload)
    assert response.status_code == 400, f"Expected 400, got {response.status_code} - {response.json()}"
    data = response.json()
    assert data.get("msg") == "用戶已存在", "Duplicate user message incorrect"
    print_test_status("Duplicate User Registration", True, "Attempted duplicate registration as expected.")

def test_user_login():
    global global_jwt_token, global_user_id
    print("\n--- Running Test: User Login ---")
    payload = {
        "email": TEST_EMAIL,
        "login_key": TEST_LOGIN_KEY
    }
    response = requests.post(f"{BASE_URL}/login", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    data = response.json()
    assert "token" in data, "Token not found"
    assert "user_id" in data, "User ID not found"
    assert "data_salt" in data, "Data salt not found"
    assert data.get("is_first_login") is True, "Should be first login"
    global_jwt_token = data["token"]
    global_user_id = data["user_id"]
    print_test_status("User Login", True, f"User '{TEST_EMAIL}' logged in. User ID: {global_user_id}")

def test_user_login_second_time():
    print("\n--- Running Test: User Login (Second Time) ---")
    payload = {
        "email": TEST_EMAIL,
        "login_key": TEST_LOGIN_KEY
    }
    response = requests.post(f"{BASE_URL}/login", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    data = response.json()
    assert data.get("is_first_login") is False, "Should NOT be first login"
    print_test_status("User Login (Second Time)", True, "Login count updated correctly.")

def test_store_password():
    global global_password_id
    print("\n--- Running Test: Store Password ---")
    assert global_jwt_token is not None, "JWT token not available for password storage"

    encrypted_data_simulated = simulate_client_encryption(
        TEST_USERNAME, TEST_PASSWORD, "random_iv_sim", TEST_NOTES
    )

    payload = {
        "site": TEST_SITE,
        "encrypted_data": encrypted_data_simulated,
        "iv": "random_iv_sim",
        "notes": TEST_NOTES
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    response = requests.post(f"{BASE_URL}/storage", json=payload, headers=headers)
    assert response.status_code == 201, f"Expected 201, got {response.status_code} - {response.json()}"
    data = response.json()
    assert data.get("msg") == "Password stored successfully", "Password storage message incorrect"
    assert "password_id" in data, "Password ID not returned"
    global_password_id = data["password_id"]
    print_test_status("Store Password", True, f"Password for '{TEST_SITE}' stored. ID: {global_password_id}")

def test_get_passwords():
    print("\n--- Running Test: Get Passwords ---")
    assert global_jwt_token is not None, "JWT token not available for fetching passwords"
    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    response = requests.get(f"{BASE_URL}/passwords", headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    passwords = response.json()
    assert isinstance(passwords, list), "Response should be a list"
    assert len(passwords) > 0, "Should have at least one password entry"
    found_password = next((p for p in passwords if p.get("id") == global_password_id), None)
    assert found_password is not None, "Stored password not found in retrieved list"
    assert found_password.get("site") == TEST_SITE, "Site mismatch"
    assert found_password.get("owner_id") == global_user_id, "Owner ID mismatch"
    print_test_status("Get Passwords", True, f"Retrieved {len(passwords)} password(s).")

def test_update_password():
    print("\n--- Running Test: Update Password ---")
    assert global_jwt_token is not None, "JWT token not available for updating password"
    assert global_password_id is not None, "Password ID not available for update"

    updated_site = "updated.example.com"
    updated_notes = "Updated notes here."
    updated_encrypted_data = simulate_client_encryption("newuser", "newpass", "new_iv", updated_notes)
    updated_iv = "new_iv"

    payload = {
        "site": updated_site,
        "encrypted_data": updated_encrypted_data,
        "iv": updated_iv,
        "notes": updated_notes
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    response = requests.put(f"{BASE_URL}/storage/{global_password_id}", json=payload, headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    data = response.json()
    assert data.get("msg") == "Password updated successfully", "Password update message incorrect"
    print_test_status("Update Password", True, f"Password ID {global_password_id} updated.")

    # Verify update by fetching again
    response = requests.get(f"{BASE_URL}/passwords", headers=headers)
    assert response.status_code == 200
    passwords = response.json()
    found_password = next((p for p in passwords if p.get("id") == global_password_id), None)
    assert found_password is not None
    assert found_password.get("site") == updated_site
    print_test_status("Verify Updated Password", True, "Password details verified after update.")


def test_user_registration_2():
    global global_jwt_token_user2, global_user_id_2
    print("\n--- Running Test: User 2 Registration and Login ---")
    payload = {
        "email": TEST_EMAIL_2,
        "login_key": TEST_LOGIN_KEY_2
    }
    response = requests.post(f"{BASE_URL}/register", json=payload)
    assert response.status_code == 201, f"Expected 201, got {response.status_code} - {response.json()}"
    print_test_status("User 2 Registration", True, "User 2 registered.")

    response = requests.post(f"{BASE_URL}/login", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    data = response.json()
    global_jwt_token_user2 = data["token"]
    global_user_id_2 = data["user_id"]
    print_test_status("User 2 Login", True, f"User 2 logged in. User ID: {global_user_id_2}")

def test_unauthorized_password_update():
    print("\n--- Running Test: Unauthorized Password Update ---")
    assert global_jwt_token_user2 is not None, "User 2 token not available"
    assert global_password_id is not None, "Password ID not available"

    payload = {
        "site": "attempted.update.com",
        "encrypted_data": "some_data",
        "iv": "some_iv"
    }
    headers = {"Authorization": f"Bearer {global_jwt_token_user2}"}
    response = requests.put(f"{BASE_URL}/storage/{global_password_id}", json=payload, headers=headers)
    assert response.status_code == 403, f"Expected 403, got {response.status_code} - {response.json()}"
    data = response.json()
    assert data.get("msg") == "You don't have permission to update this password", "Unauthorized update message incorrect"
    print_test_status("Unauthorized Password Update", True, "Correctly denied unauthorized update.")

def test_unauthorized_password_delete():
    print("\n--- Running Test: Unauthorized Password Delete ---")
    assert global_jwt_token_user2 is not None, "User 2 token not available"
    assert global_password_id is not None, "Password ID not available"

    headers = {"Authorization": f"Bearer {global_jwt_token_user2}"}
    response = requests.delete(f"{BASE_URL}/storage/{global_password_id}", headers=headers)
    assert response.status_code == 403, f"Expected 403, got {response.status_code} - {response.json()}"
    data = response.json()
    assert data.get("msg") == "You don't have permission to delete this password", "Unauthorized delete message incorrect"
    print_test_status("Unauthorized Password Delete", True, "Correctly denied unauthorized delete.")


def test_grant_read_permission():
    print("\n--- Running Test: Grant Read Permission to User 2 ---")
    assert global_jwt_token is not None and global_password_id is not None and global_user_id_2 is not None

    payload = {
        "password_id": global_password_id,
        "user_id": global_user_id_2,
        "permission": "read"
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    response = requests.post(f"{BASE_URL}/permission/grant", json=payload, headers=headers)
    assert response.status_code == 201, f"Expected 201, got {response.status_code} - {response.json()}"
    data = response.json()
    assert data.get("msg") == "Permission granted successfully", "Grant permission message incorrect"
    print_test_status("Grant Read Permission", True, "User 2 granted read access.")

def test_user2_get_password_after_read_permission():
    print("\n--- Running Test: User 2 Get Password After Read Permission ---")
    assert global_jwt_token_user2 is not None

    headers = {"Authorization": f"Bearer {global_jwt_token_user2}"}
    response = requests.get(f"{BASE_URL}/passwords", headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    passwords = response.json()
    found_password = next((p for p in passwords if p.get("id") == global_password_id), None)
    assert found_password is not None, "User 2 should now see the shared password"
    assert found_password.get("site") == "updated.example.com", "Site should match the updated one"
    print_test_status("User 2 Get Password", True, "User 2 successfully retrieved shared password.")

def test_user2_try_update_with_read_permission():
    print("\n--- Running Test: User 2 Try Update with Read Permission ---")
    assert global_jwt_token_user2 is not None

    payload = {
        "site": "user2_attempt.com",
        "encrypted_data": "user2_data",
        "iv": "user2_iv"
    }
    headers = {"Authorization": f"Bearer {global_jwt_token_user2}"}
    response = requests.put(f"{BASE_URL}/storage/{global_password_id}", json=payload, headers=headers)
    assert response.status_code == 403, f"Expected 403, got {response.status_code} - {response.json()}"
    print_test_status("User 2 Try Update with Read Permission", True, "User 2 correctly denied update with only read permission.")


def test_revoke_read_permission():
    print("\n--- Running Test: Revoke Read Permission from User 2 ---")
    assert global_jwt_token is not None and global_password_id is not None and global_user_id_2 is not None

    payload = {
        "password_id": global_password_id,
        "user_id": global_user_id_2,
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    response = requests.delete(f"{BASE_URL}/permission/revoke", json=payload, headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    data = response.json()
    assert data.get("msg") == "Permission revoked successfully", "Revoke permission message incorrect"
    print_test_status("Revoke Read Permission", True, "User 2's read access revoked.")

def test_user2_get_password_after_revoke():
    print("\n--- Running Test: User 2 Get Password After Revoke ---")
    assert global_jwt_token_user2 is not None

    headers = {"Authorization": f"Bearer {global_jwt_token_user2}"}
    response = requests.get(f"{BASE_URL}/passwords", headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    passwords = response.json()
    found_password = next((p for p in passwords if p.get("id") == global_password_id), None)
    assert found_password is None, "User 2 should NOT see the shared password anymore"
    print_test_status("User 2 Get Password After Revoke", True, "User 2 correctly no longer sees shared password.")

def test_get_password_permissions():
    global global_access_id
    print("\n--- Running Test: Get Password Permissions ---")
    assert global_jwt_token is not None and global_password_id is not None and global_user_id_2 is not None

    payload = {
        "password_id": global_password_id,
        "user_id": global_user_id_2,
        "permission": "read"
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}

    # Clean up any stale permission
    requests.delete(f"{BASE_URL}/permission/revoke", json={
        "password_id": global_password_id,
        "user_id": global_user_id_2
    }, headers=headers)

    # Re-grant permission
    response = requests.post(f"{BASE_URL}/permission/grant", json=payload, headers=headers)
    assert response.status_code in [201, 409], f"Expected 201 or 409, got {response.status_code} - {response.json()}"

    # Now get permissions
    response = requests.get(f"{BASE_URL}/permission/password/{global_password_id}", headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    permissions = response.json()
    assert isinstance(permissions, list), "Permissions should be a list"
    assert len(permissions) > 0, "Should have at least one permission entry"
    read_perm = next((p for p in permissions if p.get("target_id") == global_user_id_2 and p.get("permission") == "READ"), None)
    assert read_perm is not None, "Read permission for User 2 not found"
    global_access_id = read_perm["id"]  # Store this for update test
    print_test_status("Get Password Permissions", True, f"Retrieved {len(permissions)} permission(s).")



def test_update_permission():
    print("\n--- Running Test: Update Permission (Read to Write) ---")
    assert global_jwt_token is not None and global_access_id is not None, "Missing access_id from previous test"

    payload = {
        "permission": "write"
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    response = requests.patch(f"{BASE_URL}/permission/update/{global_access_id}", json=payload, headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    data = response.json()
    assert data.get("msg") == "Permission updated successfully", "Update permission message incorrect"
    assert data.get("new_permission") == "WRITE", "New permission should be 'WRITE'"
    print_test_status("Update Permission", True, "Permission updated from read to write for User 2.")


def test_invalid_permission_update():
    print("\n--- Running Test: Invalid Permission Update ---")
    assert global_jwt_token is not None and global_access_id is not None, "Missing access_id for invalid update test"

    payload = {
        "permission": "fly"  # invalid enum
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    response = requests.patch(f"{BASE_URL}/permission/update/{global_access_id}", json=payload, headers=headers)
    assert response.status_code == 400, f"Expected 400, got {response.status_code} - {response.json()}"
    msg = response.json().get("msg", "").lower()
    assert "invalid permission" in msg, "Expected error about permission enum"
    print_test_status("Invalid Permission Update", True, "Properly rejected invalid permission type.")



def test_create_group():
    global global_group_id
    print("\n--- Running Test: Create Group ---")
    assert global_jwt_token is not None

    payload = {
        "name": TEST_GROUP_NAME,
        "description": TEST_GROUP_DESCRIPTION
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}

    # This test relies on you having a /groups POST endpoint.
    # If you haven't implemented it yet, this test will likely fail.
    # A simple implementation in a new `server/groups.py` blueprint could be:
    # from flask import Blueprint, request, jsonify
    # from flask_jwt_extended import jwt_required, get_jwt_identity
    # from models import db, Group
    # groups_bp = Blueprint('groups', __name__)
    # @groups_bp.route('/groups', methods=['POST'])
    # @jwt_required()
    # def create_group_route():
    #     data = request.get_json()
    #     if not data or 'name' not in data:
    #         return jsonify({"msg": "Group name is required"}), 400
    #     manager_id = int(get_jwt_identity())
    #     new_group = Group(name=data['name'], description=data.get('description'), manager_id=manager_id)
    #     db.session.add(new_group)
    #     db.session.commit()
    #     return jsonify({"msg": "Group created successfully", "group_id": new_group.id}), 201
    # Remember to register `groups_bp` in `app.py`.

    response = requests.post(f"{BASE_URL}/groups", json=payload, headers=headers)
    # Handle the case where the endpoint might not exist yet
    if response.status_code == 404:
        print_test_status("Create Group", False, "`/groups` endpoint not found. Please implement group management routes.")
        return # Skip subsequent group tests if this fails

    assert response.status_code == 201, f"Expected 201 for group creation, got {response.status_code} - {response.json()}"
    data = response.json()
    assert data.get("msg") == "Group created successfully", "Group creation message incorrect"
    global_group_id = data["group_id"]
    print_test_status("Create Group", True, f"Group '{TEST_GROUP_NAME}' created with ID: {global_group_id}")


def test_add_user_to_group():
    print("\n--- Running Test: Add User 2 to Group ---")
    assert global_jwt_token is not None and global_group_id is not None and global_user_id_2 is not None

    payload = {
        "user_id": global_user_id_2,
        "permission": "read"
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}

    # This test assumes a route like POST /groups/<group_id>/members exists.
    # A minimal example in server/groups.py:
    # @groups_bp.route('/groups/<int:group_id>/members', methods=['POST'])
    # @jwt_required()
    # def add_group_member(group_id):
    #     current_user_id = int(get_jwt_identity())
    #     group = Group.query.get(group_id)
    #     if not group or group.manager_id != current_user_id:
    #         return jsonify({"msg": "Group not found or you are not the manager"}), 403
    #     data = request.get_json()
    #     user_id = data.get('user_id')
    #     permission_str = data.get('permission', 'read')
    #     if not user_id:
    #         return jsonify({"msg": "User ID is required"}), 400
    #     try:
    #         permission = PermissionEnum(permission_str)
    #     except ValueError:
    #         return jsonify({"msg": "Invalid permission type"}), 400
    #     new_member = GroupMembership(user_id=user_id, group_id=group_id, permission=permission)
    #     db.session.add(new_member)
    #     db.session.commit()
    #     return jsonify({"msg": "User added to group"}), 201

    response = requests.post(f"{BASE_URL}/groups/{global_group_id}/members", json=payload, headers=headers)
    if response.status_code == 404:
        print_test_status("Add User to Group", False, "`/groups/<id>/members` endpoint not found. Please implement group member management routes.")
        return

    assert response.status_code == 201, f"Expected 201 for adding user to group, got {response.status_code} - {response.json()}"
    print_test_status("Add User to Group", True, f"User {TEST_EMAIL_2} added to group {TEST_GROUP_NAME}.")

def test_grant_group_access_to_password():
    print("\n--- Running Test: Grant Group Access to Password ---")
    assert global_jwt_token is not None and global_group_id is not None and global_password_id is not None

    payload = {
        "password_id": global_password_id,
        "group_id": global_group_id,
        "permission": "read"
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    response = requests.post(f"{BASE_URL}/permission/grant", json=payload, headers=headers)
    assert response.status_code == 201, f"Expected 201, got {response.status_code} - {response.json()}"
    print_test_status("Grant Group Access", True, f"Group '{TEST_GROUP_NAME}' granted read access to password {global_password_id}.")

def test_user2_get_password_via_group():
    print("\n--- Running Test: User 2 Get Password Via Group Access ---")
    assert global_jwt_token_user2 is not None

    # First, revoke direct access for user 2 to ensure group access is tested
    # This prevents the test from passing due to direct access if it was previously granted.
    payload = {
        "password_id": global_password_id,
        "user_id": global_user_id_2,
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    revoke_response = requests.delete(f"{BASE_URL}/permission/revoke", json=payload, headers=headers)
    # We don't strictly assert on revoke_response status here, as it might be 404 if direct access wasn't present.

    headers = {"Authorization": f"Bearer {global_jwt_token_user2}"}
    response = requests.get(f"{BASE_URL}/passwords", headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    passwords = response.json()
    found_password = next((p for p in passwords if p.get("id") == global_password_id), None)
    assert found_password is not None, "User 2 should see the shared password via group access"
    print_test_status("User 2 Get Password Via Group", True, "User 2 successfully retrieved shared password via group.")


def test_final_password_delete():
    print("\n--- Running Test: Final Password Delete ---")
    assert global_jwt_token is not None and global_password_id is not None

    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    response = requests.delete(f"{BASE_URL}/storage/{global_password_id}", headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    data = response.json()
    assert data.get("msg") == "Password deleted successfully", "Password delete message incorrect"
    print_test_status("Final Password Delete", True, f"Password ID {global_password_id} deleted.")

    # Verify it's gone
    response = requests.get(f"{BASE_URL}/passwords", headers=headers)
    assert response.status_code == 200
    passwords = response.json()
    found_password = next((p for p in passwords if p.get("id") == global_password_id), None)
    assert found_password is None, "Deleted password should no longer be retrieved"
    print_test_status("Verify Deleted Password", True, "Password successfully confirmed as deleted.")

def test_invalid_permission_grant_with_user_and_group():
    print("\n--- Running Test: Invalid Permission Grant with User and Group ---")
    assert global_jwt_token is not None
    assert global_password_id is not None
    assert global_user_id_2 is not None
    assert global_group_id is not None

    payload = {
        "password_id": global_password_id,
        "user_id": global_user_id_2,
        "group_id": global_group_id,
        "permission": "read"
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    response = requests.post(f"{BASE_URL}/permission/grant", json=payload, headers=headers)
    assert response.status_code == 400, f"Expected 400, got {response.status_code} - {response.json()}"
    assert response.json().get("msg") == "Cannot grant to both user and group simultaneously", "Expected validation message"
    print_test_status("Invalid Permission Grant", True, "Correctly blocked dual-target grant.")


def test_invalid_permission_update():
    print("\n--- Running Test: Invalid Permission Update ---")
    assert global_jwt_token is not None and global_access_id is not None

    payload = {
        "permission": "fly"  # invalid enum
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    response = requests.patch(f"{BASE_URL}/permission/update/{global_access_id}", json=payload, headers=headers)
    assert response.status_code == 400, f"Expected 400, got {response.status_code} - {response.json()}"
    assert "Invalid permission type" in response.json().get("msg", ""), "Expected error about permission enum"
    print_test_status("Invalid Permission Update", True, "Properly rejected invalid permission type.")


def test_revoke_nonexistent_permission():
    print("\n--- Running Test: Revoke Nonexistent Permission ---")
    assert global_jwt_token is not None and global_password_id is not None

    payload = {
        "password_id": global_password_id,
        "user_id": 999999  # unlikely to exist
    }
    headers = {"Authorization": f"Bearer {global_jwt_token}"}
    response = requests.delete(f"{BASE_URL}/permission/revoke", json=payload, headers=headers)
    assert response.status_code == 404, f"Expected 404, got {response.status_code} - {response.json()}"
    assert response.json().get("msg") == "Permission not found", "Expected 'Permission not found' message"
    print_test_status("Revoke Nonexistent Permission", True, "Correctly handled revoke of nonexistent access.")

def test_user2_update_password_after_write_permission():
    print("\n--- Running Test: User 2 Update Password After Write Permission ---")
    assert global_jwt_token_user2 is not None
    assert global_password_id is not None

    updated_site = "user2-updated-site.com"
    updated_notes = "Updated by user2 with write permission."
    updated_encrypted_data = simulate_client_encryption("user2edit", "editedpass", "user2iv", updated_notes)

    payload = {
        "site": updated_site,
        "encrypted_data": updated_encrypted_data,
        "iv": "user2iv",
        "notes": updated_notes
    }
    headers = {"Authorization": f"Bearer {global_jwt_token_user2}"}
    response = requests.put(f"{BASE_URL}/storage/{global_password_id}", json=payload, headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.json()}"
    data = response.json()
    assert data.get("msg") == "Password updated successfully", "Update message incorrect"
    print_test_status("User 2 Update Password After Write", True, f"User 2 updated password ID {global_password_id}")

    # Confirm the update worked
    response = requests.get(f"{BASE_URL}/passwords", headers=headers)
    passwords = response.json()
    found_password = next((p for p in passwords if p.get("id") == global_password_id), None)
    assert found_password is not None
    assert found_password.get("site") == updated_site
    print_test_status("User 2 Update Verification", True, "User 2 changes successfully reflected.")
    
# --- Run all tests ---
if __name__ == "__main__":
    print("Starting full API pipeline test against http://localhost:5000")
    print("----------------------------------------------------------")

    # IMPORTANT: Ensure your Flask app is running on localhost:5000 before running this script.

    run_test(test_health_check)
    run_test(test_user_registration)
    run_test(test_user_registration_duplicate)
    run_test(test_user_login)
    run_test(test_user_login_second_time)
    run_test(test_store_password)
    run_test(test_get_passwords)
    run_test(test_update_password)
    run_test(test_user_registration_2)
    run_test(test_unauthorized_password_update)
    run_test(test_unauthorized_password_delete)
    run_test(test_grant_read_permission)
    run_test(test_user2_get_password_after_read_permission)
    run_test(test_user2_try_update_with_read_permission)
    run_test(test_get_password_permissions)
    run_test(test_invalid_permission_update)  # 👈 移到 revoke 前
    run_test(test_update_permission)
    run_test(test_user2_update_password_after_write_permission)
    run_test(test_revoke_read_permission)
    run_test(test_user2_get_password_after_revoke)

    # Group-related tests
    run_test(test_create_group)
    run_test(test_add_user_to_group)
    run_test(test_grant_group_access_to_password)
    run_test(test_user2_get_password_via_group)

    # Edge cases
    run_test(test_invalid_permission_grant_with_user_and_group)
    run_test(test_revoke_nonexistent_permission)

    run_test(test_final_password_delete)


    print("\n----------------------------------------------------------")
    print("Full API pipeline test complete.")
    print("Remember to manually clear your vault.db or restart Flask if needed for fresh runs.")