
// Initialize variables
let isEditMode = false;
let clickLog = [];
let archivedLog = [];

// Initialize flow title and entries
initializeFlowTitle();
loadClickLog();

// Toggle edit mode
document.getElementById('editModeToggle').addEventListener('click', function () {
    isEditMode = !isEditMode;
    toggleEditMode(isEditMode);
});

// Add new entry
document.getElementById('addEntry').addEventListener('click', function () {
    const newEntry = {
        elementText: 'New Title',
        description: 'New Description',
        dataUrl: '', // Placeholder for image
        isArchived: false,
    };
    clickLog.push(newEntry);
    saveClickLog();
    renderLog();
});

// Load click log from storage
function loadClickLog() {
    chrome.storage.local.get(['clickLog', 'archivedLog'], function (result) {
        clickLog = result.clickLog || [];
        archivedLog = result.archivedLog || [];
        renderLog();
        renderArchivedLog();
    });
}

// Save click log to storage
function saveClickLog() {
    chrome.storage.local.set({ clickLog, archivedLog }, function () {
        console.log('Click log updated in storage');
    });
}

// Toggle edit mode for entries
function toggleEditMode(enable) {
    const editButton = document.getElementById('editModeToggle');
    const flowTitleElement = document.getElementById('flowTitle');
    if (enable) {
        editButton.textContent = 'Save';
        flowTitleElement.contentEditable = true;
        flowTitleElement.classList.add('editable');
    } else {
        editButton.textContent = 'Edit';
        flowTitleElement.contentEditable = false;
        flowTitleElement.classList.remove('editable');
        // Save the updated title
        chrome.storage.local.set({ flowTitle: flowTitleElement.textContent });
        // Save entries
        saveClickLog();
    }
    renderLog();
}

// Render the click log
function renderLog() {
    const logDiv = document.getElementById('log');
    logDiv.innerHTML = '';

    if (clickLog.length === 0) {
        logDiv.textContent = 'No logs recorded.';
        return;
    }

    clickLog.forEach((entry, index) => {
        if (entry.isArchived) return; // Skip archived entries

        const logEntryDiv = document.createElement('div');
        logEntryDiv.className = 'log-entry container';
        logEntryDiv.draggable = isEditMode;

        // Handle drag events
        logEntryDiv.addEventListener('dragstart', dragStart);
        logEntryDiv.addEventListener('dragover', dragOver);
        logEntryDiv.addEventListener('drop', drop);

        // Content editable when in edit mode
        const titleElement = document.createElement('div');
        titleElement.className = 'title';
        titleElement.textContent = entry.elementText;
        titleElement.contentEditable = isEditMode;
        if (isEditMode) titleElement.classList.add('editable');

        const descriptionParagraph = document.createElement('p');
        descriptionParagraph.className = 'description';
        descriptionParagraph.textContent = entry.description ? entry.description : "placeholder";
        descriptionParagraph.contentEditable = isEditMode;
        if (isEditMode) descriptionParagraph.classList.add('editable');

        const imgElement = document.createElement('img');
        imgElement.src = entry.dataUrl || 'placeholder.png';

        // Actions
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'action container hide-on-print';

        // Remove button
        const removeButton = document.createElement('button');
        removeButton.className = 'destructive-btn';
        removeButton.textContent = 'Remove';
        removeButton.onclick = function () {
            entry.isArchived = true;
            saveClickLog();
            renderLog();
            renderArchivedLog();
        };

        if (isEditMode) {
            actionsContainer.appendChild(removeButton);
        }

        // Update entry data on blur
        titleElement.addEventListener('blur', function () {
            entry.elementText = titleElement.textContent;
            saveClickLog();
        });

        descriptionParagraph.addEventListener('blur', function () {
            entry.description = descriptionParagraph.textContent;
            saveClickLog();
        });

        // Append elements
        logEntryDiv.appendChild(titleElement);
        logEntryDiv.appendChild(descriptionParagraph);
        logEntryDiv.appendChild(imgElement);
        logEntryDiv.appendChild(actionsContainer);

        logDiv.appendChild(logEntryDiv);
    });
}

// Render archived entries
function renderArchivedLog() {
    const archivedDiv = document.getElementById('archivedEntries');
    archivedDiv.innerHTML = '';

    archivedLog = clickLog.filter(entry => entry.isArchived);

    archivedLog.forEach((entry, index) => {
        const logEntryDiv = document.createElement('div');
        logEntryDiv.className = 'archive-entry container';

        const titleElement = document.createElement('div');
        titleElement.className = 'title';
        titleElement.textContent = entry.elementText;

        const descriptionParagraph = document.createElement('p');
        descriptionParagraph.className = 'description';
        descriptionParagraph.textContent = entry.description;

        const restoreButton = document.createElement('button');
        restoreButton.className = 'secondary-btn';
        restoreButton.textContent = 'Restore';
        restoreButton.onclick = function () {
            entry.isArchived = false;
            saveClickLog();
            renderLog();
            renderArchivedLog();
        };

        logEntryDiv.appendChild(titleElement);
        logEntryDiv.appendChild(descriptionParagraph);
        logEntryDiv.appendChild(restoreButton);

        archivedDiv.appendChild(logEntryDiv);
    });
}

