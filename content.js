// Initialize click log array
let clickLog = [];

// Function to find text of clicked element, traversing up to parent if needed
function getElementText(element) {
    while (element && element.textContent.trim() === '') {
        element = element.parentElement;
    }
    return element ? element.textContent.trim() : '';
}

// Function to remove duplicates from the log
function removeDuplicates(log) {
    const seen = new Set();
    return log.filter(entry => {
        const uniqueKey = `${entry.elementText}-${entry.url}-${entry.timestamp}`;
        if (seen.has(uniqueKey)) {
            return false; // Duplicate found, skip this entry
        }
        seen.add(uniqueKey);
        return true; // Add new entry
    });
}

// Add event listener for clicks on the page
document.addEventListener('click', function(event) {
    let clickedElement = event.target;

    // Get the text content of the clicked element
    let elementText = getElementText(clickedElement);
    let url = window.location.href;
    let timestamp = new Date().toISOString();

    // Log click only if recording is enabled
    chrome.storage.local.get(['isRecording', 'clickLog'], function(result) {
        if (result.isRecording) {
            // Clean element text for CSV
            elementText = elementText.replace(/,/g, ''); // Remove commas

            // Prepare new log entry
            const newLogEntry = { elementText, url, timestamp };

            // Append to existing log or create a new array if none exists
            const updatedClickLog = result.clickLog || [];
            updatedClickLog.push(newLogEntry);

            // Remove duplicates before storing
            const cleanedClickLog = removeDuplicates(updatedClickLog);

            // Store updated log
            chrome.storage.local.set({ clickLog: cleanedClickLog }, function() {
                // Send message to update side panel
                chrome.runtime.sendMessage({ action: 'updateLog', logEntry: newLogEntry });
            });
        }
    });
});
