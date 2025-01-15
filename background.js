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

async function checkUrl() {
    // Get the current active tab
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Define allowed URL patterns using regular expressions
    let allowed = [
        /^http:\/\/iaptus\.internal\//,  // Matches http://iaptus.internal/*
        /^https:\/\/demo\.iaptus\.co\.uk\//  // Matches https://demo.iaptus.co.uk/*
    ];

    const currentUrl = currentTab?.url;

    let allowRecording = false;
    // If the URL doesn't match allowed patterns, show a toast message and exit
    if (allowed.length !== 0) {
        if (!currentUrl || !allowed.some(pattern => pattern.test(currentUrl))) {
            return allowRecording;
        }
    }
    allowRecording = true;
    return allowRecording;
}

const isAllowed = checkUrl();

if(isAllowed){

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'openFlowDisplay') {
            handleFlowTab(message.previousTabId);
            sendResponse({ status: "Flow Display opened" });
        } else if (message.action === 'goBack') {
            chrome.storage.local.get('previousTabId', function (data) {
                if (data.previousTabId) {
                    chrome.tabs.update(data.previousTabId, { active: true });
                    sendResponse({ status: "Returned to previous tab" });
                } else {
                    sendResponse({ status: "No previous tab found" });
                }
            });
        }
    
        // Return true to keep the message channel open for asynchronous response
        return true;
    });
// Function to handle the flow display tab logic
function handleFlowTab(previousTabId) {
    // Retrieve the ID of the flow display tab from local storage
    chrome.storage.local.get('flowDisplayTabId', function (data) {
        const existingTabId = data.flowDisplayTabId;

        if (existingTabId) {
            // Check if the flow display tab is still valid
            chrome.tabs.get(existingTabId, function (tab) {
                if (chrome.runtime.lastError || !tab) {
                    // If the tab is no longer valid, create a new flow display tab
                    createFlowTab(previousTabId);
                } else {
                    // Activate the existing flow display tab
                    chrome.tabs.update(existingTabId, { active: true });
                }
            });
        } else {
            // If no flow display tab exists, create a new one
            createFlowTab(previousTabId);
        }
    });
}

// Function to create a new flow display tab
function createFlowTab(previousTabId) {
    // Open a new tab with the URL for the flow display page
    chrome.tabs.create({ url: chrome.runtime.getURL('flowDisplay.html') }, function (newTab) {
        // Save the new tab's ID as the flow display tab ID and store the previous tab ID
        chrome.storage.local.set({ flowDisplayTabId: newTab.id, previousTabId });
    });
}

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "take_screenshot") {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id && isAllowed) {
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

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
    // Stop recording when the tab is changed
    chrome.storage.local.set({ isRecording: false }, () => {
        console.log("Recording stopped due to tab activation.");
    });
});

// Listen for tab updates (navigating or reloading)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // Check if the URL passes the allowed URL check before stopping recording
        chrome.storage.local.get('isRecording', (data) => {
            if (data.isRecording && tab.url) {
                // If recording is active and URL check fails, stop recording
                if (!isAllowed) {
                    chrome.storage.local.set({ isRecording: false }, () => {
                        console.log("Recording stopped due to tab update (URL check failed).");
                    });
                } else {
                    console.log("Recording continues because the URL is allowed.");
                }
            }
        });
    }
});

}