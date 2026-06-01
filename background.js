// In-memory cache tracking traffic by Tab ID
const networkLogs = {};
const attachedTabs = new Set();

// Default domains
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('allowedDomains', (result) => {
    if (!result.allowedDomains || result.allowedDomains.length === 0) {
      chrome.storage.local.set({
        allowedDomains: []
      });
    }
  });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const { allowedDomains } = await chrome.storage.local.get('allowedDomains');
    const url = new URL(tab.url);
    
    // Check if current domain matches user's allowlist
    const isAllowed = allowedDomains?.some(domain => url.hostname.includes(domain));
    
    if (isAllowed) {
      if (!attachedTabs.has(tabId)) {
        startTracking(tabId, tab.url);
      } else {
        // Already tracking, just insert navigation marker
        if (networkLogs[tabId]) {
          networkLogs[tabId].push({
            type: 'NAVIGATE',
            url: tab.url,
            timestamp: Date.now() / 1000
          });
        }
      }
    }
  }
});

function startTracking(tabId, initialUrl) {
  const target = { tabId: tabId };
  
  chrome.debugger.attach(target, "1.3", () => {
    if (chrome.runtime.lastError) return;
    
    attachedTabs.add(tabId);
    networkLogs[tabId] = [{
      type: 'NAVIGATE',
      url: initialUrl,
      timestamp: Date.now() / 1000
    }];
    
    chrome.debugger.sendCommand(target, "Network.enable");
    
    // Listen for network events from the Chrome protocol
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (source.tabId !== tabId) return;

      // 1. Capture Request Payload & Headers
      if (method === "Network.requestWillBeSent") {
        networkLogs[tabId].push({
          requestId: params.requestId,
          url: params.request.url,
          method: params.request.method,
          resourceType: params.type,
          timestamp: params.wallTime,
          payload: params.request.postData || null,
          reqHeaders: params.request.headers || {}
        });
      }
      
      // 2. Capture Response Headers
      if (method === "Network.responseReceived") {
        if (networkLogs[tabId]) {
          const reqIdx = networkLogs[tabId].findIndex(r => r.requestId === params.requestId && r.type !== 'NAVIGATE');
          if (reqIdx !== -1) {
            networkLogs[tabId][reqIdx].resHeaders = params.response.headers || {};
            networkLogs[tabId][reqIdx].status = params.response.status;
          }
        }
      }

      // 3. Capture Response Body
      if (method === "Network.loadingFinished") {
        chrome.debugger.sendCommand(target, "Network.getResponseBody", { requestId: params.requestId }, (response) => {
          if (chrome.runtime.lastError) {
            // Body might be unavailable if it was a preflight OPTIONS request, cached, or purged.
            return;
          }
          if (response && networkLogs[tabId]) {
            const reqIdx = networkLogs[tabId].findIndex(r => r.requestId === params.requestId && r.type !== 'NAVIGATE');
            if (reqIdx !== -1) {
              networkLogs[tabId][reqIdx].response = response.body;
            }
          }
        });
      }
    });
  });
}

// Cleanup when detached (e.g. tab closed or user stops debugging)
chrome.debugger.onDetach.addListener((source, reason) => {
  attachedTabs.delete(source.tabId);
  delete networkLogs[source.tabId];
});

// Expose logs to the popup when clicked
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getLogs") {
    sendResponse({ logs: networkLogs[message.tabId] || [] });
  }
});
