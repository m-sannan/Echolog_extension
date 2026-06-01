let currentLogs = [];
let selectedLog = null;
let currentTab = "headers"; // headers, payload, preview, response
let currentDataToCopy = ""; // Stores text for the copy button

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.runtime.sendMessage({ action: "getLogs", tabId: tab.id }, (response) => {
    const badge = document.getElementById('domain-badge');
    badge.style.display = 'block';
    
    if (response && response.isTracking) {
      let domainName = "this tab";
      try { domainName = new URL(tab.url).hostname; } catch(e) {}
      badge.textContent = `Tracking: ${domainName}`;
      badge.className = 'domain-badge';
      
      if (response.logs && response.logs.length > 0) {
        currentLogs = response.logs;
      }
    } else {
      badge.innerHTML = `Not tracking this tab. <a href="#" id="quick-track-btn" style="color: #8A4B00; text-decoration: underline; margin-left: 5px;">Track this domain</a>`;
      badge.className = 'domain-badge warning';
      
      setTimeout(() => {
        const quickBtn = document.getElementById('quick-track-btn');
        if (quickBtn) {
          quickBtn.addEventListener('click', (e) => {
            e.preventDefault();
            let domainToAdd;
            try { domainToAdd = new URL(tab.url).hostname; } catch(err) { return; }
            chrome.storage.local.get('allowedDomains', (result) => {
              const domains = result.allowedDomains || [];
              if (!domains.includes(domainToAdd)) {
                domains.push(domainToAdd);
                chrome.storage.local.set({ allowedDomains: domains }, () => {
                   chrome.tabs.reload(tab.id); // Reload tab to start tracking
                   window.close(); // Close popup
                });
              }
            });
          });
        }
      }, 0);
    }
    renderLogList();
  });

  document.getElementById('search-bar').addEventListener('input', renderLogList);
  document.getElementById('xhr-filter').addEventListener('change', renderLogList);
  
  document.getElementById('clear-logs').addEventListener('click', () => {
    currentLogs = [];
    selectedLog = null;
    renderLogList();
    updateDetailView();
  });

  document.querySelectorAll('.top-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.top-tab').forEach(el => el.classList.remove('active'));
      e.target.classList.add('active');
      currentTab = e.target.getAttribute('data-tab');
      updateDetailView();
    });
  });

  // Copy functionality
  document.getElementById('copy-btn').addEventListener('click', () => {
    if (currentDataToCopy) {
      navigator.clipboard.writeText(currentDataToCopy);
      const btn = document.getElementById('copy-btn');
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      setTimeout(() => btn.innerHTML = originalHTML, 1500);
    }
  });

  // Settings Modal
  const settingsModal = document.getElementById('settings-modal');
  const domainsInput = document.getElementById('domains-input');

  document.getElementById('open-settings').addEventListener('click', () => {
    chrome.storage.local.get('allowedDomains', ({ allowedDomains }) => {
      if (allowedDomains) domainsInput.value = allowedDomains.join('\n');
      settingsModal.style.display = 'flex';
    });
  });

  document.getElementById('close-settings').addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  document.getElementById('save-settings').addEventListener('click', () => {
    const domains = domainsInput.value.split('\n')
      .map(d => d.trim()).filter(Boolean)
      .map(d => {
        try { return d.startsWith('http') ? new URL(d).hostname : d.replace(/\/$/, ''); } 
        catch(e) { return d; }
      });
      
    chrome.storage.local.set({ allowedDomains: domains }, () => {
      settingsModal.style.display = 'none';
    });
  });
});

