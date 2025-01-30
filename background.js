//background.js

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ clickLog: [], isRecording: false });
});

let isRecording = false;
let allowedURLs;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.isRecording) {
    isRecording = changes.isRecording.newValue;
    chrome.contextMenus.update('take-screenshot', {
      visible: isRecording,
    });
    if(isRecording){
      chrome.contextMenus.update('record-flow', {
        title: "Stop capture",
      });
    }else{
      chrome.contextMenus.update('record-flow', {
        title: "Capture flow",
      });
    }

    
  }
});

// Set panel behavior to open on icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Variable to track the current tab ID
let currentTabId = null;
async function checkUrl() {
  // Get the current active tab
  const [currentTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  // Function to convert URL to a regex
  function urlToRegex(url) {
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape special characters
    return new RegExp(`^${escapedUrl}`);
  }

  // Get the current tab's URL
  const currentUrl = currentTab?.url;

  // Fetch allowed URLs from storage
  const data = await chrome.storage.local.get("allowedURLs");
  const allowedURLs = data.allowedURLs || [];

  // Convert allowed URLs into regex patterns
  const allowedPatterns = allowedURLs.map(urlToRegex);

  // Initialise recording permission
  let allowRecording = false;

  // Check if the current URL matches any of the allowed patterns
  if (allowedPatterns.length !== 0) {
    if (
      !currentUrl ||
      !allowedPatterns.some((pattern) => pattern.test(currentUrl))
    ) {
      // If no match, return false
      return allowRecording;
    }
  }

  // If the URL matches, set allowRecording to true
  allowRecording = true;
  return allowRecording;
}
// Listen for the panel closing
chrome.runtime.onConnect.addListener( async (port) => {
  if (port.name === "sidePanel") {
    let isAllowed = await checkUrl();
    if (isAllowed) {
      // Get the active tab to refresh when needed
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          currentTabId = tabs[0].id;
          chrome.tabs.reload(currentTabId);
        }
      });
    }

    port.onDisconnect.addListener(() => {
      console.log("Side panel was closed");
      if (isRecording) {
      
        // Stop recording by updating storage
        chrome.storage.local.set({ isRecording: false }, () => {
          chrome.runtime.sendMessage({ action: "keyboard_pause" });

          // Refresh the current tab if available
          if (currentTabId !== null) {
            chrome.tabs.reload(currentTabId);
            currentTabId = null; // Reset tab ID after refresh
          }
        });
      }
    });
  }
});

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  // If we have a variable or a storage value that says we are recording:
  if (isRecording) {
    // Stop recording
    chrome.storage.local.set({ isRecording: false }, () => {
      chrome.runtime.sendMessage({ action: "keyboard_pause" });
      console.log("Recording stopped due to tab change.");
    });
  }
});

// Listen for tab updates (navigating or reloading)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    // Check if the URL passes the allowed URL check before stopping recording

    if (isRecording && tab.url) {
      let isAllowed = await checkUrl();
      // If recording is active and URL check fails, stop recording
      if (!isAllowed) {
        chrome.storage.local.set({ isRecording: false }, () => {
          console.log(
            "Recording stopped due to tab update (URL check failed)."
          );
        });
      } else {
        console.log("Recording continues because the URL is allowed.");
      }
    }
  }
});


// Listen for incoming messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openFlowDisplay") {
    // Handle flow display logic
    handleFlowTab(message.previousTabId);
    sendResponse({ status: "Flow Display opened" });
  } else if (message.action === "openOptions") {
    openOrFocusOptionsTab();
  } else if (message.action === "updateFlowFromPanel") {
    chrome.storage.local.get("flowDisplayTabId", function (result) {
      if (result.flowDisplayTabId) {
        chrome.tabs.get(result.flowDisplayTabId, function(tab) {
          if (tab) {
            chrome.tabs.reload(result.flowDisplayTabId);
          }
        });
      }
    });
  } else if (message.action === "captureScreen") {
    chrome.tabs.captureVisibleTab(
      null,
      { format: "png", quality: 100 },
      function (dataUrl) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "captureComplete",
          dataUrl: dataUrl,
          newLogEntry: message.newLogEntry,
        });
      }
    );
  }
});

