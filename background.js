//background.js

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ clickLog: [], isRecording: false });
});

// Set panel behavior to open on icon click
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Variable to track the current tab ID
let currentTabId = null;

// Listen for the panel opening and log message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openPanel') {
        console.log("Side panel opened");
        
        // Get the active tab to refresh when needed
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                currentTabId = tabs[0].id;
                chrome.tabs.reload(currentTabId);
                console.log("page reloaded")
            }
        });
    }
});

// Listen for the panel closing
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "sidePanel") {
        port.onDisconnect.addListener(() => {
            console.log("Side panel was closed");

            // Stop recording by updating storage
            chrome.storage.local.set({ isRecording: false }, () => {
                console.log("Recording stopped");

                // Refresh the current tab if available
                if (currentTabId !== null) {
                    chrome.tabs.reload(currentTabId);
                    currentTabId = null; // Reset tab ID after refresh
                }
            });
        });
    }
});


// Listen for tab updates (new page loads, navigations)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // Check if recording is active, then inject the content script
        chrome.storage.local.get('isRecording', function (data) {
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
    chrome.storage.local.get('isRecording', function (data) {
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
                chrome.tabs.update(tabs[0].id, { active: true }, function () {
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

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "take_screenshot") {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id) {
                console.log('Keyboard shortcut triggered');

                // Capture screenshot
                chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 100 }, function (dataUrl) {
                    const timestamp = new Date().toISOString();
                    const url = tab.url;
                    const title = tab.title;
                    const newLogEntry = { id: Date.now(), elementText: title, url, timestamp, dataUrl };

                    // Store the log entry in local storage
                    chrome.storage.local.get('clickLog', function (result) {
                        const updatedClickLog = result.clickLog || [];
                        updatedClickLog.push(newLogEntry);

                        chrome.storage.local.set({ clickLog: updatedClickLog }, function () {
                            chrome.runtime.sendMessage({ action: 'refreshLog' });
                            console.log("Screenshot log saved");
                        });

                    });
                });
            }
        } catch (error) {
            console.error("Error capturing screenshot:", error);
        }
    }
});




chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'captureScreen') {
        chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 100 }, function (dataUrl) {
            // Send the captured image back to the content script
            chrome.tabs.sendMessage(sender.tab.id, { action: 'captureComplete', dataUrl: dataUrl, newLogEntry: message.newLogEntry });
        });
    }
});
