# Password Manager

## Structure
```
password-manager/
├── backend/ (Python Flask)
│   ├── app.py
│   ├── models.py
│   ├── auth.py
│   ├── vault.py
│   └── requirements.txt
│
├── frontend/ (Vue 3)
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