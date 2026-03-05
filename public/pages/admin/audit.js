(function () {
  const esc = components.escapeHtml;
  const fmt = components.formatDate;
  let currentPage = 1;

  app.register('#/admin/audit', async function render(container) {
    await loadAudit(container);
  }, { admin: true });

  async function loadAudit(container) {
    const json = await api.get(`/admin/audit?page=${currentPage}&limit=50`);
    const logs = json.success ? json.data : [];
    const total = json.total || 0;
    const totalPages = Math.ceil(total / 50);

    container.innerHTML = `
      <div class="admin-page">
        <a href="#/" class="back-link">Dashboard</a>
        <h2>Audit Log</h2>
        <table>
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Resource</th><th>IP</th></tr></thead>
          <tbody>
            ${logs.length === 0 ? '<tr><td colspan="5" class="empty-state">No audit logs</td></tr>' :
              logs.map((l) => `
                <tr>
                  <td>${fmt(l.created_at)}</td>
                  <td>${esc(l.username || '-')}</td>
                  <td><code>${esc(l.action)}</code></td>
                  <td>${esc(l.resource || '-')}</td>
                  <td>${esc(l.ip_address || '-')}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
        ${components.renderPagination(currentPage, totalPages, 'window.__auditPage')}
      </div>
    `;
  }

  window.__auditPage = async (page) => {
    currentPage = page;
    const container = document.getElementById('page-content');
    await loadAudit(container);
  };
})();
