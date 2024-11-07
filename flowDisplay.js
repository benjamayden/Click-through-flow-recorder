// Function to initialize the flowTitle and display it
function initializeFlowTitle() {
    chrome.storage.local.get(['flowTitle'], function (result) {
        const flowTitleElement = document.getElementById('flowTitle');
        flowTitleElement.textContent = result.flowTitle || 'Click Log'; // Default title if not set
    });
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
    chrome.storage.local.get(['clickLog'], function (result) {
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




document.getElementById('hideButtons').addEventListener('click', function () {
    window.print();
});


function captureElement(element) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas size based on the element's bounding box
    const rect = element.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    context.scale(scale, scale);

    // Set background color for the canvas
    context.fillStyle = 'white';
    context.fillRect(0, 0, rect.width, rect.height);

    // Helper function to load an image
    function loadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null); // Resolve with null if image fails to load
        });
    }

    // Function to render child elements (text, images)
    async function renderChildren() {
        for (const child of element.childNodes) {
            console.log(child.tagName)
            if (child.classList && child.classList.contains('title')) {
                console.log("making title")
                // Render title elements
                context.font = 'bold 14px Arial';
                context.fillStyle = 'black';
                context.fillText(child.textContent, 10, 20); // Adjust positioning as needed
            } else if (child.classList && child.classList.contains('description')) {
                console.log("making description")
                // Render description text
                context.font = '12px Arial';
                context.fillStyle = 'gray';
                context.fillText(child.textContent, 10, 40); // Adjust positioning as needed
            } else if (child.tagName === 'IMG') {
                // Load and render image elements
                console.log("making image")
                const img = await loadImage(child.src);
                if (img) {
                    const imgRect = child.getBoundingClientRect();
                    context.drawImage(
                        img,
                        imgRect.left - rect.left,
                        imgRect.top - rect.top,
                        imgRect.width,
                        imgRect.height
                    );
                }
            }
        }
    }

    // Wait for all images to load, then render everything
    return new Promise(async (resolve) => {
        await renderChildren();
        resolve(canvas.toDataURL('image/png'));
    });
}

