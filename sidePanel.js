//sidePanel.js
let isRecording = false;

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.isRecording) {
    isRecording = changes.isRecording.newValue;
    updateRecordingState(isRecording);
    if (isRecording) {
      showToastMessage("Recording started!");
    } else {
      showToastMessage("Recording paused!");
    }
  }
});

// Centralized function to update storage and UI
function updateRecordingState(isRecording) {
  chrome.storage.local.set({ isRecording }, function () {
    if (isRecording) {
      updateRecordingButtons({ recording: true }); // Show "Pause", hide "Record"
    } else {
      updateRecordingButtons({ recording: false }); // Show "Record", hide "Pause"
    }
  });
}

// Start recording function (with URL check)
async function startRecording() {
  const isAllowed = await checkUrl();
  if (!isAllowed) {
    showToastMessage(`url not allowed: `, "Configure in options", () => {
      chrome.runtime.sendMessage({ action: "openOptions" });
    });
    return false; // Abort if URL is not allowed
  }

  if (!isRecording) {
    const [currentTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    chrome.storage.local.set({
      previousTabId: currentTab.id, // Save the tab as the starting point
    });
    updateRecordingState(true);
  }

  return true; // Recording is allowed
}

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

function showToastMessage(message, clickableElement = null, onClick = null) {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  // Create a new toast
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = message; // Use innerHTML to allow adding HTML elements
  toastContainer.appendChild(toast);

  // Add clickable element if provided
  if (clickableElement && onClick) {
    const clickable = document.createElement("span");
    clickable.className = "toast-clickable";
    clickable.textContent = clickableElement;
    // Attach the click event
    clickable.addEventListener("click", onClick);

    // Append the clickable element to the toast
    toast.appendChild(clickable);
  }

  // Show the toast after a brief delay
  setTimeout(() => {
    toastContainer.classList.add("show");
    toast.classList.add("show");
  }, 100);

  // Remove the toast after 5 seconds (3 seconds + extra 2 seconds)
  setTimeout(() => {
    toastContainer.classList.remove("show");
    toast.classList.remove("show");

    // Remove the toast element from the DOM
    setTimeout(() => {
      toast.remove();
      // If no more toasts remain, remove the container
      if (toastContainer.children.length === 0) {
        setTimeout(() => {
          toastContainer.remove();
        }, 900);
      }
    }, 500); // Wait for the fade-out animation to finish
  }, 5000); // Total time for the toast (3 seconds + 2 seconds delay)
}

// Notify the background script when the panel opens
chrome.runtime.sendMessage({ action: "openPanel" });

const port = chrome.runtime.connect({ name: "sidePanel" });

function getShortenedText(text) {
  const words = text.split(/\s+/);
  if (words.length > 3) {
    return words.slice(0, 3).join(" ") + "..."; // Get the first four words and add "..."
  }
  return text; // Return the original text if 4 or fewer words
}

// Function to remove duplicates from the log based on the id
function removeDuplicates(log) {
  const seen = new Set();
  return log.filter((entry) => {
    if (seen.has(entry.id)) {
      return false; // Duplicate found, skip this entry
    }
    seen.add(entry.id);
    return true; // Keep the first instance of this entry
  });
}

function displayLog(clickLog) {
  const logDiv = document.getElementById("log");
  logDiv.innerHTML = ""; // Clear previous log

  // Check if there are any non-archived entries
  const nonArchivedLogs = clickLog.filter((entry) => !entry.isArchived);

  if (clickLog.length === 0) {
    logDiv.textContent = "No logs recorded.";
    document.getElementById("clearLog").style.display = "none";
    document.getElementById("footer").style.display = "none";
    return;
  } else if (nonArchivedLogs.length === 0) {
    logDiv.textContent = "Archived logs only";
    return;
  }
  document.getElementById("clearLog").style.display = "flex";
  document.getElementById("footer").style.display = "flex";
  // Create a Set to keep track of unique IDs
  const uniqueIds = new Set();
  // Create a list to display log entries
  const list = document.createElement("ul");

  clickLog.forEach((entry) => {
    if (uniqueIds.has(entry.id)) {
      return; // Skip this entry if the ID has already been processed
    }
    if (entry.isArchived) {
      return;
    }
    uniqueIds.add(entry.id); // Add the ID to the set

    const listItem = document.createElement("li");

    const imageContainer = document.createElement("div");
    imageContainer.className = "image-container";
    if (entry.dataUrl !== '') {
        const imgElement = document.createElement('img');
        imgElement.src = entry.dataUrl || 'placeholder.png';
        imageContainer.appendChild(imgElement); // Ensure this line is within the same scope
    }

    const detailContainer = document.createElement("div");
    detailContainer.className = "container";


    const actionContainer = document.createElement("div");


    // Create and append the element name
    const elementName = document.createElement("div");
    elementName.classList.add("elementName");
    elementName.textContent = getShortenedText(entry.elementText);

    // Create and append the details div
    const details = document.createElement("div");
    details.classList.add("elementDetails");

    // Create and append the ID
    const id = document.createElement("span");
    id.classList.add("elementId");
    id.textContent = `id: ${entry.id}`;

    const removeButton = document.createElement("button");
    removeButton.className = "destructive-btn remove-shot";
    removeButton.innerText = "X";

    removeButton.addEventListener("click", function () {
      const updatedLog = clickLog.filter(
        (logEntry) => logEntry.id !== entry.id
      );

      chrome.storage.local.set({ clickLog: updatedLog }, function () {
        displayLog(updatedLog);
      });
    });

    // Append the id and link to the details div
    details.appendChild(id);

    // Append the name and details to the list item
    detailContainer.appendChild(elementName);
    detailContainer.appendChild(details);
    actionContainer.appendChild(removeButton);
    listItem.appendChild(imageContainer);
    listItem.appendChild(detailContainer);
    listItem.appendChild(actionContainer);
    // Append the list item to the list
    list.appendChild(listItem);
  });

  logDiv.appendChild(list);
}

// Function to remove duplicates from the log
function removeDuplicates(log) {
  const seen = new Set();
  return log.filter((entry) => {
    const uniqueKey = `${entry.elementText}-${entry.url}-${entry.timestamp}`;
    if (seen.has(uniqueKey)) {
      return false; // Duplicate found, skip this entry
    }
    seen.add(uniqueKey);
    return true; // Add new entry
  });
}

// Add event listener for "Pause Recording"
document.getElementById("pauseRecording").addEventListener("click", () => {
  updateRecordingState(false); // Pause recording
});

// Add event listener for "Start Recording"
document.getElementById("startRecording").addEventListener("click", () => {
  startRecording();
});

// Listen for 'toggle_recording' message from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "keyboard_record") {
    startRecording();
  } else if (message.action === "keyboard_pause") {
    updateRecordingState(false); // Pause recording
  }
});

