(function () {
  app.register('#/login', async function render(container) {
    container.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <h1 class="login-brand">ToolboxIT</h1>
          <p class="login-subtitle">Gamma Tech Internal Tools</p>
          <div class="login-tabs">
            <button class="login-tab active" data-tab="login">Sign In</button>
            <button class="login-tab" data-tab="register">Register</button>
          </div>
          <form id="login-form" class="login-form">
            <input type="text" id="login-username" placeholder="Username" required autocomplete="username">
            <input type="password" id="login-password" placeholder="Password" required autocomplete="current-password">
            <button type="submit" class="btn-primary">Sign In</button>
            <p id="login-error" class="form-error hidden"></p>
          </form>
          <form id="register-form" class="login-form hidden">
            <input type="text" id="reg-username" placeholder="Username" required autocomplete="username">
            <input type="password" id="reg-password" placeholder="Password (8+ characters)" required autocomplete="new-password">
            <input type="password" id="reg-confirm" placeholder="Confirm Password" required autocomplete="new-password">
            <input type="text" id="reg-invite" placeholder="Invite Code" required>
            <button type="submit" class="btn-primary">Create Account</button>
            <p id="reg-error" class="form-error hidden"></p>
          </form>
        </div>
      </div>
    `;

    // Tab switching
    const tabs = container.querySelectorAll('.login-tab');
    const loginForm = container.querySelector('#login-form');
    const registerForm = container.querySelector('#register-form');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.tab === 'login') {
          loginForm.classList.remove('hidden');
          registerForm.classList.add('hidden');
        } else {
          loginForm.classList.add('hidden');
          registerForm.classList.remove('hidden');
        }
      });
    });

    // Login
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = container.querySelector('#login-error');
      errorEl.classList.add('hidden');

      const res = await api.post('/auth/login', {
        username: container.querySelector('#login-username').value.trim(),
        password: container.querySelector('#login-password').value,
      });

      if (res.success) {
        app.setUser(res.user);
        app.navigate('#/');
      } else {
        errorEl.textContent = res.error;
        errorEl.classList.remove('hidden');
      }
    });

    // Register
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = container.querySelector('#reg-error');
      errorEl.classList.add('hidden');

      const password = container.querySelector('#reg-password').value;
      const confirm = container.querySelector('#reg-confirm').value;

      if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.classList.remove('hidden');
        return;
      }

      const res = await api.post('/auth/register', {
        username: container.querySelector('#reg-username').value.trim(),
        password,
        inviteCode: container.querySelector('#reg-invite').value.trim(),
      });

      if (res.success) {
        app.setUser(res.user);
        app.navigate('#/');
      } else {
        errorEl.textContent = res.error;
        errorEl.classList.remove('hidden');
      }
    });
  });
})();
