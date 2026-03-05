(function () {
  app.register('#/', async function render(container) {
    container.innerHTML = '<div class="loading">Loading dashboard...</div>';

    const user = app.getUser();
    const toolsRes = await api.get('/tools');
    const tools = toolsRes.success ? toolsRes.data : [];

    let statsHtml = '';
    if (user.role === 'admin') {
      const statsRes = await api.get('/admin/analytics/summary');
      if (statsRes.success) {
        const s = statsRes.data;
        statsHtml = `
          <div class="stats-strip">
            <div class="stat-item"><span class="stat-num">${s.totalUsers}</span><span class="stat-label">Users</span></div>
            <div class="stat-item"><span class="stat-num">${s.totalLookups}</span><span class="stat-label">Total Lookups</span></div>
            <div class="stat-item"><span class="stat-num">${s.lookupsToday}</span><span class="stat-label">Today</span></div>
          </div>
        `;
      }
    }

    container.innerHTML = `
      <div class="dashboard">
        <div class="dashboard-header">
          <h2>Welcome, ${components.escapeHtml(user.username)}</h2>
          <p class="subtitle">Select a tool to get started</p>
        </div>
        ${statsHtml}
        <div class="tool-grid">
          ${tools.map((t) => components.renderToolCard(t)).join('')}
        </div>
      </div>
    `;
  });
})();
