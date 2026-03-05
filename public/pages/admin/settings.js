(function () {
  const esc = components.escapeHtml;

  const SETTING_GROUPS = [
    {
      name: 'Twilio (CNAM Lookup)',
      settings: [
        { key: 'twilio.account_sid', label: 'Account SID', type: 'text' },
        { key: 'twilio.auth_token', label: 'Auth Token', type: 'password' },
      ],
    },
  ];

  app.register('#/admin/settings', async function render(container) {
    container.innerHTML = '<div class="loading">Loading...</div>';

    const res = await api.get('/admin/settings');
    const existing = res.success ? res.data : [];
    const existingKeys = new Set(existing.map((s) => s.key));

    container.innerHTML = `
      <div class="admin-page">
        <a href="#/" class="back-link">Dashboard</a>
        <h2>Tool Settings</h2>
        <p class="subtitle">Configure API keys and credentials for tools. Values are encrypted at rest.</p>
        ${SETTING_GROUPS.map((group) => `
          <div class="admin-section">
            <h3>${esc(group.name)}</h3>
            <div class="settings-form">
              ${group.settings.map((s) => `
                <div class="setting-row">
                  <label>${esc(s.label)}</label>
                  <div class="setting-input-wrap">
                    <input type="${s.type}" id="setting-${s.key}" placeholder="${existingKeys.has(s.key) ? '(configured - enter new value to update)' : 'Enter value...'}" class="setting-input">
                    <button class="btn-sm btn-primary" data-save="${s.key}">Save</button>
                    ${existingKeys.has(s.key) ? `<span class="setting-status configured">Configured</span>` : `<span class="setting-status">Not set</span>`}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('[data-save]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.save;
        const input = container.querySelector(`#setting-${CSS.escape(key)}`);
        const value = input.value.trim();
        if (!value) { components.showToast('Please enter a value', 'error'); return; }

        const saveRes = await api.put(`/admin/settings/${encodeURIComponent(key)}`, { value });
        if (saveRes.success) {
          components.showToast(`${key} updated`, 'success');
          input.value = '';
          render(container);
        } else {
          components.showToast(saveRes.error, 'error');
        }
      });
    });
  }, { admin: true });
})();
