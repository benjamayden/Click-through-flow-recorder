//content.js
if (!window.hasContentScriptRun) {
    window.hasContentScriptRun = true;

    let clickLog = [];
    let id = 0;
    let isRecording = false;

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
                return false;
            }
            seen.add(entry.id);
            return true;
        });
    }

    // Listener for `isRecording` changes
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.isRecording) {
            isRecording = changes.isRecording.newValue;
            toggleRecording(isRecording);
        }
    });

    // Function to toggle event listeners based on `isRecording`
    function toggleRecording(enable) {
        if (enable) {
            // Add event listeners
            document.addEventListener('mouseover', handleMouseOver);
            document.addEventListener('mouseout', handleMouseOut);
            // document.addEventListener('mousedown', handleMouseDown);
        } else {
            // Remove event listeners
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
            // document.removeEventListener('mousedown', handleMouseDown);
        }
    }

    // Event listener functions
    function handleMouseOver(event) {
        if (isRecording) {
            event.target.classList.add('highlight-stroke');
        }
    }

    function handleMouseOut(event) {
        if (isRecording) {
            event.target.classList.remove('highlight-stroke');
        }
    }

    function getShortenedText(text) {
        const words = text.split(/\s+/);
        if (words.length > 3) {
            return words.slice(0, 6).join(' ') + '...'; // Get the first four words and add "..."
        }
        return text; // Return the original text if 4 or fewer words
    }

    // Listener for screen capture completion
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.action === 'captureComplete') {
            const dataUrl = request.dataUrl;
            const newLogEntry = request.newLogEntry;

            newLogEntry.dataUrl = dataUrl;
            chrome.storage.local.get('clickLog', function (result) {
                const updatedClickLog = result.clickLog || [];
                updatedClickLog.push(newLogEntry);

                const cleanedClickLog = removeDuplicates(updatedClickLog);

                // Save the cleaned log to storage
                chrome.storage.local.set({ clickLog: cleanedClickLog }, function () {
                    // Notify the panel to refresh its display without re-saving
                    chrome.runtime.sendMessage({ action: 'refreshLog' });
                });
            });
            const toRemove = document.querySelectorAll('highlight-stroke');
            toRemove.forEach(element => {
                element.classList.remove('highlight-stroke');
            })
        }
    });


    // Initial check for `isRecording` and setup event listeners accordingly
    chrome.storage.local.get(['isRecording'], function (result) {
        isRecording = result.isRecording || false;
        toggleRecording(isRecording);
    });

    // Listener for stopRecording action from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'stopRecording') {
            console.log("Stopping recording due to tab or URL change.");

            // Stop recording and clean up event listeners
            chrome.storage.local.set({ isRecording: false }, () => {
                toggleRecording(false);
                chrome.runtime.sendMessage({ action: 'tabChanged' });
                console.log("Event listeners removed.");
            });
        }
    });


    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'getHighlightedText') {
            const highlightedElement = document.getElementsByClassName('highlight-stroke');
            let elementText = "";
    
            if (highlightedElement.length > 0) {
                elementText = highlightedElement[0].innerText || highlightedElement[0].textContent || '';
            }
    
            sendResponse({ elementText });
        }
    });
}


