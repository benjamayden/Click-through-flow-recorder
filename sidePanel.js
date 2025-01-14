//sidePanel.js

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
            showToastMessage('Url not allowed:\nonly use Internal or Demo');
            console.log("allowRecording: ", allowRecording)
            return allowRecording;
        }
    }
    allowRecording = true;
    console.log("allowRecording: ", allowRecording)
    return allowRecording;
    // Additional logic for allowed URL, if needed...
}

// Function to show toast messages
function showToastMessage(message) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Create a new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Show the toast after a brief delay
    setTimeout(() => {
        toastContainer.classList.add('show');
        toast.classList.add('show');
    }, 100);

    // Remove the toast after 5 seconds (3 seconds + extra 2 seconds)
    setTimeout(() => {
        toastContainer.classList.remove('show');
        toast.classList.remove('show');

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
chrome.runtime.sendMessage({ action: 'openPanel' });

const port = chrome.runtime.connect({ name: "sidePanel" });


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

    // Check if there are any non-archived entries
    const nonArchivedLogs = clickLog.filter(entry => !entry.isArchived);

    if (clickLog.length === 0) {
        logDiv.textContent = 'No logs recorded.';
        document.getElementById('clearLog').style.display = 'none';
        document.getElementById('footer').style.display = 'none';
        return;
    } else if (nonArchivedLogs.length === 0) {
        logDiv.textContent = 'Archived logs only';
        return;
    }
    document.getElementById('clearLog').style.display = 'flex';
    document.getElementById('footer').style.display = 'flex';
    // Create a Set to keep track of unique IDs
    const uniqueIds = new Set();
    // Create a list to display log entries
    const list = document.createElement('ul');

    clickLog.forEach(entry => {
        if (uniqueIds.has(entry.id)) {
            return; // Skip this entry if the ID has already been processed
        }
        if (entry.isArchived) {
            return;
        }
        uniqueIds.add(entry.id); // Add the ID to the set

        const listItem = document.createElement('li');

        const detailContainer = document.createElement('div');
        detailContainer.className = 'container';

        const actionContainer = document.createElement('div');

        listItem.appendChild(detailContainer);
        listItem.appendChild(actionContainer);

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

        const removeButton = document.createElement('button');
        removeButton.className = 'destructive-btn'
        removeButton.innerText = "X"

        removeButton.addEventListener('click', function () {
            const updatedLog = clickLog.filter(logEntry => logEntry.id !== entry.id)

            chrome.storage.local.set({ clickLog: updatedLog }, function () {
                displayLog(updatedLog)

            })
        })

        // Append the id and link to the details div
        details.appendChild(id);

        // Append the name and details to the list item
        detailContainer.appendChild(elementName);
        detailContainer.appendChild(details);
        actionContainer.appendChild(removeButton);


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
        recordButton.textContent = 'Record';
        pauseButton.style.display = 'none'; // Hide pause button
    });
});


// Listen for messages from content script to update log dynamically
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'tabChanged') {
        let recordButton = document.getElementById('startRecording');
        let pauseButton = document.getElementById('pauseRecording');
        recordButton.style.display = 'flex';;
        recordButton.textContent = 'Record';
        pauseButton.style.display = 'none'; // Hide pause button
    }
})


document.getElementById('startRecording').addEventListener('click', async function () {
    // Ensure that checkUrl() is called asynchronously
    const isAllowed = await checkUrl();

    // Proceed only if the URL is allowed
    if (isAllowed) {



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
        });
    }
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

        chrome.storage.local.set({ isRecording: false });

        chrome.storage.local.get(["isRecording"], function (result) {
            // If recording is paused, show a toast message
            if (result.isRecording) {
                showToastMessage('Recording paused!');
            }
        });
        // Update recording button state
        const recordButton = document.getElementById('startRecording');
        if (recordButton) {

            recordButton.textContent = 'Record';
            recordButton.style.display = 'flex';
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
    const recordButton = document.getElementById('startRecording');
    if (openFlowButton) openFlowButton.style.display = 'flex';
    if (backButton) backButton.style.display = 'none';
    if (recordButton) {
        recordButton.style.display = 'flex'
        recordButton.textContent = 'Record';
    }

});


document.getElementById('clearLog').addEventListener('click', function () {

    const confirmDelete = confirm("Are you sure you want to delete the log? This action is irreversible.");

    if (confirmDelete) {
        // Clear the log and flowTitle
        chrome.storage.local.set({ clickLog: [], flowTitle: '' }, function () {
            displayLog([]); // Clear the displayed log
            console.log("Log and flow title cleared.");
        });
    } else {
        // Action was cancelled, no need to do anything
        console.log("Log deletion cancelled.");
    }

})


// Load and display the click log when the side panel opens
chrome.storage.local.get(['clickLog'], function (result) {
    displayLog(result.clickLog || []); // Ensure it's an array
});

// Listen for messages from content.js to refresh the log display
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'refreshLog') {
        // Retrieve the updated log from storage and display it
        chrome.storage.local.get(['clickLog'], function (result) {
            const updatedLog = result.clickLog || [];
            displayLog(updatedLog); // Update the display with the latest log
        });
    }
});


// Listen for messages from content script to update log dynamically
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updatePanelFromFlow') {
        displayLog([]);
        chrome.storage.local.get(['clickLog'], function (result) {
            displayLog(result.clickLog || []); // Ensure it's an array
        });

    } else if (request.action === 'changeToFlow') {
        console.log('change to view flow button')
        const openFlowButton = document.getElementById('openFlow');
        const backButton = document.getElementById('backButton');
        if (openFlowButton) openFlowButton.style.display = 'flex';
        if (backButton) backButton.style.display = 'none';
    } else if (request.action === 'changeToBack') {
        console.log('change to back button')
        const openFlowButton = document.getElementById('openFlow');
        const backButton = document.getElementById('backButton');
        if (openFlowButton) openFlowButton.style.display = 'none';
        if (backButton) backButton.style.display = 'flex';
    }
})