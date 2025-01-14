//background.js
// Allowed URL patterns
const allowed = [
    /^http:\/\/iaptus\.internal\//, // Matches http://iaptus.internal/*
    /^https:\/\/demo\.iaptus\.co\.uk\// // Matches https://demo.iaptus.co.uk/*
];
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


function createNewTab() {
    chrome.tabs.create({ url: chrome.runtime.getURL('flowDisplay.html') }, function (newTab) {
        // Store the newly created tab ID for future use
        chrome.storage.local.set({ flowDisplayTabId: newTab.id });

        // Optionally, store the previous tab ID if recording is active
        chrome.storage.local.get('isRecording', function (recordingData) {
            if (recordingData.isRecording) {
                chrome.storage.local.set({ previousTabId: request.previousTabId });
            }
        });
    });
}

// Listener to handle messages from panel.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openFlowDisplay') {
        // Search for an existing tab with the flowDisplay.html URL
        chrome.storage.local.get('flowDisplayTabId', function (data) {
            if (data.flowDisplayTabId) {
                // Try to update and refresh the existing tab
                chrome.tabs.update(data.flowDisplayTabId, { active: true }, function (updatedTab) {
                    if (chrome.runtime.lastError) {
                        // If there was an error (e.g., the tab is no longer valid), create a new tab
                        console.error("Error updating tab:", chrome.runtime.lastError.message);
                        createNewTab();
                    } else {
                        chrome.tabs.reload(data.flowDisplayTabId); // Refresh the tab if update was successful
                    }
                });
            } else {
                // If no such tab exists, create a new tab
                createNewTab();
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
            if (tab && tab.id && isAllowedURL(tab.url)) {
                console.log('Keyboard shortcut triggered');

                // Send a message to the content script to get the highlighted text
                chrome.tabs.sendMessage(tab.id, { action: 'getHighlightedText' }, async (response) => {
                    const elementText = response?.elementText || tab.title; // Fallback to tab title if no response

                    // Capture screenshot
                    chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 100 }, function (dataUrl) {
                        const timestamp = new Date().toISOString();
                        const url = tab.url;
                        const newLogEntry = { id: Date.now(), elementText, url, timestamp, dataUrl };

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



// Check if a URL is allowed
function isAllowedURL(url) {
    return allowed.some((pattern) => pattern.test(url));
}

// Stop recording if the new tab or URL is not allowed
function checkAndStopRecording(tabId) {
    chrome.tabs.get(tabId, (tab) => {
        if (tab && tab.url) {
            if (isAllowedURL(tab.url)) {
                console.log("Tab is allowed:", tab.url);
                chrome.runtime.sendMessage({ action: 'changeToFlow' });
            } else {
                console.log("Tab is not allowed. Stopping recording:", tab.url);

                // Update recording state in storage
                chrome.storage.local.set({ isRecording: false }, () => {
                    chrome.runtime.sendMessage({ action: 'tabChanged' });
                    console.log("Recording stopped.");
                });

                // Optionally notify the content script to clean up listeners
                chrome.tabs.sendMessage(tabId, { action: 'stopRecording' }, () => {
                    if (chrome.runtime.lastError) {
                        console.log("Content script not active in this tab.");
                    }
                });
                chrome.runtime.sendMessage({ action: 'changeToFlow' });
            }
        }else{
            chrome.storage.local.get('flowDisplayTabId', function (data) {
                if (data.flowDisplayTabId) {
                    if (tab.id===data.flowDisplayTabId) {
                        chrome.runtime.sendMessage({ action: 'changeToBack' });
                    }
                }
            });
        }
    });
}

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
    checkAndStopRecording(activeInfo.tabId);
});

// Listen for tab updates (navigating or reloading)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        checkAndStopRecording(tabId);
    }
});

