function getShortenedText(text) {
    const words = text.split(/\s+/);
    if (words.length > 3) {
        return words.slice(0, 3).join(' ') + '...'; // Get the first four words and add "..."
    }
    return text; // Return the original text if 4 or fewer words
}

// Load and display the click log
chrome.storage.local.get(['clickLog'], function(result) {
    const logDiv = document.getElementById('log');
    let clickLog = result.clickLog || [];
    logDiv.innerHTML = ''; // Clear previous log

    if (clickLog.length === 0) {
        logDiv.textContent = 'No logs recorded.';
        return;
    }

    function renderLog() {
        logDiv.innerHTML = ''; // Clear log before re-rendering
        if (clickLog.length === 0) {
            logDiv.textContent = 'No logs recorded.';
            return;
        }
        clickLog.forEach((entry, index) => {
            const logEntryDiv = document.createElement('div');
            logEntryDiv.className = 'log-entry';
            logEntryDiv.innerHTML = `
                <strong class='title'>${index + 1} - ${getShortenedText(entry.elementText)}</strong><br>
                <a class='link-clickable' href="${entry.url}" target="_blank">${entry.url}</a><br>
                <em>Clicked at: ${entry.timestamp}</em>
            `;

            // Display the image
            if (entry.dataUrl) {
                const imgElement = document.createElement('img');
                imgElement.src = entry.dataUrl; // Use the image URL
                logEntryDiv.appendChild(imgElement);
            }

            // Add "Remove" button
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.style.marginTop = '10px';
            removeButton.onclick = function() {
                logEntryDiv.remove(); // Remove the entry from the DOM
                renumberEntries(); // Renumber the remaining entries
            };
            logEntryDiv.appendChild(removeButton);

            logDiv.appendChild(logEntryDiv);
        });
    }

    function renumberEntries() {
        const logEntries = document.querySelectorAll('.log-entry .title');
        logEntries.forEach((entry, index) => {
            entry.textContent = `${index + 1} - ${entry.textContent.split(' - ')[1]}`;
        });
    }

    renderLog(); // Initial rendering of the log
});
