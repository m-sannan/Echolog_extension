let currentLogs = [];
let selectedLog = null;
let currentTab = "headers";
let currentDataToCopy = "";

let activeBrowserTab = null;
let currentlyViewingTabId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeBrowserTab = tab;
  
  chrome.runtime.sendMessage({ action: "getAllSessions" }, (response) => {
    const sessions = response?.sessions || [];
    const sessionSelector = document.getElementById('session-selector');
    const trackCurrentBtn = document.getElementById('track-current-btn');
    
    sessionSelector.innerHTML = '';
    let activeTabIsTracked = sessions.some(s => s.tabId === tab?.id);
    
    if (sessions.length > 0) {
      sessionSelector.classList.remove('hidden');
      sessions.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.tabId;
        opt.textContent = `${s.domain} (Tab ${s.tabId})`;
        sessionSelector.appendChild(opt);
      });
      
      if (activeTabIsTracked) {
        sessionSelector.value = tab.id;
        currentlyViewingTabId = tab.id;
        trackCurrentBtn.classList.add('hidden');
      } else {
        currentlyViewingTabId = sessions[0].tabId;
        sessionSelector.value = currentlyViewingTabId;
        if (tab) trackCurrentBtn.classList.remove('hidden');
      }
      
      loadLogsForTab(currentlyViewingTabId);
    } else {
      sessionSelector.classList.add('hidden');
      trackCurrentBtn.classList.add('hidden');
      currentlyViewingTabId = tab?.id;
      loadLogsForTab(currentlyViewingTabId);
    }
  });

  document.getElementById('session-selector').addEventListener('change', (e) => {
    currentlyViewingTabId = parseInt(e.target.value, 10);
    loadLogsForTab(currentlyViewingTabId);
  });

  function loadLogsForTab(tabId) {
    if (!tabId) return;
    chrome.runtime.sendMessage({ action: "getLogs", tabId: tabId }, (response) => {
      const emptyStateView = document.getElementById('empty-state-view');
      const splitPaneView = document.getElementById('split-pane-view');
      const domainBannerText = document.getElementById('domain-banner-text');
      const quickTrackBtn = document.getElementById('quick-track-btn');
      const toolbarActions = document.getElementById('toolbar-actions');
      
      if (response && response.isTracking) {
        emptyStateView.classList.add('hidden');
        emptyStateView.classList.remove('flex');
        splitPaneView.classList.remove('hidden');
        toolbarActions.classList.remove('opacity-50', 'pointer-events-none');
        
        let displayDomain = "this tab";
        const sessionOpt = document.querySelector(`#session-selector option[value="${tabId}"]`);
        if (sessionOpt) displayDomain = sessionOpt.textContent.split(' ')[0];
        
        domainBannerText.textContent = `Tracking: ${displayDomain}`;
        domainBannerText.className = "text-code-sm font-code-sm text-primary font-bold";
        quickTrackBtn.classList.add('hidden');
        
        currentLogs = response.logs || [];
      } else {
        emptyStateView.classList.remove('hidden');
        emptyStateView.classList.add('flex');
        splitPaneView.classList.add('hidden');
        toolbarActions.classList.add('opacity-50', 'pointer-events-none');
        currentLogs = [];
      }
      selectedLog = null;
      renderLogList();
      updateDetailView();
    });
  }

  const attachTracking = (e) => {
    if(e) e.preventDefault();
    if(!activeBrowserTab) return;
    const activeTab = activeBrowserTab;
    let domainToAdd;
    try { domainToAdd = new URL(activeTab.url).hostname; } catch(err) { return; }
    chrome.storage.local.get('allowedDomains', (result) => {
      const domains = result.allowedDomains || [];
      if (!domains.includes(domainToAdd)) {
        domains.push(domainToAdd);
        chrome.storage.local.set({ allowedDomains: domains }, () => {
           chrome.runtime.sendMessage({ action: "startTracking", tabId: activeTab.id, url: activeTab.url }, () => {
             window.close();
           });
        });
      } else {
        chrome.runtime.sendMessage({ action: "startTracking", tabId: activeTab.id, url: activeTab.url }, () => {
          window.close();
        });
      }
    });
  };

  document.getElementById('empty-track-btn').addEventListener('click', attachTracking);
  document.getElementById('quick-track-btn').addEventListener('click', attachTracking);
  document.getElementById('track-current-btn').addEventListener('click', attachTracking);

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
      document.querySelectorAll('.top-tab').forEach(el => {
        el.classList.remove('tab-active', 'font-bold');
        el.classList.add('text-on-surface-variant');
      });
      e.target.classList.add('tab-active', 'font-bold');
      e.target.classList.remove('text-on-surface-variant');
      currentTab = e.target.getAttribute('data-tab');
      updateDetailView();
    });
  });

  const settingsModal = document.getElementById('settings-modal');
  const domainsInput = document.getElementById('domains-input');

  const openSettings = () => {
    chrome.storage.local.get('allowedDomains', ({ allowedDomains }) => {
      if (allowedDomains) domainsInput.value = allowedDomains.join('\n');
      settingsModal.classList.remove('hidden');
    });
  };

  document.getElementById('open-settings').addEventListener('click', openSettings);
  document.getElementById('sidebar-settings-btn').addEventListener('click', openSettings);

  document.getElementById('close-settings').addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  document.getElementById('save-settings').addEventListener('click', () => {
    const domains = domainsInput.value.split('\n')
      .map(d => d.trim()).filter(Boolean)
      .map(d => {
        try { return d.startsWith('http') ? new URL(d).hostname : d.replace(/\/$/, ''); } 
        catch(e) { return d; }
      });
      
    chrome.storage.local.set({ allowedDomains: domains }, () => {
      settingsModal.classList.add('hidden');
    });
  });
});