// Utility function to update the visibility of "View Flow" and "Back" buttons
function updateFlowButtons({ showFlow = true }) {
  const openFlowButton = document.getElementById("openFlow"); // "View Flow" button
  const backButton = document.getElementById("backButton"); // "Back" button
  // Show or hide the "View Flow" button based on `showFlow` flag
  if (openFlowButton) openFlowButton.style.display = showFlow ? "flex" : "none";
  // Show or hide the "Back" button based on `showFlow` flag
  if (backButton) backButton.style.display = showFlow ? "none" : "flex";
}

// Utility function to update the visibility and state of "Record" and "Pause" buttons
function updateRecordingButtons({ recording = true }) {
  const recordButton = document.getElementById("startRecording"); // "Start Recording" button
  const pauseButton = document.getElementById("pauseRecording"); // "Pause Recording" button
  const instructions = document.getElementById("instructions"); // Instructions for shortcut

  // Set the correct keyboard shortcut based on the OS
  let text = "Ctrl";
  chrome.runtime.getPlatformInfo(function (info) {
    if (info.os === "mac") {
      text = "Command";
    }
  });
  const shortCutButtons = Array.from(
    document.getElementsByClassName("shortcutButtons")
  );
  shortCutButtons.forEach((shortCut) => {
    shortCut.innerText = text;
  });

  // Update the instructions with the keyboard shortcut
  if (instructions) {
    instructions.style.display = recording ? "block" : "none";
  }

  // Show or hide the "Record" and "Pause" buttons based on the `recording` flag
  if (recordButton) recordButton.style.display = recording ? "none" : "flex";
  if (pauseButton) pauseButton.style.display = recording ? "flex" : "none";
}

document
  .getElementById("openFlow")
  ?.addEventListener("click", async function () {
    // Get the currently active tab in the current window
    const [currentTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (currentTab) {
      const isAllowed = await checkUrl();
      let previousTabId = null;

      if (isAllowed) {
        previousTabId = currentTab.id;
      } else {
        const storedData = await new Promise((resolve) => {
          chrome.storage.local.get(["previousTabId"], resolve);
        });
        previousTabId = storedData.previousTabId || null;
      }
      if (isRecording) {
        chrome.storage.local.set({ previousTabId, isRecording: false });
        updateRecordingButtons({ recording: false });
      }
      chrome.runtime.sendMessage({ action: "openFlowDisplay", previousTabId });
      updateFlowButtons({ showFlow: false });
    }
  });

document.getElementById("backButton")?.addEventListener("click", function () {
  chrome.runtime.sendMessage({ action: "goBack" }, (response) => {
    updateFlowButtons({ showFlow: true });
  });
});

document.getElementById("clearLog").addEventListener("click", function () {
  const confirmDelete = confirm(
    "Are you sure you want to delete the log? This action is irreversible."
  );
  if (confirmDelete) {
    // Clear the log and flowTitle
    chrome.storage.local.set({ clickLog: [], flowTitle: "" }, function () {
      displayLog([]); // Clear the displayed log
      console.log("Log and flow title cleared.");
    });
  } else {
    // Action was cancelled, no need to do anything
    console.log("Log deletion cancelled.");
  }
});

// Load and display the click log when the side panel opens
chrome.storage.local.get(["clickLog"], function (result) {
  displayLog(result.clickLog || []); // Ensure it's an array
});

// Listen for messages from content.js to refresh the log display
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "refreshLog") {
    // Retrieve the updated log from storage and display it
    chrome.storage.local.get(["clickLog"], function (result) {
      const updatedLog = result.clickLog || [];
      displayLog(updatedLog); // Update the display with the latest log
    });
  }
});

// Listen for messages from content script to update log dynamically
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updatePanelFromFlow") {
    displayLog([]);
    chrome.storage.local.get(["clickLog"], function (result) {
      displayLog(result.clickLog || []); // Ensure it's an array
    });
  }
});
