function getShortenedText(text) {
    const words = text.split(/\s+/);
    if (words.length > 3) {
        return words.slice(0, 3).join(' ') + '...'; // Get the first four words and add "..."
    }
    return text; // Return the original text if 4 or fewer words
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



function displayLog(clickLog) {
    const logDiv = document.getElementById('log');
    logDiv.innerHTML = ''; // Clear previous log

    if (clickLog.length === 0) {
        logDiv.textContent = 'No logs recorded.';
        return;
    }

    // Create a Set to keep track of unique IDs
    const uniqueIds = new Set();
    // Create a list to display log entries
    const list = document.createElement('ul');

    clickLog.forEach(entry => {
        if (uniqueIds.has(entry.id)) {
            return; // Skip this entry if the ID has already been processed
        }
        uniqueIds.add(entry.id); // Add the ID to the set

        const listItem = document.createElement('li');

        // Create and append the element name
        const elementName = document.createElement('div');
        elementName.classList.add('elementName');
        elementName.textContent = getShortenedText(entry.elementText);

        // Create and append the details div
        const details = document.createElement('div');
        details.classList.add('elementDetails');

        // Create and append the ID
        const id = document.createElement('span');
        id.classList.add('elementId');
        id.textContent = `id: ${entry.id}`;

        // Create and append the link
        const link = document.createElement('a');
        link.classList.add('elementLink');
        link.href = entry.url;
        link.textContent = "link";

        // Append the id and link to the details div
        details.appendChild(id);
        details.appendChild(link);

        // Append the name and details to the list item
        listItem.appendChild(elementName);
        listItem.appendChild(details);

        // Append the list item to the list
        list.appendChild(listItem);
    });

    logDiv.appendChild(list);
}



// Handle start recording
document.getElementById('startRecording').addEventListener('click', function() {
    chrome.storage.local.set({ isRecording: true }, function() {
        alert('Recording started!');
        let list = document.getElementById('log')
        let recordButton = document.getElementById('startRecording')
        list.classList.toggle('isRecording')
        recordButton.classList.toggle('isRecording')
    });
});

// Handle stop recording
document.getElementById('stopRecording').addEventListener('click', function() {
    chrome.storage.local.set({ isRecording: false }, function() {
        alert('Recording stopped!');
        chrome.tabs.create({ url: chrome.runtime.getURL('flowDisplay.html') });

        // Final remove duplicates and display log
        chrome.storage.local.get(['clickLog'], function(result) {
            let clickLog = result.clickLog || [];
            
            // Remove duplicates before displaying the log
            const cleanedClickLog = removeDuplicates(clickLog);

            // Store the cleaned log back to storage if needed
            chrome.storage.local.set({ clickLog: cleanedClickLog });

            // Display the cleaned log
            displayLog(cleanedClickLog);
        });

        let list = document.getElementById('log');
        let recordButton = document.getElementById('startRecording');
        list.classList.toggle('isRecording');
        recordButton.classList.toggle('isRecording');
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

// // Handle copy log and clear
// document.getElementById('copyLog').addEventListener('click', function() {
//     chrome.storage.local.get(['clickLog'], function(result) {
//         let clickLog = result.clickLog;
//          // Remove duplicates before storing
//          const cleanedClickLog = removeDuplicates(clickLog);
//         // Convert the log to CSV format
//         let csvContent = "Button Label,URL,Timestamp\n";
//         cleanedClickLog.forEach(entry => {
//             let buttonText = entry.elementText.replace(/"/g, '""'); // Escape quotes
//             csvContent += `${buttonText},${entry.url},${entry.timestamp}\n`;
//         });

//         // Copy the CSV to the clipboard
//         navigator.clipboard.writeText(csvContent).then(() => {
//             alert('Log copied to clipboard!');

//             // Clear the log after copying
//             chrome.storage.local.set({ clickLog: [] });
//             displayLog([]); // Clear the displayed log
//         }).catch(err => {
//             console.error('Failed to copy log: ', err);
//         });
//     });
// });

//clear log

document.getElementById('clearLog').addEventListener('click', function() {
    // Display a confirmation alert
    const confirmDelete = confirm("Are you sure you want to delete the log? This action is irreversible.");
    
    if (confirmDelete) {
        // Clear the log after copying
        chrome.storage.local.set({ clickLog: [] });
        displayLog([]); // Clear the displayed log
    } else {
        // Action was cancelled, no need to do anything
        console.log("Log deletion cancelled.");
    }

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
