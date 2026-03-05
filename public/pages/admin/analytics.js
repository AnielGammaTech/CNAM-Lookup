(function () {
  const esc = components.escapeHtml;
  const fmt = components.formatDate;

  app.register('#/admin/analytics', async function render(container) {
    container.innerHTML = '<div class="loading">Loading...</div>';

    const [summaryRes, usageRes, usersRes] = await Promise.all([
      api.get('/admin/analytics/summary'),
      api.get('/admin/analytics/usage'),
      api.get('/admin/analytics/users'),
    ]);

    const summary = summaryRes.success ? summaryRes.data : {};
    const usage = usageRes.success ? usageRes.data : [];
    const users = usersRes.success ? usersRes.data : [];

    container.innerHTML = `
      <div class="admin-page">
        <a href="#/" class="back-link">Dashboard</a>
        <h2>Analytics</h2>

        <div class="stats-strip">
          <div class="stat-item"><span class="stat-num">${summary.totalUsers || 0}</span><span class="stat-label">Total Users</span></div>
          <div class="stat-item"><span class="stat-num">${summary.totalLookups || 0}</span><span class="stat-label">Total Lookups</span></div>
          <div class="stat-item"><span class="stat-num">${summary.lookupsToday || 0}</span><span class="stat-label">Today</span></div>
        </div>

        <div class="admin-section">
          <h3>Daily Usage (Last 30 Days)</h3>
          <table>
            <thead><tr><th>Date</th><th>Lookups</th><th>Unique Users</th></tr></thead>
            <tbody>
              ${usage.length === 0 ? '<tr><td colspan="3" class="empty-state">No data</td></tr>' :
                usage.map((r) => `
                  <tr>
                    <td>${esc(r.date?.split('T')[0] || r.date)}</td>
                    <td>${r.lookups}</td>
                    <td>${r.unique_users}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>

        <div class="admin-section">
          <h3>Usage by User</h3>
          <table>
            <thead><tr><th>Username</th><th>Total Lookups</th><th>Last Lookup</th></tr></thead>
            <tbody>
              ${users.length === 0 ? '<tr><td colspan="3" class="empty-state">No data</td></tr>' :
                users.map((u) => `
                  <tr>
                    <td>${esc(u.username)}</td>
                    <td>${u.total_lookups}</td>
                    <td>${fmt(u.last_lookup)}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }, { admin: true });
})();
