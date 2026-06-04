// In-memory cache tracking traffic by Tab ID
const networkLogs = {};
const sessionDetails = {}; // Stores { domain, url } for active tabs
const attachedTabs = new Set();

// Default domains (Empty for open source version)
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  }
  chrome.storage.local.get('allowedDomains', (result) => {
    if (!result.allowedDomains || !Array.isArray(result.allowedDomains)) {
      chrome.storage.local.set({ allowedDomains: [] });
    }
  });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const { allowedDomains } = await chrome.storage.local.get('allowedDomains');
    let url;
    try { url = new URL(tab.url); } catch(e) { return; }
    
    // Check if current domain matches user's allowlist
    const isAllowed = allowedDomains?.some(domain => url.host.includes(domain) || url.hostname.includes(domain));
    
    if (isAllowed) {
      if (!attachedTabs.has(tabId)) {
        startTracking(tabId, tab.url);
      } else {
        // Already tracking, update session details and insert navigation marker
        let domainName = 'Unknown Domain';
        try { domainName = new URL(tab.url).hostname; } catch(e) {}
        sessionDetails[tabId] = { domain: domainName, url: tab.url };

        if (networkLogs[tabId]) {
          networkLogs[tabId].push({
            type: 'NAVIGATE',
            url: tab.url,
            timestamp: Date.now() / 1000
          });
        }
      }
    } else {
      // Detach debugger if navigating away from allowed domains to stop random banners
      if (attachedTabs.has(tabId)) {
        chrome.debugger.detach({ tabId: tabId }, () => {
          if (chrome.runtime.lastError) {} // ignore
        });
        attachedTabs.delete(tabId);
        delete networkLogs[tabId];
        delete sessionDetails[tabId];
      }
    }
  }
});

function startTracking(tabId, initialUrl, callback) {
  const target = { tabId: tabId };
  
  chrome.debugger.attach(target, "1.3", () => {
    if (chrome.runtime.lastError) {
      if (callback) callback();
      return;
    }
    
    attachedTabs.add(tabId);
    
    let domainName = 'Unknown Domain';
    try { domainName = new URL(initialUrl).hostname; } catch(e) {}
    sessionDetails[tabId] = { domain: domainName, url: initialUrl };
    
    networkLogs[tabId] = [{
      type: 'NAVIGATE',
      url: initialUrl,
      timestamp: Date.now() / 1000
    }];
    
    chrome.debugger.sendCommand(target, "Network.enable", () => {
      if (callback) callback();
    });
  });
}

// Single Global Event Listener to prevent memory leaks and duplication
chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source.tabId;
  if (!attachedTabs.has(tabId) || !networkLogs[tabId]) return;

  // 1. Capture Request Payload & Headers
  if (method === "Network.requestWillBeSent") {
    const reqData = {
      requestId: params.requestId,
      url: params.request.url,
      method: params.request.method,
      resourceType: params.type,
      timestamp: params.wallTime,
      payload: params.request.postData || null,
      reqHeaders: params.request.headers || {}
    };
    networkLogs[tabId].push(reqData);

    // Fetch missing POST payload if Chrome didn't auto-attach it
    if (params.request.hasPostData && !params.request.postData) {
      chrome.debugger.sendCommand({ tabId }, "Network.getRequestPostData", { requestId: params.requestId }, (res) => {
        if (!chrome.runtime.lastError && res && res.postData) {
          const idx = networkLogs[tabId].findIndex(r => r.requestId === params.requestId && r.type !== 'NAVIGATE');
          if (idx !== -1) networkLogs[tabId][idx].payload = res.postData;
        }
      });
    }
  }
  
  // 2. Capture Response Headers
  if (method === "Network.responseReceived") {
    const reqIdx = networkLogs[tabId].findIndex(r => r.requestId === params.requestId && r.type !== 'NAVIGATE');
    if (reqIdx !== -1) {
      networkLogs[tabId][reqIdx].resHeaders = params.response.headers || {};
      networkLogs[tabId][reqIdx].status = params.response.status;
    }
  }

  // 3. Capture Response Body
  if (method === "Network.loadingFinished") {
    chrome.debugger.sendCommand({ tabId }, "Network.getResponseBody", { requestId: params.requestId }, (response) => {
      if (chrome.runtime.lastError) return;
      
      const reqIdx = networkLogs[tabId].findIndex(r => r.requestId === params.requestId && r.type !== 'NAVIGATE');
      if (reqIdx !== -1 && response) {
        networkLogs[tabId][reqIdx].response = response.body;
      }
    });
  }
});

// Cleanup when detached (e.g. tab closed, user stops debugging, or we detach manually)
chrome.debugger.onDetach.addListener((source, reason) => {
  attachedTabs.delete(source.tabId);
  // We explicitly do NOT delete networkLogs or sessionDetails here so that historical logs are retained.
});

// Expose logs and current tracking status to the popup when clicked
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getAllSessions") {
    const sessions = Array.from(attachedTabs).map(tabId => ({
      tabId: tabId,
      domain: sessionDetails[tabId]?.domain || 'Unknown Domain',
      url: sessionDetails[tabId]?.url || ''
    }));
    sendResponse({ sessions });
  } else if (message.action === "getLogs") {
    sendResponse({ 
      isTracking: attachedTabs.has(message.tabId),
      logs: networkLogs[message.tabId] || [] 
    });
  } else if (message.action === "startTracking") {
    if (!attachedTabs.has(message.tabId)) {
      startTracking(message.tabId, message.url, () => {
        sendResponse({ success: true });
      });
      return true; // Keep message channel open for async response
    } else {
      sendResponse({ success: true });
    }
  }
});
