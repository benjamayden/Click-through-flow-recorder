let clickLog = [];
let id = 0;
let isRecording = false;

// Function to find text of clicked element, traversing up to parent if needed
function getElementText(element) {
  let text = "";
  if (element.getAttribute("aria-label")) {
    text = element.getAttribute("aria-label");
  } else if (element.textContent.trim() !== "") {
    text = element.innerText.trim();
  } else if (
    element.firstElementChild &&
    element.firstElementChild.innerText.trim() !== ""
  ) {
    text = element.firstElementChild.innerText.trim();
  } else if (
    element.parentElement &&
    element.parentElement.innerText.trim() !== ""
  ) {
    text = element.parentElement.innerText.trim();
  } else {
    text = prompt("Please enter the text for this element:");
  }
  return text;
}

// Function to remove duplicates from the log based on the id
function removeDuplicates(log) {
  const seen = new Set();
  return log.filter((entry) => {
    if (seen.has(entry.id)) {
      return false;
    }
    seen.add(entry.id);
    return true;
  });
}

// Listener for `isRecording` changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.isRecording) {
    isRecording = changes.isRecording.newValue;
    toggleRecording(isRecording);
  }
});

// Function to toggle event listeners based on `isRecording`
function toggleRecording(enable) {
  if (enable) {
    // Add event listeners
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    // document.addEventListener('mousedown', handleMouseDown);
  } else {
    // Remove event listeners
    document.removeEventListener("mouseover", handleMouseOver);
    document.removeEventListener("mouseout", handleMouseOut);
    // document.removeEventListener('mousedown', handleMouseDown);
  }
}

// Event listener functions
function handleMouseOver(event) {
  if (isRecording) {
    event.target.classList.add("highlight-stroke");
  }
}

function handleMouseOut(event) {
  if (isRecording) {
    event.target.classList.remove("highlight-stroke");
  }
}

function getShortenedText(text) {
  const words = text.split(/\s+/);
  if (words.length > 3) {
    return words.slice(0, 6).join(" ") + "..."; // Get the first four words and add "..."
  }
  return text; // Return the original text if 4 or fewer words
}

// Initial check for `isRecording` and setup event listeners accordingly
chrome.storage.local.get(["isRecording"], function (result) {
  isRecording = result.isRecording || false;
  toggleRecording(isRecording);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "captureComplete":
      handleCaptureComplete(message);
      break;
    case "getHighlightedText":
      handleGetHighlightedText(sendResponse);
      break;
    default:
      console.warn("Unhandled message action:", message.action);
  }
  return true; // Ensure async sendResponse works
});

// Handlers for each action
function handleCaptureComplete(request) {
  const { dataUrl, newLogEntry } = request;

  newLogEntry.dataUrl = dataUrl;
  chrome.storage.local.get("clickLog", function (result) {
    const updatedClickLog = result.clickLog || [];
    updatedClickLog.push(newLogEntry);

    const cleanedClickLog = removeDuplicates(updatedClickLog);

    // Save the cleaned log to storage
    chrome.storage.local.set({ clickLog: cleanedClickLog }, function () {
      try {
        chrome.runtime.sendMessage({ action: "refreshLog" });
      } catch (error) {
        console.warn("No active recipient for refreshLog:", error);
      }
    });
  });

  const toRemove = document.querySelectorAll(".highlight-stroke");
  toRemove.forEach((element) => element.classList.remove("highlight-stroke"));
}

// Listen for changes in local storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.hasOwnProperty("isRecording")) {
    const newValue = changes.isRecording.newValue;

    // If isRecording changes to false, stop recording and remove 'highlight-stroke' class from all elements
    if (newValue === false) {
      toggleRecording(newValue);

      // Select all elements with the 'highlight-stroke' class
      const highlightedElements =
        document.querySelectorAll(".highlight-stroke");

      // Remove the class from each element
      highlightedElements.forEach((element) => {
        element.classList.remove("highlight-stroke");
      });
    }
  }
});

function handleGetHighlightedText(sendResponse) {
  // Get the first element with the class "highlight-stroke"
  const highlightedElement = document.querySelector(".highlight-stroke");
  let text = "";
  // Check if the element exists
  if (!highlightedElement) {
    console.error("No element with the class 'highlight-stroke' found.");
    // Prompt user if no text can be extracted
    text = prompt("Please enter the text for this element:") || "";
    sendResponse({ elementText: text }); // Send an empty response if no element is found
    return;
  }


  // Determine the text content based on available properties
  if (highlightedElement.getAttribute("aria-label")) {
    text = highlightedElement.getAttribute("aria-label");
  } else if (highlightedElement.textContent.trim() !== "") {
    text = highlightedElement.textContent.trim();
  } else if (
    highlightedElement.firstElementChild &&
    highlightedElement.firstElementChild.textContent.trim() !== ""
  ) {
    text = highlightedElement.firstElementChild.textContent.trim();
  } else if (
    highlightedElement.parentElement &&
    highlightedElement.parentElement.textContent.trim() !== ""
  ) {
    text = highlightedElement.parentElement.textContent.trim();
  } else {
    // Prompt user if no text can be extracted
    text = prompt("Please enter the text for this element:") || "";
  }

  // Send the extracted or entered text
  sendResponse({ elementText: text });
}

