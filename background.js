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
  

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'captureScreen') {
        chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 100 }, function (dataUrl) {
            // Send the captured image back to the content script
            console.log(dataUrl)
            chrome.tabs.sendMessage(sender.tab.id, { action: 'captureComplete', dataUrl: dataUrl, newLogEntry: message.newLogEntry});
        });
    }
});