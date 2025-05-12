# Password Manager

## Structure
```
password-manager/
├── backend/ (Python Flask)
│   ├── instance
│   │   └── vault.db
│   ├── app.py
│   ├── models.py
│   ├── auth.py
│   ├── vault.py
│   ├── init_db.py
│   └── requirements.txt
│
├── frontend/ (Vue 3) maybe
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   │   ├── Login.vue
│   │   │   ├── Vault.vue
│   │   └── utils/crypto.js     # AES encrypt/decrypt
│   └── package.json
│
└── README.md
```
## Init Database
```
cd server
python reset_db.py
```

## Backend
The backend uses JWT-based authentication with password hashing via Argon2. All sensitive data is stored using end-to-end encryption (E2EE), where encryption and decryption are performed entirely on the client side. The server only stores encrypted password entries and never sees the plaintext or encryption keys.

### Start the Backend
```
cd server
flask run
```

### Test auth function 

```
cd client_test
python test_auth.py
```

Output:
```
----------

Register response:
 400 {'msg': 'User already exists'}

----------

Login response:
 200 {'token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0NjU0NjYxMywianRpIjoiZjc4MGE2MTItOTJkYy00ZDZhLWFhMTAtOGZlN2E5YjljYjFkIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6MSwibmJmIjoxNzQ2NTQ2NjEzLCJjc3JmIjoiNWI4ODk3YjgtMzZlMS00NzBjLTkxMTgtYjhhYzIyZGRjMTVjIiwiZXhwIjoxNzQ2NTQ3NTEzfQ.TBPFU97cJ8vIZi7mQRb1Pvod-_ykF9JdAJtsxa2GoYI', 'user_id': 1}

----------

JWT Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0NjU0NjYxMywianRpIjoiZjc4MGE2MTItOTJkYy00ZDZhLWFhMTAtOGZlN2E5YjljYjFkIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6MSwibmJmIjoxNzQ2NTQ2NjEzLCJjc3JmIjoiNWI4ODk3YjgtMzZlMS00NzBjLTkxMTgtYjhhYzIyZGRjMTVjIiwiZXhwIjoxNzQ2NTQ3NTEzfQ.TBPFU97cJ8vIZi7mQRb1Pvod-_ykF9JdAJtsxa2GoYI
```