// flowDisplay.js

// Function to display the click log and screenshots
function displayFlowLog(clickLog, screenshotLog) {
    const logDiv = document.getElementById('log');
    logDiv.innerHTML = ''; // Clear previous log

    if (clickLog.length === 0 || screenshotLog.length === 0) {
        logDiv.textContent = 'No log or screenshots recorded.';
        return;
    }

    clickLog.forEach((entry, index) => {
        // Create a new div for each log entry
        const logItem = document.createElement('div');
        logItem.className = 'log-item';

        // Add the click information
        const info = document.createElement('p');
        info.textContent = `Clicked Element: ${entry.elementText}, URL: ${entry.url}, Timestamp: ${entry.timestamp}`;
        logItem.appendChild(info);

        // Add the related screenshot
        if (screenshotLog[index]) {
            const img = document.createElement('img');
            img.src = screenshotLog[index];
            img.alt = 'Screenshot related to the click';
            logItem.appendChild(img);
        }

        logDiv.appendChild(logItem);
    });
}

// Fetch the click log and screenshot log from local storage and display
chrome.storage.local.get(['clickLog', 'screenshotLog'], function(result) {
    const clickLog = result.clickLog || [];
    const screenshotLog = result.screenshotLog || [];
    displayFlowLog(clickLog, screenshotLog);
});
