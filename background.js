chrome.runtime.onInstalled.addListener(() => {
    // Initialize storage on install
    chrome.storage.local.set({ clickLog: [], isRecording: false });
});


chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error))

// Listen for tab updates (new page loads, navigations)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      // Check if recording is active, then inject the content script
      chrome.storage.local.get('isRecording', function(data) {
        if (data.isRecording) {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          });
        }
      });
    }
  });
  
  // Listen for tab activation (when user switches to a new tab)
  chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.storage.local.get('isRecording', function(data) {
      if (data.isRecording) {
        chrome.scripting.executeScript({
          target: { tabId: activeInfo.tabId },
          files: ['content.js']
        });
      }
    });
  });
  
// Listener to handle messages from panel.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openFlowDisplay') {
      // Search for an existing tab with the flowDisplay.html URL
      chrome.tabs.query({ url: chrome.runtime.getURL('flowDisplay.html') }, function (tabs) {
          if (tabs.length > 0) {
              // If the tab already exists, switch to it and refresh it
              chrome.tabs.update(tabs[0].id, { active: true }, function() {
                  chrome.tabs.reload(tabs[0].id);  // Refresh the tab
              });
          } else {
              // If no such tab exists, create a new tab
              chrome.tabs.create({ url: chrome.runtime.getURL('flowDisplay.html') }, function (newTab) {
                  // Store the previous tab ID for later reference
                  chrome.storage.local.set({ previousTabId: request.previousTabId });
              });
          }
      });
  } else if (request.action === 'goBack') {
      chrome.storage.local.get('previousTabId', function (data) {
          if (data.previousTabId) {
              chrome.tabs.update(data.previousTabId, { active: true });
          }
      });
  }
});




  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'captureScreen') {
        chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 100 }, function (dataUrl) {
            // Send the captured image back to the content script
            console.log(dataUrl)
            chrome.tabs.sendMessage(sender.tab.id, { action: 'captureComplete', dataUrl: dataUrl, newLogEntry: message.newLogEntry});
        });
    }
});