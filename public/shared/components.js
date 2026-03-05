window.components = (function () {
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleString();
  }

  function renderNavbar(user) {
    const adminLinks = user.role === 'admin' ? `
      <div class="nav-group">
        <span class="nav-label">Admin</span>
        <a href="#/admin/users" class="nav-link">Users</a>
        <a href="#/admin/settings" class="nav-link">Settings</a>
        <a href="#/admin/analytics" class="nav-link">Analytics</a>
        <a href="#/admin/audit" class="nav-link">Audit Log</a>
      </div>
    ` : '';

    return `
      <div class="nav-inner">
        <a href="#/" class="nav-brand">ToolboxIT</a>
        <div class="nav-links">
          <a href="#/" class="nav-link">Dashboard</a>
          ${adminLinks}
        </div>
        <div class="nav-user">
          <span class="nav-username">${escapeHtml(user.username)}</span>
          <span class="nav-role">${escapeHtml(user.role)}</span>
          <button id="logout-btn" class="btn-logout">Logout</button>
        </div>
      </div>
    `;
  }

  function renderToolCard(tool) {
    const iconMap = { phone: 'tel' };
    return `
      <a href="${tool.path}" class="tool-card">
        <div class="tool-icon">${iconMap[tool.icon] || tool.icon}</div>
        <h3>${escapeHtml(tool.name)}</h3>
        <p>${escapeHtml(tool.description)}</p>
        <span class="tool-version">v${escapeHtml(tool.version)}</span>
      </a>
    `;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function renderPagination(currentPage, totalPages, onPageChangeFnName) {
    if (totalPages <= 1) return '';
    let html = '<div class="pagination">';
    for (let i = 1; i <= Math.min(totalPages, 10); i++) {
      html += `<button class="${i === currentPage ? 'active' : ''}" onclick="${onPageChangeFnName}(${i})">${i}</button>`;
    }
    html += '</div>';
    return html;
  }

  return { escapeHtml, formatDate, renderNavbar, renderToolCard, showToast, renderPagination };
})();