function getStatusColorClass(status) {
  if (!status) return 'bg-secondary-fixed-dim';
  if (status >= 200 && status < 300) return 'bg-primary';
  if (status >= 400) return 'bg-error';
  return 'bg-[#eab308]'; 
}

function getStatusTextColorClass(status) {
  if (!status) return 'text-on-surface-variant';
  if (status >= 200 && status < 300) return 'text-primary';
  if (status >= 400) return 'text-error';
  return 'text-[#854d0e]';
}

function renderLogList() {
  const listContainer = document.getElementById('log-list');
  listContainer.innerHTML = '';

  const query = document.getElementById('search-bar').value.toLowerCase();
  const xhrOnly = document.getElementById('xhr-filter').checked;
  let hasItems = false;

  currentLogs.forEach((log) => {
    if (log.type === 'NAVIGATE') {
      const divider = document.createElement('div');
      divider.className = 'flex justify-center my-3';
      let displayUrl = log.url;
      try { displayUrl = new URL(log.url).pathname; } catch(e) {}
      divider.innerHTML = `<span class="bg-surface-container-high text-on-surface-variant font-label-caps text-label-caps px-4 py-1 rounded-full">NAVIGATED TO ${displayUrl}</span>`;
      listContainer.appendChild(divider);
      return;
    }

    if (xhrOnly && log.resourceType !== 'XHR' && log.resourceType !== 'Fetch') return;
    if (query && !log.url.toLowerCase().includes(query)) return;

    hasItems = true;

    const item = document.createElement('div');
    const isActive = selectedLog && selectedLog.requestId === log.requestId;
    
    item.className = `grid grid-cols-12 gap-2 px-3 py-1.5 border-b border-outline-variant/50 cursor-pointer transition-colors border-l-2 ${isActive ? 'bg-primary-container/10 border-primary' : 'hover:bg-surface-container-low border-transparent'}`;

    let displayUrl = log.url;
    try {
      const urlObj = new URL(log.url);
      displayUrl = urlObj.pathname.split('/').pop() || urlObj.pathname;
      if (!displayUrl || displayUrl === '/') displayUrl = urlObj.hostname;
    } catch (e) {}
    
    const dateObj = new Date(log.timestamp * 1000);
    const timeStr = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();
    
    const statusColor = getStatusColorClass(log.status);
    const statusText = getStatusTextColorClass(log.status);

    item.innerHTML = `
      <div class="col-span-5 truncate font-code-sm text-code-sm ${isActive ? 'text-primary font-bold' : 'text-on-surface'}" title="${log.url}">${displayUrl}</div>
      <div class="col-span-2 font-code-sm text-code-sm text-on-surface-variant">${log.method}</div>
      <div class="col-span-2 flex items-center gap-1.5">
        <div class="w-1.5 h-1.5 rounded-full ${statusColor}"></div>
        <span class="font-code-sm text-code-sm ${statusText} font-bold">${log.status || '...'}</span>
      </div>
      <div class="col-span-3 text-right font-code-sm text-code-sm text-on-surface-variant">${timeStr}</div>
    `;
    
    item.addEventListener('click', () => {
      selectedLog = log;
      renderLogList(); 
      updateDetailView();
    });

    listContainer.appendChild(item);
  });

  if (!hasItems) {
    listContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 opacity-30 select-none">
        <span class="material-symbols-outlined text-[48px] mb-2">network_check</span>
        <p class="text-body-sm font-bold">Waiting for requests...</p>
      </div>`;
  }
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return String(unsafe);
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function syntaxHighlightJSON(jsonStr) {
  try {
    const obj = JSON.parse(jsonStr);
    const pretty = JSON.stringify(obj, null, 2);
    return pretty.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'text-[#059669]'; 
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-[#8b5cf6]'; 
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-[#ea580c]'; 
      } else if (/null/.test(match)) {
        cls = 'text-on-surface-variant'; 
      } else {
        cls = 'text-[#2563eb]'; 
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
  } catch (e) {
    return escapeHtml(jsonStr);
  }
}

function renderHeadersList(headersObj) {
  if (!headersObj || Object.keys(headersObj).length === 0) return '<div class="text-on-surface-variant text-code-sm italic">None</div>';
  let html = '<div class="space-y-1.5 font-code-sm text-code-sm">';
  for (const [key, value] of Object.entries(headersObj)) {
    html += `
      <div class="flex gap-4">
        <span class="text-on-surface-variant w-32 flex-shrink-0">${key}:</span>
        <span class="text-on-surface break-all">${escapeHtml(value)}</span>
      </div>`;
  }
  html += '</div>';
  return html;
}

function updateDetailView() {
  const contentArea = document.getElementById('detail-content');
  const detailsTabs = document.getElementById('detail-tabs-container');
  currentDataToCopy = "";

  if (!selectedLog) {
    detailsTabs.style.display = 'none';
    contentArea.innerHTML = `
      <div class="flex items-center justify-center h-full text-on-surface-variant text-body-sm">
        Select a request to view details
      </div>`;
    return;
  }

  detailsTabs.style.display = 'flex';
  
  const getCopyButton = () => `
    <button id="copy-btn" class="flex items-center gap-1 px-2 py-1 bg-primary-container text-on-primary-container rounded text-label-caps font-bold hover:brightness-95 transition-all shadow-sm">
      <span class="material-symbols-outlined text-[14px]">content_copy</span>
      COPY ${currentTab.toUpperCase()}
    </button>`;

  if (currentTab === 'headers') {
    currentDataToCopy = JSON.stringify({
      url: selectedLog.url, method: selectedLog.method, status: selectedLog.status,
      requestHeaders: selectedLog.reqHeaders, responseHeaders: selectedLog.resHeaders
    }, null, 2);
    
    contentArea.innerHTML = `
      <section>
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-label-caps text-label-caps text-primary">GENERAL</h3>
          ${getCopyButton()}
        </div>
        <div class="space-y-1.5">
          <div class="flex border-b border-outline-variant/30 py-1">
            <span class="w-32 flex-shrink-0 text-code-sm text-on-surface-variant">Request URL:</span>
            <span class="text-code-sm text-on-surface break-all">${selectedLog.url}</span>
          </div>
          <div class="flex border-b border-outline-variant/30 py-1">
            <span class="w-32 flex-shrink-0 text-code-sm text-on-surface-variant">Method:</span>
            <span class="text-code-sm text-on-surface">${selectedLog.method}</span>
          </div>
          <div class="flex border-b border-outline-variant/30 py-1">
            <span class="w-32 flex-shrink-0 text-code-sm text-on-surface-variant">Status:</span>
            <span class="text-code-sm font-bold ${getStatusTextColorClass(selectedLog.status)}">${selectedLog.status || 'Pending'}</span>
          </div>
        </div>
      </section>
      <section class="mt-6">
        <h3 class="font-label-caps text-label-caps text-primary mb-3">RESPONSE HEADERS</h3>
        ${renderHeadersList(selectedLog.resHeaders)}
      </section>
      <section class="mt-6">
        <h3 class="font-label-caps text-label-caps text-primary mb-3">REQUEST HEADERS</h3>
        ${renderHeadersList(selectedLog.reqHeaders)}
      </section>
    `;
  } else {
    let rawContent = '';
    let isJson = false;

    if (currentTab === 'payload') {
      rawContent = selectedLog.payload;
    } else if (currentTab === 'preview') {
      rawContent = selectedLog.response;
      try { JSON.parse(rawContent); isJson = true; } catch(e) {}
    } else if (currentTab === 'response') {
      rawContent = selectedLog.response;
    }

    if (!rawContent) {
      contentArea.innerHTML = `<div class="text-on-surface-variant text-body-sm text-center py-8">No ${currentTab} data available</div>`;
      return;
    }

    currentDataToCopy = rawContent;

    if (currentTab === 'preview' && !isJson) {
      contentArea.innerHTML = `<div class="text-on-surface-variant text-body-sm text-center py-8">Response is not valid JSON. See Response tab.</div>`;
      return;
    }

    const title = currentTab === 'payload' ? 'REQUEST PAYLOAD' : (currentTab === 'preview' ? 'JSON PREVIEW' : 'RAW RESPONSE');
    let displayHtml = '';
    
    if (isJson || currentTab === 'payload') {
      try {
        JSON.parse(rawContent); 
        displayHtml = syntaxHighlightJSON(rawContent);
      } catch(e) {
        displayHtml = escapeHtml(rawContent);
      }
    } else {
      displayHtml = escapeHtml(rawContent);
    }

    contentArea.innerHTML = `
      <section>
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-label-caps text-label-caps text-primary">${title}</h3>
          ${getCopyButton()}
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl relative group shadow-sm">
          <pre class="code-block text-code-sm text-on-surface leading-relaxed overflow-x-auto">${displayHtml}</pre>
        </div>
      </section>
    `;
  }

  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (currentDataToCopy) {
        navigator.clipboard.writeText(currentDataToCopy);
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = `<span class="material-symbols-outlined text-[14px]">check</span> COPIED!`;
        setTimeout(() => copyBtn.innerHTML = originalHTML, 1500);
      }
    });
  }
}
