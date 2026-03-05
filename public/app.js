document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');

  // Tab switching
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => { p.classList.remove('active'); p.classList.add('hidden'); });
      tab.classList.add('active');
      const panel = document.getElementById(target);
      panel.classList.remove('hidden');
      panel.classList.add('active');
      if (target === 'history') loadHistory();
    });
  });

  // Single Lookup
  const singleForm = document.getElementById('single-form');
  const phoneInput = document.getElementById('phone-input');
  const lookupBtn = document.getElementById('lookup-btn');
  const singleResult = document.getElementById('single-result');

  singleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = phoneInput.value.trim();
    if (!phone) return;

    lookupBtn.disabled = true;
    lookupBtn.innerHTML = '<span class="spinner"></span>Looking up...';
    singleResult.classList.remove('hidden');
    singleResult.innerHTML = '<p style="color:#8b949e">Looking up number...</p>';

    try {
      const res = await fetch('/api/lookup/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (json.success) {
        singleResult.innerHTML = renderResultCard(json.data);
      } else {
        singleResult.innerHTML = `<div class="result-card"><p class="result-value error">${escapeHtml(json.error)}</p></div>`;
      }
    } catch {
      singleResult.innerHTML = '<div class="result-card"><p class="result-value error">Network error. Please try again.</p></div>';
    } finally {
      lookupBtn.disabled = false;
      lookupBtn.textContent = 'Lookup';
    }
  });

  // Bulk CSV Upload
  const dropZone = document.getElementById('drop-zone');
  const csvInput = document.getElementById('csv-input');
  const bulkProgress = document.getElementById('bulk-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const bulkResult = document.getElementById('bulk-result');

  dropZone.addEventListener('click', () => csvInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) uploadCSV(file);
  });
  csvInput.addEventListener('change', () => {
    if (csvInput.files[0]) uploadCSV(csvInput.files[0]);
  });

  async function uploadCSV(file) {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a .csv file');
      return;
    }

    dropZone.classList.add('hidden');
    bulkProgress.classList.remove('hidden');
    bulkResult.classList.add('hidden');
    progressFill.style.width = '10%';
    progressText.textContent = 'Uploading and processing...';

    const formData = new FormData();
    formData.append('file', file);

    try {
      progressFill.style.width = '30%';
      const res = await fetch('/api/lookup/bulk', { method: 'POST', body: formData });
      progressFill.style.width = '90%';
      const json = await res.json();
      progressFill.style.width = '100%';

      if (json.success) {
        progressText.textContent = 'Complete!';
        setTimeout(() => {
          bulkProgress.classList.add('hidden');
          bulkResult.classList.remove('hidden');
          bulkResult.innerHTML = renderBulkResults(json.data, json.summary);
        }, 500);
      } else {
        progressText.textContent = json.error;
        progressFill.style.background = '#f85149';
        setTimeout(() => resetBulk(), 3000);
      }
    } catch {
      progressText.textContent = 'Upload failed. Please try again.';
      progressFill.style.background = '#f85149';
      setTimeout(() => resetBulk(), 3000);
    }
  }

  function resetBulk() {
    bulkProgress.classList.add('hidden');
    dropZone.classList.remove('hidden');
    bulkResult.classList.add('hidden');
    progressFill.style.width = '0%';
    progressFill.style.background = '#1f6feb';
    csvInput.value = '';
  }

  // History
  let currentPage = 1;
  let searchTimeout = null;
  const searchInput = document.getElementById('search-input');
  const historyBody = document.getElementById('history-body');
  const pagination = document.getElementById('pagination');
  const clearBtn = document.getElementById('clear-history-btn');

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { currentPage = 1; loadHistory(); }, 400);
  });

  clearBtn.addEventListener('click', async () => {
    if (!confirm('Clear all lookup history?')) return;
    try {
      await fetch('/api/history', { method: 'DELETE' });
      loadHistory();
    } catch { /* ignore */ }
  });

  async function loadHistory() {
    const search = searchInput.value.trim();
    try {
      const res = await fetch(`/api/history?page=${currentPage}&limit=25&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (!json.success) return;

      if (json.data.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="6" class="empty-state">No lookups yet</td></tr>';
        pagination.innerHTML = '';
        return;
      }

      historyBody.innerHTML = json.data.map((row) => `
        <tr>
          <td>${escapeHtml(row.phone_number || '-')}</td>
          <td>${escapeHtml(row.caller_name || '-')}</td>
          <td>${escapeHtml(row.caller_type || '-')}</td>
          <td>${escapeHtml(row.carrier_name || '-')}</td>
          <td>${escapeHtml(row.line_type || '-')}</td>
          <td>${formatDate(row.looked_up_at)}</td>
        </tr>
      `).join('');

      const totalPages = Math.ceil(json.total / json.limit);
      renderPagination(totalPages);
    } catch { /* ignore */ }
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) { pagination.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= Math.min(totalPages, 10); i++) {
      html += `<button class="${i === currentPage ? 'active' : ''}" onclick="window.__goPage(${i})">${i}</button>`;
    }
    pagination.innerHTML = html;
  }

  window.__goPage = (page) => { currentPage = page; loadHistory(); };

  // Render helpers
  function renderResultCard(d) {
    if (d.error_message) {
      return `<div class="result-card"><h3>${escapeHtml(d.phone_number)}</h3><p class="result-value error">${escapeHtml(d.error_message)}</p></div>`;
    }
    return `
      <div class="result-card">
        <h3>${escapeHtml(d.phone_number || d.phone)}</h3>
        <div class="result-grid">
          <div class="result-item"><div class="result-label">Caller Name</div><div class="result-value">${escapeHtml(d.caller_name || 'N/A')}</div></div>
          <div class="result-item"><div class="result-label">Caller Type</div><div class="result-value">${escapeHtml(d.caller_type || 'N/A')}</div></div>
          <div class="result-item"><div class="result-label">Country</div><div class="result-value">${escapeHtml(d.country_code || 'N/A')}</div></div>
          <div class="result-item"><div class="result-label">Carrier</div><div class="result-value">${escapeHtml(d.carrier_name || 'N/A')}</div></div>
          <div class="result-item"><div class="result-label">Line Type</div><div class="result-value">${escapeHtml(d.line_type || 'N/A')}</div></div>
          <div class="result-item"><div class="result-label">MCC</div><div class="result-value">${escapeHtml(d.mobile_country_code || 'N/A')}</div></div>
          <div class="result-item"><div class="result-label">MNC</div><div class="result-value">${escapeHtml(d.mobile_network_code || 'N/A')}</div></div>
        </div>
      </div>`;
  }

  function renderBulkResults(data, summary) {
    const summaryHtml = `
      <div class="summary-bar">
        <div class="summary-item"><div class="summary-num">${summary.total}</div><div class="summary-label">Total</div></div>
        <div class="summary-item"><div class="summary-num">${summary.processed}</div><div class="summary-label">Processed</div></div>
        <div class="summary-item"><div class="summary-num" style="color:#3fb950">${summary.successful}</div><div class="summary-label">Success</div></div>
        <div class="summary-item"><div class="summary-num" style="color:#f85149">${summary.failed}</div><div class="summary-label">Failed</div></div>
      </div>`;

    const tableHtml = `
      <table>
        <thead><tr><th>Phone</th><th>Caller Name</th><th>Type</th><th>Carrier</th><th>Line Type</th><th>Status</th></tr></thead>
        <tbody>${data.map((d) => `
          <tr>
            <td>${escapeHtml(d.phone_number || '-')}</td>
            <td>${escapeHtml(d.caller_name || '-')}</td>
            <td>${escapeHtml(d.caller_type || '-')}</td>
            <td>${escapeHtml(d.carrier_name || '-')}</td>
            <td>${escapeHtml(d.line_type || '-')}</td>
            <td>${d.error_message ? `<span style="color:#f85149">Failed</span>` : '<span style="color:#3fb950">OK</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;

    const resetBtn = '<button onclick="document.getElementById(\'drop-zone\').classList.remove(\'hidden\');document.getElementById(\'bulk-result\').classList.add(\'hidden\');document.getElementById(\'csv-input\').value=\'\'" class="btn-primary" style="margin-top:1rem">Upload Another</button>';

    return summaryHtml + tableHtml + resetBtn;
  }

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
});
