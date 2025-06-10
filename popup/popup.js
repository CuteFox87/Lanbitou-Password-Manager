document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('register-form');
  const errorDiv = document.getElementById('form-error');
  const successDiv = document.getElementById('form-success');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const passwordMatchFeedback = document.getElementById('password-match-feedback');
  const passwordStrengthBar = document.getElementById('password-strength-bar');
  const passwordStrengthFeedback = document.getElementById('password-strength-feedback');

  function assessPasswordStrength(password) {
    let score = 0;
    let feedback = "";

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) {
      feedback = "弱：建議使用更複雜的密碼";
    } else if (score <= 4) {
      feedback = "中等：可以再增加一些複雜度";
    } else {
      feedback = "強：這是一個強密碼";
    }
    return { score, feedback };
  }

  function renderStrengthBar(score) {
    passwordStrengthBar.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
      const bar = document.createElement('div');
      bar.style.display = 'inline-block';
      bar.style.width = '16%';
      bar.style.height = '6px';
      bar.style.marginRight = '2px';
      bar.style.borderRadius = '2px';
      if (i <= score) {
        if (score <= 2) bar.style.background = '#ef4444';
        else if (score <= 4) bar.style.background = '#facc15';
        else bar.style.background = '#22c55e';
      } else {
        bar.style.background = '#e5e7eb';
      }
      passwordStrengthBar.appendChild(bar);
    }
  }

  passwordInput.addEventListener('input', function () {
    const { score, feedback } = assessPasswordStrength(passwordInput.value);
    renderStrengthBar(score);
    passwordStrengthFeedback.textContent = feedback;
  });

  confirmPasswordInput.addEventListener('input', function () {
    if (passwordInput.value !== confirmPasswordInput.value) {
      passwordMatchFeedback.style.display = 'block';
    } else {
      passwordMatchFeedback.style.display = 'none';
    }
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorDiv.textContent = '';
    successDiv.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const passwordHint = document.getElementById('password-hint').value.trim();

    if (!email || !password || !confirmPassword) {
      errorDiv.textContent = '請填寫所有必填欄位';
      return;
    }
    if (password !== confirmPassword) {
      errorDiv.textContent = '密碼不匹配';
      return;
    }
    if (password.length < 8) {
      errorDiv.textContent = '密碼必須至少8個字符';
      return;
    }

    const { score } = assessPasswordStrength(password);
    if (score <= 2) {
      if (!window.confirm('您的密碼強度較弱，這可能導致安全風險。確定要繼續嗎？')) {
        return;
      }
    }

    try {
      const res = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          login_key: password,
          password_hint: passwordHint || ""
        })
      });
      const data = await res.json();
      if (res.ok) {
        chrome.storage.local.set({data_salt: data.data_salt});
        successDiv.textContent = '註冊成功，請前往登入！';
        const goLoginBtn = document.getElementById('go-login-btn');
        if (goLoginBtn) {
          goLoginBtn.addEventListener('click', function(){
            window.location.href = '/login'
          });
        }
        form.reset();
        form.style.display = 'none';
        document.getElementById('register-success').style.display = 'block';
        passwordStrengthBar.innerHTML = '';
        passwordStrengthFeedback.textContent = '';
      } else {
        errorDiv.textContent = data.msg || '註冊失敗';
      }
    } catch (err) {
      errorDiv.textContent = '無法連線到伺服器';
    }
  });
});