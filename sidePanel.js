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

function showToastMessage(messageText) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "showToast",
            text: messageText
        });
    });
}



function displayLog(clickLog) {
    const logDiv = document.getElementById('log');
    logDiv.innerHTML = ''; // Clear previous log
    
    if (clickLog.length === 0) {
        logDiv.textContent = 'No logs recorded.';
        document.getElementById('clearLog').style.display = 'none';
        return;
    }
    document.getElementById('clearLog').style.display = 'flex';
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

        // Append the id and link to the details div
        details.appendChild(id);

        // Append the name and details to the list item
        listItem.appendChild(elementName);
        listItem.appendChild(details);

        // Append the list item to the list
        list.appendChild(listItem);
    });

    logDiv.appendChild(list);
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

document.getElementById('pauseRecording').addEventListener('click', function () {
    // Pause recording functionality
    showToastMessage('Recording paused!');
    chrome.storage.local.set({ isRecording: false }, function () {
        let recordButton = document.getElementById('startRecording');
        let pauseButton = document.getElementById('pauseRecording'); 
        recordButton.style.display = 'flex';;
        recordButton.textContent = 'Resume';
        pauseButton.style.display = 'none'; // Hide pause button
        
    });
});


document.getElementById('startRecording').addEventListener('click', function () {
    const recordButton = document.getElementById('startRecording');
    const pauseButton = document.getElementById('pauseRecording'); // Your pause button

    chrome.storage.local.get(['isRecording'], function (result) {
        const isRecording = result.isRecording || false;

        if (!isRecording) {
            // Start recording
            chrome.storage.local.set({ isRecording: true }, function () {
                showToastMessage('Recording started!');  
                recordButton.style.display = 'none';
                pauseButton.style.display = 'flex'; // Show the pause button
            });
        } 
        // else {
        //     // Stop recording
        //     chrome.storage.local.set({ isRecording: false }, function () {
        //         showToastMessage('Recording stopped!');
                
        //          // Open the log display page in a new tab
        //          chrome.runtime.sendMessage({ action: 'openFlowDisplay', previousTabId: result.previousTabId });


        //         // Clean duplicates and display log
        //         chrome.storage.local.get(['clickLog'], function (result) {
        //             let clickLog = result.clickLog || [];
        //             const cleanedClickLog = removeDuplicates(clickLog);
        //             chrome.storage.local.set({ clickLog: cleanedClickLog });
        //             displayLog(cleanedClickLog);
        //         });

        //         list.classList.remove('isRecording');
        //         recordButton.classList.remove('isRecording');
        //         recordButton.textContent = 'Record';
        //         pauseButton.style.display = 'none'; // Hide the pause button

        //         // Hide "Stop & View" button and show "View Flow" button
        //         const openFlowButton = document.getElementById('openFlow');
        //         const backButton = document.getElementById('backButton');
        //         if (openFlowButton) openFlowButton.style.display = 'flex';
        //         if (backButton) backButton.style.display = 'none';
        //     });
        // }
    });
});



// Event listener for the "View Flow" button
document.getElementById('openFlow')?.addEventListener('click', async function () {
    // Get the current active tab
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (currentTab?.url?.includes('flowDisplay.html')) {
        // If we're already on flowDisplay.html, do nothing here.
        return;
    } else {
        // Set recording state to paused
        showToastMessage('Recording paused!');
        chrome.storage.local.set({ isRecording: false });

        // Update recording button state
        const recordButton = document.getElementById('startRecording');
        if (recordButton) {
            recordButton.textContent = 'Resume';
        }

        // Hide the pause button
        const pauseRecordingButton = document.getElementById('pauseRecording');
        if (pauseRecordingButton) pauseRecordingButton.style.display = 'none';

        // Open the flowDisplay page in a new tab and pass current tab ID
        chrome.runtime.sendMessage({ action: 'openFlowDisplay', previousTabId: currentTab.id });

        // Hide "View Flow" button and show "Back" button
        const openFlowButton = document.getElementById('openFlow');
        const backButton = document.getElementById('backButton');
        if (openFlowButton) openFlowButton.style.display = 'none';
        if (backButton) backButton.style.display = 'flex';
    }
});

// Event listener for the "Back" button (on flowDisplay.html)
document.getElementById('backButton')?.addEventListener('click', function () {
    chrome.runtime.sendMessage({ action: 'goBack' });

    // Hide "Back" button and show "View Flow" button
    const openFlowButton = document.getElementById('openFlow');
    const backButton = document.getElementById('backButton');
    if (openFlowButton) openFlowButton.style.display = 'flex';
    if (backButton) backButton.style.display = 'none';
});

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
//             showToastMessage('Log copied to clipboard!');

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
        // Clear the log and flowTitle
        chrome.storage.local.set({ clickLog: [], flowTitle: '' }, function() {
            displayLog([]); // Clear the displayed log
            console.log("Log and flow title cleared.");
        });
    } else {
        // Action was cancelled, no need to do anything
        console.log("Log deletion cancelled.");
    }

})

// // Handle copy of button labels joined by " > "
// document.getElementById('copyButtonLabels').addEventListener('click', function() {
//     chrome.storage.local.get(['clickLog'], function(result) {
//         let clickLog = result.clickLog;

//         // Remove duplicates before concatenating button labels
//         clickLog = removeDuplicates(clickLog);

//         // Concatenate button labels with " > "
//         let buttonLabels = clickLog.map(entry => entry.elementText).join(' > ');

//         // Copy the concatenated labels to the clipboard
//         navigator.clipboard.writeText(buttonLabels).then(() => {
//             alert('Button labels copied to clipboard!');
//         }).catch(err => {
//             console.error('Failed to copy button labels: ', err);
//         });
//     });
// });

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
