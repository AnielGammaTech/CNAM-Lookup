(function () {
  const esc = components.escapeHtml;
  const fmt = components.formatDate;

  app.register('#/admin/users', async function render(container) {
    container.innerHTML = '<div class="loading">Loading...</div>';

    const [usersRes, invitesRes] = await Promise.all([
      api.get('/admin/users'),
      api.get('/admin/invites'),
    ]);

    const users = usersRes.success ? usersRes.data : [];
    const invites = invitesRes.success ? invitesRes.data : [];

    container.innerHTML = `
      <div class="admin-page">
        <a href="#/" class="back-link">Dashboard</a>
        <h2>User Management</h2>

        <div class="admin-section">
          <h3>Users</h3>
          <table>
            <thead><tr><th>Username</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody id="admin-users-body">
              ${users.map((u) => renderUserRow(u)).join('')}
            </tbody>
          </table>
        </div>

        <div class="admin-section">
          <div class="section-header">
            <h3>Invite Codes</h3>
            <button id="gen-invite-btn" class="btn-primary btn-sm">Generate Code</button>
          </div>
          <table>
            <thead><tr><th>Code</th><th>Status</th><th>Created By</th><th>Used By</th><th>Expires</th><th>Actions</th></tr></thead>
            <tbody id="admin-invites-body">
              ${invites.map((inv) => renderInviteRow(inv)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.querySelector('#gen-invite-btn').addEventListener('click', async () => {
      const res = await api.post('/admin/invites');
      if (res.success) {
        components.showToast(`Invite code: ${res.data.code}`, 'success');
        render(container);
      }
    });

    container.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { action, id } = btn.dataset;
        if (action === 'toggle-role') {
          const current = btn.dataset.role;
          await api.patch(`/admin/users/${id}/role`, { role: current === 'admin' ? 'user' : 'admin' });
        } else if (action === 'toggle-active') {
          const active = btn.dataset.active === 'true';
          await api.patch(`/admin/users/${id}/active`, { isActive: !active });
        } else if (action === 'delete-user') {
          if (!confirm('Delete this user?')) return;
          await api.del(`/admin/users/${id}`);
        } else if (action === 'revoke-invite') {
          await api.del(`/admin/invites/${id}`);
        }
        render(container);
      });
    });
  }, { admin: true });

  function renderUserRow(u) {
    const statusClass = u.is_active ? 'status-active' : 'status-inactive';
    const statusText = u.is_active ? 'Active' : 'Inactive';
    return `
      <tr>
        <td>${esc(u.username)}</td>
        <td><span class="badge badge-${u.role}">${esc(u.role)}</span></td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>${fmt(u.created_at)}</td>
        <td class="action-cell">
          <button class="btn-sm" data-action="toggle-role" data-id="${u.id}" data-role="${u.role}">
            Make ${u.role === 'admin' ? 'User' : 'Admin'}
          </button>
          <button class="btn-sm" data-action="toggle-active" data-id="${u.id}" data-active="${u.is_active}">
            ${u.is_active ? 'Disable' : 'Enable'}
          </button>
          <button class="btn-sm btn-danger-sm" data-action="delete-user" data-id="${u.id}">Delete</button>
        </td>
      </tr>`;
  }

  function renderInviteRow(inv) {
    let status = 'Active';
    let statusClass = 'status-active';
    if (inv.is_used) { status = 'Used'; statusClass = 'status-inactive'; }
    else if (inv.expires_at && new Date(inv.expires_at) < new Date()) { status = 'Expired'; statusClass = 'status-inactive'; }

    return `
      <tr>
        <td><code>${esc(inv.code)}</code></td>
        <td><span class="${statusClass}">${status}</span></td>
        <td>${esc(inv.created_by_name || '-')}</td>
        <td>${esc(inv.used_by_name || '-')}</td>
        <td>${fmt(inv.expires_at)}</td>
        <td>${!inv.is_used ? `<button class="btn-sm btn-danger-sm" data-action="revoke-invite" data-id="${inv.id}">Revoke</button>` : ''}</td>
      </tr>`;
  }
})();
