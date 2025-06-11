document.addEventListener('DOMContentLoaded', function () {
  const passwordListDiv = document.getElementById('password-list');
  const errorMsg = document.getElementById('error-msg');
  const searchInput = document.getElementById('search-input');
  const addBtn = document.getElementById('add-btn');
  const modalBg = document.getElementById('modal-bg');
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const passwordForm = document.getElementById('password-form');
  const entryId = document.getElementById('entry-id');
  const entryTitle = document.getElementById('entry-title');
  const entryUsername = document.getElementById('entry-username');
  const entryPassword = document.getElementById('entry-password');
  const entryUrl = document.getElementById('entry-url');
  const entryNotes = document.getElementById('entry-notes');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const cancelBtn = document.getElementById('cancel-btn');
  const saveBtn = document.getElementById('save-btn');
  const permissionModalBg = document.getElementById('permission-modal-bg');
  const permissionModal = document.getElementById('permission-modal');
  const permissionListDiv = document.getElementById('permission-list');
  const grantPermissionForm = document.getElementById('grant-permission-form');
  const grantPasswordId = document.getElementById('grant-password-id');
  const grantTargetId = document.getElementById('grant-target-id');
  const grantTargetType = document.getElementById('grant-target-type');
  const grantPermission = document.getElementById('grant-permission');
  const closePermissionModal = document.getElementById('close-permission-modal');
  const permissionErrorMsg = document.getElementById('permission-error-msg');
  const logoutBtn = document.getElementById('logout-btn');

  let passwords = [];
  let encryptionKey = null;
  let showPassword = false;

  // 1. 檢查登入狀態與取得加密金鑰
  chrome.storage.local.get(['token', 'data_salt', 'master_password'], async function (result) {
    if (!result.token || !result.data_salt || !result.master_password) {
      window.location.href = 'login.html';
      return;
    }
    encryptionKey = await deriveEncryptionKey(result.master_password, result.data_salt);
    fetchPasswords();
  });

  // 2. 取得密碼列表
  async function fetchPasswords() {
    errorMsg.textContent = '';
    passwordListDiv.innerHTML = '正在載入密碼資料...';
    try {
      // 這裡假設後端回傳的是 ArrayBuffer 格式的密文與 IV（需用 blob 或 arraybuffer 取得）
      const res = await fetch('http://localhost:5000/passwords', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });
      if (!res.ok) throw new Error('獲取密碼列表失敗');
      // 假設後端回傳 JSON，每個 item 的 encrypted_data, iv 都是 base64 字串
      // 若後端直接回傳 ArrayBuffer，需用 res.arrayBuffer() 處理
      const data = await res.json();
      passwords = await Promise.all(
        data.map(async (item) => {
          try {
            // 將 base64 轉回 ArrayBuffer（如果後端直接傳 ArrayBuffer，這裡可省略）
            const encryptedDataBuffer = typeof item.encrypted_data === 'string'
              ? base64ToArrayBuffer(item.encrypted_data)
              : item.encrypted_data;
            const ivBuffer = typeof item.iv === 'string'
              ? base64ToArrayBuffer(item.iv)
              : item.iv;
            const decrypted = await decryptData(encryptedDataBuffer, ivBuffer, encryptionKey);
            const parsed = JSON.parse(decrypted);
            return {
              id: item.id,
              title: item.site,
              username: parsed.username || '',
              password: parsed.password || '',
              url: parsed.url || '',
              notes: item.notes || '',
              owner_id: item.owner_id
            };
          } catch (e) {
            console.error('[解密失敗]', {
              error: e,
              id: item.id,
              encrypted_data: item.encrypted_data,
              iv: item.iv
            });
            return {
              id: item.id,
              title: item.site,
              username: '解密失敗',
              password: '解密失敗',
              url: '',
              notes: '資料解密失敗，可能是密鑰不正確',
              owner_id: item.owner_id
            };
          }
        })
      );
      renderPasswords();
    } catch (err) {
      errorMsg.textContent = err.message || '獲取密碼列表失敗';
      passwordListDiv.innerHTML = '';
    }
  }

  // 3. 渲染密碼列表
  function renderPasswords() {
    const search = searchInput.value.trim().toLowerCase();
    const filtered = passwords.filter(p =>
      p.title.toLowerCase().includes(search) ||
      p.username.toLowerCase().includes(search) ||
      (p.url && p.url.toLowerCase().includes(search))
    );
    if (filtered.length === 0) {
      passwordListDiv.innerHTML = '<div style="text-align:center;color:#888;">沒有找到符合的密碼</div>';
      return;
    }
    passwordListDiv.innerHTML = filtered.map(p => `
      <div style="display:flex;justify-content:space-between;align-items:center;border:1px solid #eee;padding:12px;margin-bottom:8px;border-radius:6px;">
        <div>
          <div style="font-weight:bold;">${p.title}</div>
          <div style="font-size:13px;color:#666;">${p.username}</div>
        </div>
        <div>
          <button data-id="${p.id}" class="copy-btn">複製密碼</button>
          <button data-id="${p.id}" class="edit-btn">編輯</button>
          <button data-id="${p.id}" class="delete-btn">刪除</button>
          <button data-id="${p.id}" class="permission-btn">授權</button>
        </div>
      </div>
    `).join('');
    passwordListDiv.querySelectorAll('.copy-btn').forEach(btn => {
      btn.onclick = () => handleCopy(btn.dataset.id);
    });
    passwordListDiv.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = () => openEditModal(btn.dataset.id);
    });
    passwordListDiv.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = () => handleDelete(btn.dataset.id);
    });
  }

  // 4. 搜尋
  searchInput.addEventListener('input', renderPasswords);

  // 5. 新增密碼
  addBtn.addEventListener('click', () => {
    openModal('新增密碼');
  });

  // 6. 彈窗表單
  function openModal(title, entry = null) {
    modalTitle.textContent = title;
    modalBg.style.display = 'flex';
    if (entry) {
      entryId.value = entry.id;
      entryTitle.value = entry.title;
      entryUsername.value = entry.username;
      entryPassword.value = entry.password;
      entryUrl.value = entry.url;
      entryNotes.value = entry.notes;
    } else {
      entryId.value = '';
      entryTitle.value = '';
      entryUsername.value = '';
      entryPassword.value = '';
      entryUrl.value = '';
      entryNotes.value = '';
    }
    showPassword = false;
    entryPassword.type = 'password';
  }

  cancelBtn.addEventListener('click', () => {
    modalBg.style.display = 'none';
  });

  togglePasswordBtn.addEventListener('click', () => {
    showPassword = !showPassword;
    entryPassword.type = showPassword ? 'text' : 'password';
  });

  // 7. 新增/編輯密碼送出
  passwordForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    saveBtn.disabled = true;
    try {
      const dataToEncrypt = JSON.stringify({
        username: entryUsername.value,
        password: entryPassword.value,
        url: entryUrl.value,
        notes: entryNotes.value
      });
      const encrypted = await encryptData(dataToEncrypt, encryptionKey);

      // 轉 base64 字串
      const encryptedDataBase64 = arrayBufferToBase64(encrypted.ciphertext);
      const ivBase64 = arrayBufferToBase64(encrypted.iv);
          
      const payload = {
        site: entryTitle.value,
        encrypted_data: encryptedDataBase64,
        iv: ivBase64,
        notes: entryNotes.value
      };
      
      if (entryId.value) {
        await fetch(`http://localhost:5000/storage/${entryId.value}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getToken()}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('http://localhost:5000/storage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getToken()}`
          },
          body: JSON.stringify(payload)
        });
      }
      modalBg.style.display = 'none';
      fetchPasswords();
    } catch (err) {
      errorMsg.textContent = err.message || '儲存密碼失敗';
    } finally {
      saveBtn.disabled = false;
    }
  });

  // 8. 編輯
  function openEditModal(id) {
    const entry = passwords.find(p => p.id == id);
    if (entry) openModal('編輯密碼', entry);
  }

  // 9. 刪除
  async function handleDelete(id) {
    if (!confirm('確定要刪除這個密碼嗎？此操作無法撤銷。')) return;
    try {
      await fetch(`http://localhost:5000/storage/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${await getToken()}` }
      });
      fetchPasswords();
    } catch (err) {
      errorMsg.textContent = err.message || '刪除密碼失敗';
    }
  }

  // 10. 複製密碼
  function handleCopy(id) {
    const entry = passwords.find(p => p.id == id);
    if (entry) {
      navigator.clipboard.writeText(entry.password)
        .then(() => alert('已複製到剪貼簿'))
        .catch(() => alert('複製失敗'));
    }
  }

  // 11. 取得 token
  async function getToken() {
    return new Promise(resolve => {
      chrome.storage.local.get('token', r => resolve(r.token));
    });
  }

  async function encryptData(plain, key) {
    return await encrypt(plain, key);
  }
  async function decryptData(ciphertext, iv, key) {
    return await decrypt({ciphertext, iv}, key);
  }
  async function openPermissionModal(passwordId) {
    grantPasswordId.value = passwordId;
    permissionErrorMsg.textContent = '';
    permissionModalBg.style.display = 'flex';
    await loadPermissionList(passwordId);
  }
  closePermissionModal.onclick = function() {
    permissionModalBg.style.display = 'none';
  }
  async function loadPermissionList(passwordId) {
    permissionListDiv.innerHTML = 'loading...';
    try {
      const res = await fetch(`http://localhost:5000/permission/password/${passwordId}`, {
        headers: {Authorization: `Bearer ${await getToken()}`}
      });
      if (!res.ok) throw new Error('取得授權清單失敗');
      const data = await res.json();
      if (data.length === 0) {
        permissionListDiv.innerHTML = '<div style="color: #888;">尚未授權任何對象</div>';
        return;
      }
      permissionListDiv.innerHTML = data.map(item => `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span>${item.target_type === 'user' ? '使用者' : '群組'} #${item.target_id} - 權限: ${item.permission}</span>
          <span>
            <button data-id="${item.id}" class="update-permission-btn">修改權限</button>
            <button data-type="${item.target_type}" data-tid="${item.target_id}" class="revoke-permission-btn">撤銷</button>
          </span>
        </div>
    `).join('');
    permissionListDiv.querySelectorAll('.update-permission-btn').forEach(btn => {
      btn.onclick = () => updatePermission(btn.dataset.id);
    });
    permissionListDiv.querySelectorAll('.revoke-permission-btn').forEach(btn => {
      btn.onclick = () => revokePermission(passwordId, btn.dataset.type, btn.dataset.tid);
    });
    } catch (err) {
      permissionListDiv.innerHTML = `<span style="color:red;">${err.message || '取得授權清單失敗'}</span>`;
    }
  }

  grantPermissionForm.onsubmit = async function (e) {
    e.preventDefault();
    permissionErrorMsg.textContent = '';
    const password_id = grantPasswordId.value;
    const target_id = grantTargetId.value;
    const target_type = grantTargetType.value;
    const permission = grantPermission.value;
    if (!target_id) {
      permissionErrorMsg.textContent = '請輸入對象 ID';
      return;
    }
    const body = {
      password_id: Number(password_id),
      permission
    };
    if (target_type === 'user') body.user_id = Number(target_id);
    else body.group_id = Number(target_id);

    try {
      const res = await fetch('http://localhost:5000/permission/grant', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}`},
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || '授權失敗');
      await loadPermissionList(password_id);
      grantTargetId.value = '';
      permissionErrorMsg.textContent = '授權成功';
    } catch (err) {
      permissionErrorMsg.textContent = err.message || '授權失敗';
    }
  };

  async function updatePermission(access_id) {
    const newPermission = prompt('請輸入新權限（read/write/delete）:');
    if (!newPermission || !['read','write','delete'].includes(newPermission)) return;
    try {
      const res = await fetch(`http://localhost:5000/permission/update/${access_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({ permission: newPermission })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || '修改失敗');
      // 重新載入
      await loadPermissionList(grantPasswordId.value);
      permissionErrorMsg.textContent = '修改成功';
    } catch (err) {
      permissionErrorMsg.textContent = err.message || '修改失敗';
    }
  }

  async function revokePermission(password_id, target_type, target_id) {
    if (!confirm('確定要撤銷這個授權嗎？')) return;
    const body = { password_id: Number(password_id) };
    if (target_type === 'user') body.user_id = Number(target_id);
    else body.group_id = Number(target_id);
    try {
      const res = await fetch('http://localhost:5000/permission/revoke', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || '撤銷失敗');
      await loadPermissionList(password_id);
      permissionErrorMsg.textContent = '撤銷成功';
    } catch (err) {
      permissionErrorMsg.textContent = err.message || '撤銷失敗';
    }
  }

  if (logoutBtn) {
    logoutBtn.onclick = function () {
      if (encryptionKey) {
        clearSensitiveData(new Uint8Array(encryptionKey));
        encryptionKey = null;
      }
      chrome.storage.local.remove('master_password');
      chrome.storage.local.remove('token');
      chrome.storage.local.remove('data_salt');
      window.location.href = 'login.html';
    };
  }

  window.addEventListener('beforeunload', function() {
    if (encryptionKey) {
      clearSensitiveData(new Uint8Array(encryptionKey));
      encryptionKey = null;
    }
    chrome.storage.local.remove('master_password');
  });
});