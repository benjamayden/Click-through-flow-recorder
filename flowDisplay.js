// Function to initialize the flowTitle and display it
function initializeFlowTitle() {
    chrome.storage.local.get(['flowTitle'], function(result) {
        const flowTitleElement = document.getElementById('flowTitle');
        flowTitleElement.textContent = result.flowTitle || 'Click Log'; // Default title if not set
    });
}

function getShortenedText(text) {
    const words = text.split(/\s+/);
    if (words.length > 3) {
        return words.slice(0, 3).join(' ') + '...'; // Get the first four words and add "..."
    }
    return text; // Return the original text if 4 or fewer words
}


// Set button text and functionality for returning to the previous tab
document.getElementById('openFlow')?.addEventListener('click', function () {
    // Send message to go back to the previous tab
    chrome.runtime.sendMessage({ action: 'goBack' });
});


// Function to handle title editing
function enableTitleEditing() {
    const flowTitleElement = document.getElementById('flowTitle');
    const editButton = document.getElementById('editTitle');

    // Create an input field for editing
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = flowTitleElement.textContent;
    titleInput.id = 'flowTitleInput';

    // Replace the current title with the input field
    flowTitleElement.replaceWith(titleInput);
    editButton.textContent = 'Save';

    // Event listener to save title when the button is clicked again
    editButton.onclick = function () {
        const newTitle = titleInput.value;

        // Update Chrome storage with the new title
        chrome.storage.local.set({ flowTitle: newTitle }, function () {
            console.log('Flow title updated in storage');

            // Update the UI to show the new title and remove input
            titleInput.replaceWith(flowTitleElement);
            flowTitleElement.textContent = newTitle;
            editButton.textContent = 'Edit';

            // Reattach the original edit event listener
            editButton.onclick = enableTitleEditing;
        });
    };
}

// Add event listener to "Edit" button
document.getElementById('editTitle').addEventListener('click', enableTitleEditing);



// Function to check if log is empty and hide/show buttons accordingly
function hideButtonsIfLogIsEmpty() {
    chrome.storage.local.get(['clickLog'], function(result) {
        const clickLog = result.clickLog || [];
        
        // Get the buttons you want to hide/show
        const buttons = document.getElementsByTagName('button'); // Get all button elements
        const footer = document.getElementById('footer')
        // Convert HTMLCollection to an array for easy iteration
        const buttonArray = Array.from(buttons);
        
        if (clickLog.length === 0) {
            // Hide buttons if the log is empty
            buttonArray.forEach(button => button.style.display = 'none');
            footer.style.display = 'none'
        }
    });
}




document.getElementById('hideButtons').addEventListener('click', function() {
    let elements = document.getElementsByTagName('button');
    for (let element of elements) {
        element.style.display = "none";
    }
});


