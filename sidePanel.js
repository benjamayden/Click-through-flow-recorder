//sidePanel.js
let isRecording = false;
let clickLog = [];
let archivedLog = [];

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

let dragStartIndex;
let clickLogCopy = []; // To store a local copy of clickLog for dynamic updates

function displayLog(clickLog) {
  const logDiv = document.getElementById("log");
  logDiv.innerHTML = ""; // Clear previous log

  // Validate and filter logs
  const validLogs = clickLog.filter(
    (entry) => entry && typeof entry.isArchived !== "undefined"
  );
  const nonArchivedLogs = validLogs.filter((entry) => !entry.isArchived);

  if (clickLog.length === 0) {
    logDiv.textContent = "No logs recorded.";
    return;
  } else if (nonArchivedLogs.length === 0) {
    logDiv.textContent = "Archived logs only";
    return;
  }

  const uniqueIds = new Set();
  let dragStartIndex;
  let clickLogCopy = [...clickLog]; // Maintain a local copy for real-time updates

  // Render each log entry
  clickLog.forEach((entry, index) => {
    if (uniqueIds.has(entry.id) || entry.isArchived) return;
    uniqueIds.add(entry.id); // Track unique IDs

    const listItem = document.createElement("li");
    listItem.setAttribute("draggable", "true");
    listItem.setAttribute("data-index", index); // Set the current index
    listItem.classList.add("draggable-item");

    // Add drag event listeners
    listItem.addEventListener("dragstart", (event) => {
      dragStartIndex = index;
      listItem.classList.add("dragging"); // Add visual feedback
      event.dataTransfer.effectAllowed = "move";
    });

    listItem.addEventListener("dragover", (event) => {
      event.preventDefault(); // Allow dropping
      const draggingElement = document.querySelector(".dragging");
      const overElement = event.target.closest("li");

      if (!overElement || overElement === draggingElement) return;

      const overIndex = parseInt(overElement.getAttribute("data-index"), 10);

      if (overIndex > dragStartIndex) {
        overElement.after(draggingElement); // Move visually down
      } else {
        overElement.before(draggingElement); // Move visually up
      }

      // Update clickLogCopy in real-time
      if (dragStartIndex !== null && overIndex !== null) {
        const [movedItem] = clickLogCopy.splice(dragStartIndex, 1);
        clickLogCopy.splice(overIndex, 0, movedItem);
        dragStartIndex = overIndex; // Update start index for subsequent moves
      }
    });

    listItem.addEventListener("drop", (event) => {
      event.preventDefault();
      listItem.classList.remove("dragging");

      // Save the updated order to storage
      chrome.storage.local.set({ clickLog: clickLogCopy }, () => {
        displayLog(clickLogCopy); // Re-render the list
      });
    });

    listItem.addEventListener("dragend", () => {
      listItem.classList.remove("dragging");
      chrome.runtime.sendMessage({ action: 'updateFlowFromPanel' });
    });

    // UI Components
    const dragIcon = document.createElement("div");
    dragIcon.className = "icon-container";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "10");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 10 16");
    svg.setAttribute("fill", "none");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const dotPositions = [
      { cx: 2, cy: 2 },
      { cx: 2, cy: 8 },
      { cx: 2, cy: 14 },
      { cx: 8, cy: 2 },
      { cx: 8, cy: 8 },
      { cx: 8, cy: 14 },
    ];

    dotPositions.forEach((pos) => {
      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      circle.setAttribute("cx", pos.cx);
      circle.setAttribute("cy", pos.cy);
      circle.setAttribute("r", "2");
      circle.setAttribute("fill", "var(--color-grey-dark)");
      svg.appendChild(circle);
    });

    dragIcon.appendChild(svg);

    const imageContainer = document.createElement("div");
    imageContainer.className = "image-container";

    if (entry.dataUrl) {
      const imgElement = document.createElement("img");
      imgElement.src = entry.dataUrl;
      imageContainer.appendChild(imgElement);
    }

    const detailContainer = document.createElement("div");
    detailContainer.className = "container";

    const actionContainer = document.createElement("div");

    const elementName = document.createElement("div");
    elementName.classList.add("elementName");
    elementName.textContent = entry.elementText;

    const details = document.createElement("div");
    details.classList.add("elementDetails");

    const id = document.createElement("span");
    id.classList.add("elementId");
    id.textContent = `id: ${entry.id}`;

    const removeButton = document.createElement("button");
    removeButton.className = "destructive-btn remove-shot";
    removeButton.textContent = "X";

    removeButton.addEventListener("click", () => {
      const updatedLog = clickLogCopy.map(
        (logEntry) => logEntry.id === entry.id ? { ...logEntry, isArchived: true } : logEntry
      );
      chrome.storage.local.set({ clickLog: updatedLog }, () => {
        displayLog(updatedLog); // Re-render after removal
        chrome.runtime.sendMessage({ action: 'updateFlowFromPanel' });
      });
    });

    details.appendChild(id);
    detailContainer.appendChild(elementName);
    detailContainer.appendChild(details);
    actionContainer.appendChild(removeButton);

    listItem.appendChild(dragIcon);
    listItem.appendChild(imageContainer);
    listItem.appendChild(detailContainer);
    listItem.appendChild(actionContainer);

    logDiv.appendChild(listItem);
  });

  // Auto-scroll to the bottom if items were added
  if (logDiv.childElementCount > 0) {
    logDiv.lastElementChild.scrollIntoView({ behavior: "smooth" });
  }
}

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


// Consolidated onMessage handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    console.error("Invalid message received:", message);
    return;
  }

  switch (message.action) {
    case "keyboard_record":
      startRecording();
      break;

    case "keyboard_pause":
      updateRecordingState(false);
      break;

    case "refreshLog":
      chrome.storage.local.get(["clickLog"], (result) => {
        const updatedLog = result.clickLog || [];
        displayLog(updatedLog);
      });
      break;

    case "updatePanelFromFlow":
      displayLog([]);
      chrome.storage.local.get(["clickLog"], (result) => {
        displayLog(result.clickLog || []);
      });
      break;

    default:
      console.warn("Unhandled message action:", message.action);
  }

  // Optional: Send a response if needed
  if (sendResponse) {
    sendResponse({ status: "ok" });
  }
});


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
    }
  });


document.getElementById("clearLog").addEventListener("click", function () {
  const confirmDelete = confirm(
    "Are you sure you want to delete the log? This action is irreversible."
  );
  if (confirmDelete) {
    // Clear the log and flowTitle
    chrome.storage.local.set({ clickLog: [], flowTitle: "" }, function () {
      displayLog([]); // Clear the displayed log
      showToastMessage("Log and flow title cleared.");
      chrome.runtime.sendMessage({ action: 'updateFlowFromPanel' });
    });
  } else {
    // Action was cancelled, no need to do anything
    showToastMessage("Log deletion cancelled.");
  }
});

// Load and display the click log when the side panel opens
chrome.storage.local.get(["clickLog"], function (result) {
  displayLog(result.clickLog || []); // Ensure it's an array
});


document.getElementById('option-btn').addEventListener('click',()=>{
  const dropdownMenu = document.getElementById("dropdownMenu");
  dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
})

// Close dropdown when clicking outside
document.addEventListener("click", (event) => {
  const dropdown = document.querySelector(".dropdown");
  const dropdownMenu = document.getElementById("dropdownMenu");

  if (!dropdown.contains(event.target)) {
    dropdownMenu.style.display = "none";
  }
});