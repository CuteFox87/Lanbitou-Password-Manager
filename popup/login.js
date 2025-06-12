document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberMeInput = document.getElementById('remember-me');
  const loginBtn = document.getElementById('login-btn');
  const errorDiv = document.getElementById('login-error');
  const hintDiv = document.getElementById('login-hint');

  let loginAttempts = 0;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorDiv.textContent = '';
    hintDiv.style.display = 'none';

    loginBtn.disabled = true;
    loginBtn.textContent = '登入中...';

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const loginkey = await deriveLoginKey(password);

    try {
      const res = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          login_key: loginkey
        })
      });
      const data = await res.json();

      if (res.ok) {
        chrome.storage.local.set({
        token: data.token,
        user_id: data.user_id,
        data_salt: data.data_salt,
        master_password: password
      });
        if (rememberMeInput.checked) {
          chrome.storage.local.set({ remember_email: email });
        } else {
          chrome.storage.local.remove('remember_email');
        }
        window.location.href = 'vault.html';
      } else {
        loginAttempts += 1;
        errorDiv.innerHTML = `<strong>登入失敗：</strong> ${data.msg || '請檢查帳號密碼'}`;
        if (loginAttempts >= 2) {
          hintDiv.style.display = 'block';
          hintDiv.innerHTML = `
            <p>請確認您使用的是正確的憑證。如果您剛剛註冊了新帳戶：</p>
            <ul>
              <li>請使用相同的瀏覽器和設備登入</li>
              <li>如果您清除了瀏覽器資料，可能需要重新註冊</li>
              <li>請確保不要手動輸入密碼，使用您註冊時設定的密碼</li>
            </ul>
          `;
        }
        if (loginAttempts >= 3) {
            errorDiv.innerHTML += '<br>多次登入失敗，請稍後再試。';
            loginBtn.disabled = true;
            let wait = 10;
            loginBtn.textContent = `請稍候 ${wait}`;
            const interval = setInterval(() => {
                wait--;
                loginBtn.textContent = `請稍候 ${wait}`;
                if (wait <= 0) {
                    clearInterval(interval);
                    loginBtn.disabled = false;
                    loginBtn.textContent = '登入';
                    loginAttempts = 0;
                }
            }, 1000);
            return;
        }
      }
    } catch (err) {
      errorDiv.textContent = '無法連線到伺服器';
    } finally {
      // 只有不是倒數時才恢復可點擊
      if (!loginBtn.textContent.startsWith('請稍候')) {
        loginBtn.disabled = false;
        loginBtn.textContent = '登入';
      }
    }
  });

  chrome.storage.local.get('remember_email', function(result) {
    if (result.remember_email) {
      emailInput.value = result.remember_email;
      rememberMeInput.checked = true;
    }
  });
});