document.getElementById('saveImages').addEventListener('click', function () {
    const images = document.querySelectorAll('img'); // Select all images
    images.forEach((img, index) => {
        const link = document.createElement('a');
        link.href = img.src; // Set href to the image source
        link.download = `screenshot_${index + 1}.png`; // Set download attribute
        link.click(); // Trigger the download
    });
});
chrome.storage.local.get(['clickLog'], function (result) {
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
            logEntryDiv.className = 'log-entry container';

            // Content container for main log content
            const contentContainer = document.createElement('div');
            contentContainer.className = 'content container';

            // Header container for index and title
            const headerContainer = document.createElement('div');
            headerContainer.className = 'title container';

            const titleIndex = document.createElement('strong');
            titleIndex.className = 'title';
            titleIndex.id = `index-${index}`;
            titleIndex.textContent = index + 1;

            const titleElement = document.createElement('strong');
            titleElement.className = 'title';
            titleElement.id = `title-${index}`;
            titleElement.textContent = getShortenedText(entry.elementText);

            headerContainer.appendChild(titleIndex);
            headerContainer.appendChild(titleElement);

            // URL link
            const urlLink = document.createElement('a');
            urlLink.className = 'link-clickable';
            urlLink.href = entry.url;
            urlLink.target = "_blank";
            urlLink.textContent = entry.url;

            // Timestamp
            const timestamp = document.createElement('em');
            timestamp.textContent = `Clicked at: ${entry.timestamp}`;

            // Description
            const descriptionParagraph = document.createElement('p');
            descriptionParagraph.className = 'description';
            descriptionParagraph.id = `descript-${index}`;
            descriptionParagraph.textContent = entry.description;
            if(entry.description===''){
                descriptionParagraph.style.display = 'none'
            }

            // Required image
            const imgElement = document.createElement('img');
            imgElement.src = entry.dataUrl;

            // Actions container for buttons
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'action container';

            // Edit button
            const editButton = document.createElement('button');
            editButton.className = 'secondary-btn';
            editButton.dataset.index = index;
            editButton.textContent = 'Edit';

            // Save button
            const saveButton = document.createElement('button');
            saveButton.className = 'primary-btn';
            saveButton.dataset.index = index;
            saveButton.textContent = 'Save';
            saveButton.style.display = 'none';

            // Remove button
            const removeButton = document.createElement('button');
            removeButton.className = 'destructive-btn'
            removeButton.textContent = 'Remove';
            removeButton.onclick = function () {
                clickLog.splice(index, 1); // Remove entry from clickLog array
                saveClickLog(); // Update storage
                renderLog(); // Re-render after deletion
            };

            // Edit button event listener
            editButton.addEventListener('click', function () {
                // Hide content container and show input fields for editing
                contentContainer.style.display = 'none';

                // Create and display input fields with labels
                const titleLabel = document.createElement('label');
                titleLabel.textContent = 'Title';
                const titleInput = document.createElement('input');
                titleInput.type = 'text';
                titleInput.value = titleElement.textContent;

                const descriptionLabel = document.createElement('label');
                descriptionLabel.textContent = 'Description';
                const descriptionTextArea = document.createElement('textarea');
                descriptionTextArea.placeholder = "add description...";
                descriptionTextArea.value = descriptionParagraph.textContent;

                // Append labels and input fields to logEntryDiv directly
                logEntryDiv.appendChild(titleLabel);
                logEntryDiv.appendChild(titleInput);
                logEntryDiv.appendChild(descriptionLabel);
                logEntryDiv.appendChild(descriptionTextArea);
                logEntryDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
                window.scrollBy(0, -200); // Adjusts scroll position by 200px upwards

                // Toggle buttons
                editButton.style.display = 'none';
                saveButton.style.display = 'inline';

                // Save button event listener
                saveButton.addEventListener('click', function () {
                    // Update title and description with new values
                    titleElement.textContent = titleInput.value;
                    descriptionParagraph.textContent = descriptionTextArea.value;
                    descriptionParagraph.style.display = 'flex'
                    entry.elementText = titleInput.value;
                    entry.description = descriptionTextArea.value;

                    // Update clickLog with edited data
                    clickLog[index] = entry;
                    saveClickLog(); // Save updated clickLog to storage

                    // Remove input fields and labels after saving
                    titleLabel.remove();
                    titleInput.remove();
                    descriptionLabel.remove();
                    descriptionTextArea.remove();

                    // Show content container and restore button visibility
                    contentContainer.style.display = '';
                    editButton.style.display = 'inline';
                    saveButton.style.display = 'none';
                });
            });

            // Append elements to their respective containers
            contentContainer.appendChild(headerContainer);
            contentContainer.appendChild(descriptionParagraph);
            contentContainer.appendChild(imgElement);

            actionsContainer.appendChild(removeButton);
            actionsContainer.appendChild(editButton);
            actionsContainer.appendChild(saveButton);
            

            logEntryDiv.appendChild(contentContainer);
            logEntryDiv.appendChild(actionsContainer);

            // Append the log entry div to the main log div
            logDiv.appendChild(logEntryDiv);
        });
    }

    // Function to save clickLog to Chrome storage
    function saveClickLog() {
        chrome.storage.local.set({ clickLog }, function () {
            console.log('Click log updated in storage');
        });
    }

    renderLog(); // Initial rendering of the log
});


// Initialize flowTitle on page load
initializeFlowTitle();
// Initial check to hide buttons if the log is empty on page load
hideButtonsIfLogIsEmpty();