// Function to handle the flow display tab logic
function handleFlowTab(previousTabId) {
  chrome.storage.local.get("flowDisplayTabId", function (data) {
    const existingTabId = data.flowDisplayTabId;
    const expectedUrl = chrome.runtime.getURL("flowDisplay.html");

    if (existingTabId) {
      chrome.tabs.get(existingTabId, function (tab) {
        if (chrome.runtime.lastError || !tab || tab.url !== expectedUrl) {
          // Create new tab if invalid or URL doesn't match
          createFlowTab(previousTabId);
        } else {
          // Focus existing tab
          chrome.tabs.update(existingTabId, { active: true });
        }
      });
    } else {
      // No tab exists, create a new one
      createFlowTab(previousTabId);
    }
  });
}

// Function to create a new flow display tab
function createFlowTab(previousTabId) {
  const flowDisplayUrl = chrome.runtime.getURL("flowDisplay.html");
  chrome.tabs.create({ url: flowDisplayUrl, active: true }, function (newTab) {
    chrome.storage.local.set({ flowDisplayTabId: newTab.id, previousTabId });
  });
}

// Clean up storage when the flow display tab is closed
chrome.tabs.onRemoved.addListener(function (tabId) {
  chrome.storage.local.get("flowDisplayTabId", function (data) {
    if (data.flowDisplayTabId === tabId) {
      chrome.storage.local.remove("flowDisplayTabId");
    }
  });
});

// Function to open or focus the options page
function openOrFocusOptionsTab() {
  const optionsPage = chrome.runtime.getURL("options.html");
  chrome.tabs.query({ url: optionsPage }, function (tabs) {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      chrome.tabs.create({ url: optionsPage, active: true });
    }
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "take_screenshot") {
    let isAllowed = await checkUrl();
    takeScreenShoot(isAllowed);

  } else if (command === "toggle_recording") {
    if (isRecording) {
      chrome.runtime.sendMessage({ action: "keyboard_pause" });
    } else {
      chrome.runtime.sendMessage({ action: "keyboard_record" });
    }
  }
});


  chrome.contextMenus.create({
    id: "take-screenshot",
    title: "Take Screenshot",
    contexts: ["all"],
    documentUrlPatterns: ["<all_urls>"],
    visible: isRecording,
  });


chrome.contextMenus.create({
  id: "record-flow",
  title: "Record flow",
  contexts: ["all"],
  documentUrlPatterns: ["<all_urls>"],
});

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  let isAllowed = await checkUrl();

  if (info.menuItemId === "take-screenshot") {
    if (isAllowed && isRecording) {
      takeScreenShoot(isAllowed);
    }
  } else if (info.menuItemId === "record-flow") {
    if (isAllowed && !isRecording) {
      // 1. Open side panel (correctly)

      // Open the side panel in the current window
      chrome.sidePanel.open({ windowId: tab.windowId });
      // 2. Send message to start recording
      chrome.runtime.sendMessage({ action: "keyboard_record" });
    }else{
      chrome.runtime.sendMessage({ action: "keyboard_pause" });
    }
  }
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
if (info.menuItemId === "record-flow") {
    if (!isRecording) {
      try{
      chrome.sidePanel.open({ windowId: tab.windowId });
      }catch(err){console.log(err)}
      // 2. Send message to start recording
      chrome.runtime.sendMessage({ action: "keyboard_record" });
    }
  }
});

async function takeScreenShoot(isAllowed) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.id && isAllowed && isRecording) {
      // Send a message to the content script to get the highlighted text
      chrome.tabs.sendMessage(
        tab.id,
        { action: "getHighlightedText" },
        async (response) => {
          const elementText = response?.elementText || tab.title; // Fallback to tab title if no response

          // Capture screenshot
          chrome.tabs.captureVisibleTab(
            null,
            { format: "png", quality: 100 },
            function (dataUrl) {
              const timestamp = new Date().toISOString();
              const url = tab.url;
              const newLogEntry = {
                id: Date.now(),
                elementText,
                url,
                timestamp,
                dataUrl,
                isArchived: false,
                originalImage: dataUrl,
              };

              // Store the log entry in local storage
              chrome.storage.local.get("clickLog", function (result) {
                const updatedClickLog = result.clickLog || [];
                updatedClickLog.push(newLogEntry);

                chrome.storage.local.set(
                  { clickLog: updatedClickLog },
                  function () {
                    chrome.runtime.sendMessage({ action: "refreshLog" });
                    console.log("Screenshot log saved");
                  }
                );
              });
            }
          );
        }
      );
    }
  } catch (error) {
    console.error("Error capturing screenshot:", error);
  }
}


