// Function to display the log
function displayLog(clickLog) {
    const logDiv = document.getElementById('log');
    logDiv.innerHTML = ''; // Clear previous log

    if (clickLog.length === 0) {
        logDiv.textContent = 'No logs recorded.';
        return;
    }

    // Create a list to display log entries
    const list = document.createElement('ul');
    clickLog.forEach(entry => {
        const listItem = document.createElement('li');
        listItem.textContent = `${entry.elementText} - ${entry.url} at ${entry.timestamp}`;
        list.appendChild(listItem);
    });
    logDiv.appendChild(list);
}

// Handle start recording
document.getElementById('startRecording').addEventListener('click', function() {
    chrome.storage.local.set({ isRecording: true }, function() {
        alert('Recording started!');
    });
});

// Handle stop recording
document.getElementById('stopRecording').addEventListener('click', function() {
    chrome.storage.local.set({ isRecording: false }, function() {
        alert('Recording stopped!');
    });
});

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

// Handle copy log and clear
document.getElementById('copyLog').addEventListener('click', function() {
    chrome.storage.local.get(['clickLog'], function(result) {
        let clickLog = result.clickLog;

         // Remove duplicates before storing
         const cleanedClickLog = removeDuplicates(clickLog);
        // Convert the log to CSV format
        let csvContent = "Button Label,URL,Timestamp\n";
        cleanedClickLog.forEach(entry => {
            let buttonText = entry.elementText.replace(/"/g, '""'); // Escape quotes
            csvContent += `${buttonText},${entry.url},${entry.timestamp}\n`;
        });

        // Copy the CSV to the clipboard
        navigator.clipboard.writeText(csvContent).then(() => {
            alert('Log copied to clipboard!');

            // Clear the log after copying
            chrome.storage.local.set({ clickLog: [] });
            displayLog([]); // Clear the displayed log
        }).catch(err => {
            console.error('Failed to copy log: ', err);
        });
    });
});

//clear log

document.getElementById('clearLog').addEventListener('click', function() {
            // Clear the log after copying
            chrome.storage.local.set({ clickLog: [] });
            displayLog([]); // Clear the displayed log

})

// Handle copy of button labels joined by " > "
document.getElementById('copyButtonLabels').addEventListener('click', function() {
    chrome.storage.local.get(['clickLog'], function(result) {
        let clickLog = result.clickLog;

        // Remove duplicates before concatenating button labels
        clickLog = removeDuplicates(clickLog);

        // Concatenate button labels with " > "
        let buttonLabels = clickLog.map(entry => entry.elementText).join(' > ');

        // Copy the concatenated labels to the clipboard
        navigator.clipboard.writeText(buttonLabels).then(() => {
            alert('Button labels copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy button labels: ', err);
        });
    });
});

// Load and display the click log when the side panel opens
chrome.storage.local.get(['clickLog'], function(result) {
    displayLog(result.clickLog || []); // Ensure it's an array
});

// Listen for messages from content script to update log dynamically
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateLog') {
        // Update the log with the new entry received from the content script
        const newLogEntry = request.logEntry;
        
        chrome.storage.local.get(['clickLog'], function(result) {
            const updatedLog = result.clickLog || [];
            updatedLog.push(newLogEntry);
            chrome.storage.local.set({ clickLog: updatedLog }, function() {
                displayLog(updatedLog); // Update the display with new log
            });
        });
    }
});
