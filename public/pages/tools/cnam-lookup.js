(function () {
  const esc = components.escapeHtml;
  const fmt = components.formatDate;

  app.register('#/tools/cnam', async function render(container) {
    container.innerHTML = `
      <div class="tool-page">
        <div class="tool-header">
          <a href="#/" class="back-link">Dashboard</a>
          <h2>CNAM Lookup</h2>
          <p class="subtitle">Phone number carrier & caller name lookup</p>
        </div>
        <nav class="tool-tabs">
          <button class="tab active" data-tab="cnam-single">Single Lookup</button>
          <button class="tab" data-tab="cnam-bulk">Bulk CSV</button>
          <button class="tab" data-tab="cnam-history">History</button>
        </nav>
        <section id="cnam-single" class="panel active">
          <form id="cnam-single-form">
            <div class="input-row">
              <input type="tel" id="cnam-phone" placeholder="Enter phone number (e.g. 2125551234)" required>
              <button type="submit" id="cnam-lookup-btn">Lookup</button>
            </div>
          </form>
          <div id="cnam-single-result" class="result-area hidden"></div>
        </section>
        <section id="cnam-bulk" class="panel hidden">
          <div class="upload-area" id="cnam-drop-zone">
            <p>Drag & drop a CSV file here, or click to select</p>
            <p class="hint">One phone number per row, first column. Max 500 numbers.</p>
            <input type="file" id="cnam-csv-input" accept=".csv" hidden>
          </div>
          <div id="cnam-bulk-progress" class="hidden">
            <div class="progress-bar"><div class="progress-fill" id="cnam-progress-fill"></div></div>
            <p id="cnam-progress-text">Processing...</p>
          </div>
          <div id="cnam-bulk-result" class="result-area hidden"></div>
        </section>
        <section id="cnam-history" class="panel hidden">
          <div class="history-controls">
            <input type="text" id="cnam-search" placeholder="Search by number, name, or carrier...">
            <button id="cnam-clear-history" class="btn-danger">Clear All</button>
          </div>
          <div id="cnam-history-table-wrap">
            <table><thead><tr>
              <th>Phone</th><th>Caller Name</th><th>Type</th><th>Carrier</th><th>Line Type</th><th>Date</th>
            </tr></thead><tbody id="cnam-history-body"></tbody></table>
          </div>
          <div id="cnam-pagination"></div>
        </section>
      </div>
    `;

    initTabs(container);
    initSingleLookup(container);
    initBulkUpload(container);
    initHistory(container);
  });

  function initTabs(container) {
    const tabs = container.querySelectorAll('.tool-tabs .tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        container.querySelectorAll('.panel').forEach((p) => { p.classList.remove('active'); p.classList.add('hidden'); });
        tab.classList.add('active');
        const panel = container.querySelector(`#${tab.dataset.tab}`);
        panel.classList.remove('hidden');
        panel.classList.add('active');
        if (tab.dataset.tab === 'cnam-history') loadHistory(container);
      });
    });
  }

  function initSingleLookup(container) {
    const form = container.querySelector('#cnam-single-form');
    const btn = container.querySelector('#cnam-lookup-btn');
    const result = container.querySelector('#cnam-single-result');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = container.querySelector('#cnam-phone').value.trim();
      if (!phone) return;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Looking up...';
      result.classList.remove('hidden');
      result.innerHTML = '<p style="color:#8b949e">Looking up number...</p>';

      const json = await api.post('/lookup/single', { phone });
      if (json.success) {
        result.innerHTML = renderResultCard(json.data);
      } else {
        result.innerHTML = `<div class="result-card"><p class="result-value error">${esc(json.error)}</p></div>`;
      }
      btn.disabled = false;
      btn.textContent = 'Lookup';
    });
  }

  function initBulkUpload(container) {
    const dropZone = container.querySelector('#cnam-drop-zone');
    const csvInput = container.querySelector('#cnam-csv-input');
    const progress = container.querySelector('#cnam-bulk-progress');
    const fill = container.querySelector('#cnam-progress-fill');
    const text = container.querySelector('#cnam-progress-text');
    const result = container.querySelector('#cnam-bulk-result');

    dropZone.addEventListener('click', () => csvInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]);
    });
    csvInput.addEventListener('change', () => { if (csvInput.files[0]) upload(csvInput.files[0]); });

    async function upload(file) {
      if (!file.name.endsWith('.csv')) { alert('Please upload a .csv file'); return; }
      dropZone.classList.add('hidden');
      progress.classList.remove('hidden');
      result.classList.add('hidden');
      fill.style.width = '10%';
      text.textContent = 'Uploading and processing...';

      const formData = new FormData();
      formData.append('file', file);

      fill.style.width = '30%';
      const json = await api.upload('/lookup/bulk', formData);
      fill.style.width = '100%';

      if (json.success) {
        text.textContent = 'Complete!';
        setTimeout(() => {
          progress.classList.add('hidden');
          result.classList.remove('hidden');
          result.innerHTML = renderBulkResults(json.data, json.summary, container);
        }, 500);
      } else {
        text.textContent = json.error;
        fill.style.background = '#f85149';
        setTimeout(() => resetBulk(container), 3000);
      }
    }
  }

  function resetBulk(container) {
    container.querySelector('#cnam-bulk-progress').classList.add('hidden');
    container.querySelector('#cnam-drop-zone').classList.remove('hidden');
    container.querySelector('#cnam-bulk-result').classList.add('hidden');
    container.querySelector('#cnam-progress-fill').style.width = '0%';
    container.querySelector('#cnam-progress-fill').style.background = '#1f6feb';
    container.querySelector('#cnam-csv-input').value = '';
  }

  function initHistory(container) {
    let currentPage = 1;
    let timeout = null;
    const search = container.querySelector('#cnam-search');
    const clearBtn = container.querySelector('#cnam-clear-history');

    search.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => { currentPage = 1; loadHistory(container); }, 400);
    });

    clearBtn.addEventListener('click', async () => {
      if (!confirm('Clear all lookup history?')) return;
      await api.del('/history');
      loadHistory(container);
    });

    window.__cnamPage = (page) => { currentPage = page; loadHistory(container); };
  }

  async function loadHistory(container) {
    const search = container.querySelector('#cnam-search')?.value.trim() || '';
    const body = container.querySelector('#cnam-history-body');
    const pag = container.querySelector('#cnam-pagination');
    const page = 1;

    const json = await api.get(`/history?page=${page}&limit=25&search=${encodeURIComponent(search)}`);
    if (!json.success) return;

    if (json.data.length === 0) {
      body.innerHTML = '<tr><td colspan="6" class="empty-state">No lookups yet</td></tr>';
      pag.innerHTML = '';
      return;
    }

    body.innerHTML = json.data.map((r) => `
      <tr>
        <td>${esc(r.phone_number || '-')}</td>
        <td>${esc(r.caller_name || '-')}</td>
        <td>${esc(r.caller_type || '-')}</td>
        <td>${esc(r.carrier_name || '-')}</td>
        <td>${esc(r.line_type || '-')}</td>
        <td>${fmt(r.looked_up_at)}</td>
      </tr>
    `).join('');

    const totalPages = Math.ceil(json.total / json.limit);
    pag.innerHTML = components.renderPagination(page, totalPages, 'window.__cnamPage');
  }

  function renderResultCard(d) {
    if (d.error_message) {
      return `<div class="result-card"><h3>${esc(d.phone_number)}</h3><p class="result-value error">${esc(d.error_message)}</p></div>`;
    }
    return `
      <div class="result-card">
        <h3>${esc(d.phone_number)}</h3>
        <div class="result-grid">
          <div class="result-item"><div class="result-label">Caller Name</div><div class="result-value">${esc(d.caller_name || 'N/A')}</div></div>
          <div class="result-item"><div class="result-label">Caller Type</div><div class="result-value">${esc(d.caller_type || 'N/A')}</div></div>
          <div class="result-item"><div class="result-label">Country</div><div class="result-value">${esc(d.country_code || 'N/A')}</div></div>
          <div class="result-item"><div class="result-label">Carrier</div><div class="result-value">${esc(d.carrier_name || 'N/A')}</div></div>
          <div class="result-item"><div class="result-label">Line Type</div><div class="result-value">${esc(d.line_type || 'N/A')}</div></div>
          <div class="result-item"><div class="result-label">MCC</div><div class="result-value">${esc(d.mobile_country_code || 'N/A')}</div></div>
          <div class="result-item"><div class="result-label">MNC</div><div class="result-value">${esc(d.mobile_network_code || 'N/A')}</div></div>
        </div>
      </div>`;
  }

  function renderBulkResults(data, summary, container) {
    const s = `
      <div class="summary-bar">
        <div class="summary-item"><div class="summary-num">${summary.total}</div><div class="summary-label">Total</div></div>
        <div class="summary-item"><div class="summary-num">${summary.processed}</div><div class="summary-label">Processed</div></div>
        <div class="summary-item"><div class="summary-num" style="color:#3fb950">${summary.successful}</div><div class="summary-label">Success</div></div>
        <div class="summary-item"><div class="summary-num" style="color:#f85149">${summary.failed}</div><div class="summary-label">Failed</div></div>
      </div>`;

    const t = `
      <table><thead><tr><th>Phone</th><th>Caller Name</th><th>Type</th><th>Carrier</th><th>Line Type</th><th>Status</th></tr></thead>
      <tbody>${data.map((d) => `
        <tr>
          <td>${esc(d.phone_number || '-')}</td><td>${esc(d.caller_name || '-')}</td>
          <td>${esc(d.caller_type || '-')}</td><td>${esc(d.carrier_name || '-')}</td>
          <td>${esc(d.line_type || '-')}</td>
          <td>${d.error_message ? '<span style="color:#f85149">Failed</span>' : '<span style="color:#3fb950">OK</span>'}</td>
        </tr>`).join('')}
      </tbody></table>`;

    return s + t + '<button class="btn-primary" style="margin-top:1rem" id="cnam-upload-another">Upload Another</button>';
  }
})();