document.getElementById('saveImages').addEventListener('click', async function () {
    const logEntries = document.querySelectorAll('.log-entry'); // Select all log entries
    for (let entryIndex = 0; entryIndex < logEntries.length; entryIndex++) {
        const entry = logEntries[entryIndex];

        const flowTitle = document.getElementById('flowTitle') ? document.getElementById('flowTitle').textContent.trim() : 'Flow';

        // Hide any items within log-entry marked with 'hide-on-print' before capture
        const hideItems = entry.getElementsByClassName('hide-on-print');
        if (hideItems.length) {
            Array.from(hideItems).forEach(item => {
                item.style.display = 'none';
            });
        }

        const imageResize = entry.getElementsByTagName('img');
        if (imageResize.length) {
            Array.from(imageResize).forEach(item => {
                item.style.width = '100%';
            });
        }
        // Generate a filename for the saved image
        const filename = `${flowTitle}_${entryIndex + 1}.png`;

        // Capture the full log entry element
        const imageData = await captureElement(entry);

        // Create a link element to trigger the image download
        const link = document.createElement('a');
        link.href = imageData;
        link.download = filename;
        link.click();

        // Restore visibility of hidden items
        if (hideItems.length) {
            Array.from(hideItems).forEach(item => {
                item.style.display = 'flex'; // Restore original display property
            });
        }
        if (imageResize.length) {
            Array.from(imageResize).forEach(item => {
                item.style.width = '50%';
            });
        }
    }
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
            const editContainer = document.createElement('div');
            editContainer.className = 'content container';
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
            titleElement.textContent = entry.elementText;

            headerContainer.appendChild(titleIndex);
            headerContainer.appendChild(titleElement);

            // Description
            const descriptionParagraph = document.createElement('p');
            descriptionParagraph.className = 'description';
            descriptionParagraph.id = `descript-${index}`;
            descriptionParagraph.textContent = entry.description;
            if (entry.description === '') {
                descriptionParagraph.style.display = 'none';
            }

            // Required image
            const imgElement = document.createElement('img');
            imgElement.src = entry.dataUrl;

            // Actions container for buttons
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'action container hide-on-print';

            // Edit button
            const editButton = document.createElement('button');
            editButton.className = 'secondary-btn';
            editButton.dataset.index = index;
            editButton.textContent = 'Edit';

            // Cancel button
            const cancelButton = document.createElement('button');
            cancelButton.className = 'secondary-btn';
            cancelButton.dataset.index = index;
            cancelButton.textContent = 'Cancel';
            cancelButton.style.display = 'none';

            // Save button
            const saveButton = document.createElement('button');
            saveButton.className = 'primary-btn';
            saveButton.dataset.index = index;
            saveButton.textContent = 'Save';
            saveButton.style.display = 'none';

            // Remove button
            const removeButton = document.createElement('button');
            removeButton.className = 'destructive-btn';
            removeButton.textContent = 'Remove';
            removeButton.onclick = function () {
                clickLog.splice(index, 1); // Remove entry from clickLog array
                saveClickLog(); // Update storage
                renderLog(); // Re-render after deletion
            };

            //cancel button event listener
            cancelButton.addEventListener('click', function () {
                // Update buttons

                // Remove input fields and labels after saving
                editContainer.remove();



                // Show content container and restore button visibility
                contentContainer.style.display = 'flex';
                editButton.style.display = 'flex';
                removeButton.style.display = 'flex'
                saveButton.style.display = 'none';
                cancelButton.style.display = 'none'

                // Re-render the log with the new order
                renderLog();

                // Scroll the window to the log entry's position, with an optional offset (e.g., 200px)
                window.scrollTo({
                    top: contentContainer.offsetTop - 100,  // Adjust 200px upwards from the log entry
                    behavior: 'smooth'  // Smooth scroll
                });
            })
            // Edit button event listener
            editButton.addEventListener('click', function () {
                // Hide content container and show input fields for editing
                contentContainer.style.display = 'none';
                cancelButton.style.display = 'flex'
                removeButton.style.display = 'none'
                // Create and display input fields with labels
                const titleContainer = document.createElement('div');
                titleContainer.classList.add('group')
                const titleLabel = document.createElement('label');
                titleLabel.textContent = 'Title';
                const titleInput = document.createElement('input');
                titleInput.type = 'text';
                titleInput.value = titleElement.textContent;

                const descriptionContainer = document.createElement('div');
                descriptionContainer.classList.add('group')
                const descriptionLabel = document.createElement('label');
                descriptionLabel.textContent = 'Description';
                const descriptionTextArea = document.createElement('textarea');
                descriptionTextArea.placeholder = "Add description...";
                descriptionTextArea.value = descriptionParagraph.textContent;

                const indexContainer = document.createElement('div');
                indexContainer.classList.add('group')
                const indexLabel = document.createElement('label');
                indexLabel.textContent = 'Position';
                const indexInput = document.createElement('input');
                indexInput.type = 'number';
                indexInput.min = '1';
                indexInput.max = `${clickLog.length}`;
                indexInput.value = (index + 1).toString(); // Display as 1-based index

                titleContainer.appendChild(titleLabel);
                titleContainer.appendChild(titleInput);
                descriptionContainer.appendChild(descriptionLabel);
                descriptionContainer.appendChild(descriptionTextArea);
                indexContainer.appendChild(indexLabel);
                indexContainer.appendChild(indexInput);

                editContainer.appendChild(titleContainer);
                editContainer.appendChild(descriptionContainer);
                editContainer.appendChild(indexContainer);
                // Append labels and input fields to logEntryDiv directly

                // Scroll the window to the log entry's position, with an optional offset (e.g., 200px)
                window.scrollTo({
                    top: editContainer.offsetTop - 400,  // Adjust 200px upwards from the log entry
                    behavior: 'smooth'  // Smooth scroll
                });

                // Toggle buttons
                editButton.style.display = 'none';
                saveButton.style.display = 'inline';

                // Save button event listener
                saveButton.addEventListener('click', function () {
                    // Update title, description, and position with new values
                    cancelButton.style.display = 'none'
                    removeButton.style.display = 'flex'
                    titleElement.textContent = titleInput.value;
                    descriptionParagraph.textContent = descriptionTextArea.value;
                    descriptionParagraph.style.display = 'flex';
                    entry.elementText = titleInput.value;
                    entry.description = descriptionTextArea.value;

                    // Adjust position in clickLog based on index input
                    const newPosition = parseInt(indexInput.value, 10) - 1;
                    clickLog.splice(index, 1); // Remove the entry from the original position
                    clickLog.splice(newPosition, 0, entry); // Insert it at the new position

                    saveClickLog(); // Save updated clickLog to storage

                    // Remove input fields and labels after saving
                    editContainer.remove();



                    // Show content container and restore button visibility
                    contentContainer.style.display = '';
                    editButton.style.display = 'inline';
                    saveButton.style.display = 'none';

                    // Re-render the log with the new order
                    renderLog();

                    let newEntryElement = document.getElementById(`index-${newPosition}`)
                    // Scroll the window to the log entry's position, with an optional offset (e.g., 200px)
                    window.scrollTo({
                        top: newEntryElement.offsetTop - 100,  // Adjust 200px upwards from the log entry
                        behavior: 'smooth'  // Smooth scroll
                    });
                });
            });

            // Append elements to their respective containers
            // contentContainer.appendChild(headerContainer);
            // contentContainer.appendChild(descriptionParagraph);


            actionsContainer.appendChild(removeButton);
            actionsContainer.appendChild(editButton);
            actionsContainer.appendChild(cancelButton);
            actionsContainer.appendChild(saveButton);

            logEntryDiv.appendChild(headerContainer);
            logEntryDiv.appendChild(descriptionParagraph);
            logEntryDiv.appendChild(imgElement);
            logEntryDiv.appendChild(editContainer);
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