// Drag and Drop functions
let draggedItem = null;

function dragStart(e) {
    draggedItem = this;

    // Add the hideOnDrag class to all elements to be hidden
    document.querySelectorAll('.log-entry img, .log-entry p, .log-entry button').forEach(el => {
        el.classList.add('hideOnDrag');
    });
    draggedItem.style.transform = 'translateX(2rem)';
    // Hide all screenshots when dragging starts
    setTimeout(() => {

        this.classList.add('draggable');
    }, 0);
}

function dragOver(e) {
    e.preventDefault();

    // Calculate the position for the draggedItem
    const bounding = this.getBoundingClientRect();
    const offset = bounding.y + bounding.height / 2;

    const parent = this.parentNode;
    if (e.clientY - offset > 0) {
        if (this.nextSibling !== draggedItem) {
            parent.insertBefore(draggedItem, this.nextSibling);
        }
    } else {
        if (this.previousSibling !== draggedItem) {
            parent.insertBefore(draggedItem, this);
        }
    }
}

function drop(e) {
    e.preventDefault();
    this.style['border-bottom'] = '';
    this.style['border-top'] = '';
    const parent = this.parentNode;
    const siblings = Array.from(parent.children);
    const draggedIndex = siblings.indexOf(draggedItem);
    const targetIndex = siblings.indexOf(this);

    if (draggedIndex < targetIndex) {
        parent.insertBefore(draggedItem, this.nextSibling);
        moveEntry(draggedIndex, targetIndex);
    } else {
        parent.insertBefore(draggedItem, this);
        moveEntry(draggedIndex, targetIndex);
    }

    setTimeout(() => {
        let entries = document.querySelectorAll('.log-entry');
        entries.forEach(entry => {
            let images = entry.querySelectorAll('img');
            images.forEach(img => {
                img.style.height = '100%'
            })
        });
    }, 200);
    draggedItem.style.transform = 'translateX(0)';
    draggedItem.classList.remove('draggable');
    // Add the hideOnDrag class to all elements to be hidden
    document.querySelectorAll('.log-entry img, .log-entry p, .log-entry button').forEach(el => {
        el.classList.remove('hideOnDrag');
    });
    
    draggedItem.scrollIntoView({
        behavior: 'smooth', // Smooth scrolling
        block: 'center', // Vertically center the item in the viewport
        inline: 'center' // Horizontally center the item in the viewport
    });
    

    saveClickLog();
}

function moveEntry(fromIndex, toIndex) {
    const entry = clickLog.splice(fromIndex, 1)[0];
    clickLog.splice(toIndex, 0, entry);
}

// Initialize flowTitle
function initializeFlowTitle() {
    chrome.storage.local.get(['flowTitle'], function (result) {
        const flowTitleElement = document.getElementById('flowTitle');
        flowTitleElement.textContent = result.flowTitle || 'Click Log'; // Default title if not set
    });
}




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
    canvas.width = 1920 * scale;
    canvas.height = rect.height * scale;
    context.scale(scale, scale);

    // Set background color for the canvas
    context.fillStyle = 'white';
    context.fillRect(0, 0, 1920, rect.height);

    // Helper function to load an image
    function loadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null); // Resolve with null if image fails to load
        });
    }

    // Current Y-coordinate on the canvas
    let currentY = 50; // Start with some padding at the top

    // Function to render child elements (text, images)
    async function renderChildren() {
        for (const child of element.childNodes) {
            if (child.classList && child.classList.contains('title')) {
                console.log("Rendering title");
                // Render title elements
                context.font = 'bold 32px Arial';
                context.fillStyle = 'black';
                context.fillText(child.textContent, 30, currentY);
                currentY += 40; // Increment Y for the next element (line spacing)
            } else if (child.classList && child.classList.contains('description')) {
                console.log("Rendering description");
                // Render description text
                context.font = '16px Arial';
                context.fillStyle = 'black';
                context.fillText(child.textContent, 30, currentY);
                currentY += 20; // Increment Y for the next element (line spacing)
            } else if (child.tagName === 'IMG') {
                console.log("Rendering image");
                // Load and render image elements
                const img = await loadImage(child.src);
                if (img) {
                    const imgRect = child.getBoundingClientRect();
                    const imgHeight = imgRect.height * scale;
                    context.drawImage(
                        img,
                        rect.left,
                        currentY,
                        imgRect.width - 32,
                        imgRect.height - 32
                    );
                    currentY += imgHeight + 10; // Increment Y by image height and some padding
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
    console.log("test")
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
                item.style.width = '1920px';
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
                item.style.width = '100%';
            });
        }
    }
});


function saveClickLog() {
    chrome.storage.local.set({ clickLog }, function () {
        console.log('Click log updated in storage');
    });
}



chrome.storage.local.get(['clickLog'], function (result) {
    const logDiv = document.getElementById('log');
    let clickLog = result.clickLog || [];
    logDiv.innerHTML = ''; // Clear previous log

    if (clickLog.length === 0) {
        logDiv.textContent = 'No logs recorded.';
        return;
    }

    // Function to save clickLog to Chrome storage


    renderLog(); // Initial rendering of the log
});

