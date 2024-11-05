if (!window.hasContentScriptRun) {
    window.hasContentScriptRun = true;
// Initialize click log array
let clickLog = [];
let id = 0;
// Function to find text of clicked element, traversing up to parent if needed
function getElementText(element) {
    while (element && element.textContent.trim() === '') {
        element = element.parentElement;
    }
    return element ? element.textContent.trim() : '';
}

// Function to remove duplicates from the log based on the id
function removeDuplicates(log) {
    const seen = new Set();
    return log.filter(entry => {
        if (seen.has(entry.id)) {
            return false; // Duplicate found, skip this entry
        }
        seen.add(entry.id);
        return true; // Keep the first instance of this entry
    });
}

document.addEventListener('mouseover', function(event) {
    chrome.storage.local.get(['isRecording'], function(result) {
        if (chrome.runtime.lastError) {
            console.error("Error accessing storage:", chrome.runtime.lastError);
            return; // Exit if there's an error
        }
        if (result.isRecording) {
            // Add the class only if the target is a valid element (adjust the selector as needed)

                event.target.classList.add('highlight-stroke');
            
        }
    });
});

document.addEventListener('mouseout', function(event) {
    chrome.storage.local.get(['isRecording'], function(result) {
        if (chrome.runtime.lastError) {
            console.error("Error accessing storage:", chrome.runtime.lastError);
            return; // Exit if there's an error
        }
        if (result.isRecording) {

                event.target.classList.remove('highlight-stroke');

        }
    });
});

// Change the event listener from 'click' to 'mousedown'
document.addEventListener('mousedown', function (event) {
    let clickedElement = event.target;
    console.log(clickedElement)
    const preClickedElement = document.getElementsByClassName('click-highlighted');
    Array.from(preClickedElement).forEach(element => {
        element.classList.remove('click-highlighted');
    });
    
    // Get the text content of the clicked element
    let elementText = getElementText(clickedElement);
    let url = window.location.href;
    let timestamp = new Date().toISOString();
    id += 1;

    // Log click only if recording is enabled
    chrome.storage.local.get(['isRecording', 'clickLog'], function (result) {
        if (chrome.runtime.lastError) {
            console.error("Error accessing storage:", chrome.runtime.lastError);
            return; // Exit if there's an error
        }
        if (result.isRecording) {
            clickedElement.classList.add('click-highlighted');
            // Clean element text for CSV
            elementText = elementText.replace(/,/g, ''); // Remove commas

            // Prepare new log entry
            const newLogEntry = { id, elementText, url, timestamp };

            // Introduce a slight delay (e.g., 200ms) to allow the highlight to be rendered
            setTimeout(function() {
                // Capture the screen after a short delay
                chrome.runtime.sendMessage({ action: 'captureScreen', newLogEntry });
            }, 200); // 200 milliseconds delay
        }
    });
});


// Listener for completion of screen capture
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'captureComplete') {
        const dataUrl = request.dataUrl;
        const newLogEntry = request.newLogEntry; // Retrieve the new log entry passed from the click handler
        
        // Include the captured dataUrl in the log entry
        newLogEntry.dataUrl = dataUrl;
        // Store the log entry with the captured screenshot URL
        chrome.storage.local.get('clickLog', function (result) {
            const updatedClickLog = result.clickLog || [];
            updatedClickLog.push(newLogEntry);

            // Remove duplicates before storing
            const cleanedClickLog = removeDuplicates(updatedClickLog);

            // Store updated log
            chrome.storage.local.set({ clickLog: cleanedClickLog }, function () {
                // Send message to update side panel
                chrome.runtime.sendMessage({ action: 'updateLog', logEntry: newLogEntry });
                                // Add a 2-second delay before toggling the 'click-highlighted' class
            });
        });
    }
});

}