function renderLogList() {
  const listContainer = document.getElementById('log-list');
  const badge = document.getElementById('domain-badge');
  // keep the timeline background line and badge
  listContainer.innerHTML = '';
  if (badge) listContainer.appendChild(badge);
  
  const timelineBg = document.createElement('div');
  timelineBg.className = 'timeline-bg';
  listContainer.appendChild(timelineBg);

  const query = document.getElementById('search-bar').value.toLowerCase();
  const xhrOnly = document.getElementById('xhr-filter').checked;

  let hasItems = false;

  currentLogs.forEach((log) => {
    if (log.type === 'NAVIGATE') {
      const divider = document.createElement('div');
      divider.className = 'divider';
      let displayUrl = log.url;
      try { displayUrl = new URL(log.url).pathname; } catch(e) {}
      divider.textContent = `Navigated to ${displayUrl}`;
      divider.title = log.url;
      listContainer.appendChild(divider);
      return;
    }

    if (xhrOnly && log.resourceType !== 'XHR' && log.resourceType !== 'Fetch') return;
    if (query && !log.url.toLowerCase().includes(query)) return;

    hasItems = true;

    const item = document.createElement('div');
    item.className = 'log-item';
    if (selectedLog && selectedLog.requestId === log.requestId) {
      item.className += ' active';
    }

    let displayUrl = log.url;
    try {
      const urlObj = new URL(log.url);
      displayUrl = urlObj.pathname.split('/').pop() || urlObj.pathname;
      if (!displayUrl) displayUrl = urlObj.hostname;
    } catch (e) {}
    
    // Format time like "10:30:00 am"
    const dateObj = new Date(log.timestamp * 1000);
    let timeStr = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();

    item.innerHTML = `
      <div class="time">${timeStr}</div>
      <div class="timeline-dot"></div>
      <div class="log-title" title="${log.url}">${displayUrl}</div>
    `;
    
    item.addEventListener('click', () => {
      document.querySelectorAll('.log-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      selectedLog = log;
      updateDetailView();
    });

    listContainer.appendChild(item);
  });

  if (!hasItems && currentLogs.filter(l => l.type !== 'NAVIGATE').length === 0) {
    listContainer.innerHTML = '<div class="empty-state">No requests match</div>';
  }
}

function renderHeadersList(headersObj) {
  if (!headersObj || Object.keys(headersObj).length === 0) return '<div class="header-row"><div class="header-key">None</div></div>';
  let html = '';
  for (const [key, value] of Object.entries(headersObj)) {
    html += `<div class="header-row"><div class="header-key">${key}</div><div class="header-value">${escapeHtml(value)}</div></div>`;
  }
  return html;
}

function updateDetailView() {
  const contentArea = document.getElementById('detail-content');
  const detailsHeader = document.getElementById('details-header');
  const detailsTitle = document.getElementById('details-title');
  currentDataToCopy = ""; // Reset copy buffer

  if (!selectedLog) {
    detailsHeader.style.display = 'none';
    contentArea.innerHTML = '<div class="empty-state">Select a request to view details</div>';
    return;
  }

  detailsHeader.style.display = 'flex';
  
  let displayTitle = selectedLog.url;
  try { displayTitle = new URL(selectedLog.url).pathname; } catch (e) {}
  detailsTitle.textContent = displayTitle;
  detailsTitle.title = selectedLog.url;

  if (currentTab === 'headers') {
    currentDataToCopy = JSON.stringify({
      url: selectedLog.url, method: selectedLog.method, status: selectedLog.status,
      requestHeaders: selectedLog.reqHeaders, responseHeaders: selectedLog.resHeaders
    }, null, 2);
    
    contentArea.innerHTML = `
      <div class="header-section">
        <h4>General</h4>
        <div class="header-row"><div class="header-key">Request URL</div><div class="header-value">${selectedLog.url}</div></div>
        <div class="header-row"><div class="header-key">Request Method</div><div class="header-value">${selectedLog.method}</div></div>
        <div class="header-row"><div class="header-key">Status Code</div><div class="header-value">${selectedLog.status || 'Pending'}</div></div>
      </div>
      <div class="header-section">
        <h4>Response Headers</h4>
        ${renderHeadersList(selectedLog.resHeaders)}
      </div>
      <div class="header-section">
        <h4>Request Headers</h4>
        ${renderHeadersList(selectedLog.reqHeaders)}
      </div>
    `;
    return;
  }

  let codeContent = '';
  
  if (currentTab === 'payload') {
    if (!selectedLog.payload) {
      contentArea.innerHTML = '<div class="empty-state">No payload data</div>';
      return;
    }
    try {
      const parsed = JSON.parse(selectedLog.payload);
      codeContent = JSON.stringify(parsed, null, 2);
    } catch (e) {
      codeContent = selectedLog.payload;
    }
  } 
  else if (currentTab === 'preview') {
    if (!selectedLog.response) {
      contentArea.innerHTML = '<div class="empty-state">No response data</div>';
      return;
    }
    try {
      const parsed = JSON.parse(selectedLog.response);
      codeContent = JSON.stringify(parsed, null, 2);
    } catch (e) {
      contentArea.innerHTML = '<div class="empty-state">Response is not valid JSON. See Response tab.</div>';
      return;
    }
  } 
  else if (currentTab === 'response') {
    if (!selectedLog.response) {
      contentArea.innerHTML = '<div class="empty-state">No response data</div>';
      return;
    }
    codeContent = selectedLog.response;
  }
  
  currentDataToCopy = codeContent;
  contentArea.innerHTML = `<div class="code-view">${escapeHtml(codeContent)}</div>`;
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return String(unsafe);
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}
