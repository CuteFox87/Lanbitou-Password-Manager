# Password Manager

## Structure
```
Lanbitou-Password-Manager/
├── server/ (Python Flask)
│   ├── instance/
│   │   └── vault.db
│   ├── app.py
│   ├── models.py
│   ├── auth.py
│   ├── storage.py
│   ├── reset_db.py
│   └── requirements.txt
│
├── frontend/ (Next.js)
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── landing/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── vault/
│   │   │   │   └── page.tsx
│   │   │   ├── setup/
│   │   │   │   └── page.tsx
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   └── favicon.ico
│   │   │
│   │   ├── components/
│   │   │   ├── layout_module/
│   │   │   └── utils.ts
│   │   │
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   │
│   │   └── lib/
│   │       ├── api.ts
│   │       ├── crypto.ts (PBKDF2、AES‑GCM)
│   │       └── jwt.ts
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── next.config.ts
│   ├── next-env.d.ts
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── eslint.config.mjs
│   └── README.md
│
└── README.md

```
## Init Database
```
cd server
python reset_db.py
```

## Frontend

### Install Frontend package 
```
cd Lanbitou-Password-Manager/frontend
npm install
```

### Start the Frontend
```
cd Lanbitou-Password-Manager/frontend
npm run dev
```

## Backend
The backend uses JWT-based authentication with password hashing via Argon2. All sensitive data is stored using end-to-end encryption (E2EE), where encryption and decryption are performed entirely on the client side. The server only stores encrypted password entries and never sees the plaintext or encryption keys.

### Start the Backend
```
cd server
flask run
```


