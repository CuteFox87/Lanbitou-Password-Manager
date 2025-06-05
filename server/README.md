# 密碼管理系統 API 文件

本文件為前端工程師設計使用者介面所需的 API 詳細說明。

## 基本資訊

* Base URL: `http://localhost:5000`
* 所有需要授權的 API 需在 `Authorization` 標頭中夾帶 `Bearer <JWT Token>`

---

## 用戶相關

### POST /register

註冊新用戶。

* 請求 Body:

```json
{
  "email": "test@example.com",
  "login_key": "your_login_password"
}
```

* 回應：

```json
{
  "msg": "用戶註冊成功",
  "data_salt": "..."
}
```

### POST /login

用戶登入，回傳 JWT Token。

* 請求 Body:

```json
{
  "email": "test@example.com",
  "login_key": "your_login_password"
}
```

* 回應：

```json
{
  "token": "<JWT Token>",
  "user_id": 1,
  "data_salt": "...",
  "is_first_login": true
}
```

---

## 密碼資料管理

### POST /storage

儲存密碼項目。

* 請求 Body:

```json
{
  "site": "example.com",
  "encrypted_data": "加密後的 base64 字串",
  "iv": "初始向量",
  "notes": "備註資訊"
}
```

* 成功回應：

```json
{
  "msg": "Password stored successfully",
  "password_id": 12
}
```

### GET /passwords

取得當前使用者能夠存取的所有密碼（包含自己建立和被授權的）。

* 回應：密碼清單陣列，每筆如下：

```json
{
  "id": 12,
  "site": "example.com",
  "encrypted_data": "...",
  "iv": "...",
  "notes": "...",
  "owner_id": 1
}
```

### PUT /storage/\<password\_id>

更新指定密碼資料（僅限擁有者或具寫入權限者）。

### DELETE /storage/\<password\_id>

刪除指定密碼（僅限擁有者或具刪除權限者）。

---

## 權限（Permission）管理

### POST /permission/grant

授權使用者或群組存取某密碼。

* Body：只能擇一傳入 `user_id` 或 `group_id`

```json
{
  "password_id": 12,
  "user_id": 2,               // 或
  "group_id": 3,
  "permission": "read"         // 可為 "read", "write", "delete"
}
```

* 回應：

```json
{
  "msg": "Permission granted successfully"
}
```

### GET /permission/password/\<password\_id>

查看某密碼目前已授予的權限清單。

* 回應：

```json
[
  {
    "id": 55,
    "target_type": "user", // 或 "group"
    "target_id": 2,
    "permission": "READ"
  },
  ...
]
```

### PATCH /permission/update/\<access\_id>

修改某筆授權的權限類型。

* Body：

```json
{
  "permission": "write" // 可為 read、write、delete
}
```

* 回應：

```json
{
  "msg": "Permission updated successfully",
  "new_permission": "WRITE"
}
```

### DELETE /permission/revoke

撤銷指定用戶或群組的密碼授權。

* Body：

```json
{
  "password_id": 12,
  "user_id": 2   // 或 "group_id": 3
}
```

* 成功回應：

```json
{
  "msg": "Permission revoked successfully"
}
```

* 若查無該筆授權，將回傳：

```json
{
  "msg": "Permission not found"
}
```

---

## 群組（Group）管理

### POST /groups

建立新群組。

* Body：

```json
{
  "name": "Dev Team",
  "description": "Shared passwords for developers"
}
```

* 回應：

```json
{
  "msg": "Group created successfully",
  "group_id": 3
}
```

### POST /groups/\<group\_id>/members

將用戶加入群組並給予特定權限。

* Body：

```json
{
  "user_id": 2,
  "permission": "read"
}
```

* 回應：

```json
{
  "msg": "User added to group"
}
```

---

## 注意事項

* 密碼加密處理應由前端負責，後端僅負責儲存密文與 IV。
* 使用者需使用登入回傳的 `data_salt` 作為加密 key 的一部分進行導出與解密。
* 權限系統允許以下類型：

  * `READ`: 可讀取但不可變更
  * `WRITE`: 可修改密碼內容
  * `DELETE`: 可刪除密碼

