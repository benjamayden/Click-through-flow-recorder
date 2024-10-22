  // Load and display the click log
  chrome.storage.local.get(['clickLog'], function(result) {
    const logDiv = document.getElementById('log');
    const clickLog = result.clickLog || [];
    logDiv.innerHTML = ''; // Clear previous log

    if (clickLog.length === 0) {
        logDiv.textContent = 'No logs recorded.';
        return;
    }

    clickLog.forEach(entry => {
        const logEntryDiv = document.createElement('div');
        logEntryDiv.className = 'log-entry';
        logEntryDiv.innerHTML = `
            <strong>${entry.elementText}</strong><br>
            <a href="${entry.url}" target="_blank">${entry.url}</a><br>
            <em>Clicked at: ${entry.timestamp}</em>
        `;
        
        // Display the image
        if (entry.dataUrl) {
            const imgElement = document.createElement('img');
            imgElement.src = entry.dataUrl; // Use the image URL
            logEntryDiv.appendChild(imgElement);
        }

        logDiv.appendChild(logEntryDiv);
    });
});