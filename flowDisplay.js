
// Initialize variables
let isEditMode = false;
let clickLog = [];
let archivedLog = [];
let reorder = false;
let nextId = 999;


loadClickLog();

// Toggle edit mode
document.getElementById('editModeToggle').addEventListener('click', function () {
    isEditMode = !isEditMode;
    toggleEditMode(isEditMode);
    const saveAll = document.getElementById('saveImages')
    const savePDF = document.getElementById('printPDF')
    const reorder = document.getElementById('reorder')
    if (isEditMode) {
        saveAll.style.display = 'none';
        savePDF.style.display = 'none';

        reorder.style.display = 'flex';
    } else {
        saveAll.style.display = 'flex';
        savePDF.style.display = 'flex';

        reorder.style.display = 'none';
    }
});




// Load click log from storage
function loadClickLog() {
    chrome.storage.local.get(['clickLog', 'archivedLog', 'flowTitle'], function (result) {
        const flowTitleElement = document.getElementById('flowTitle');
        flowTitleElement.textContent = result.flowTitle || 'Click Log'; // Default title if not set
        let renderedLog = [];
        let id = -1;
        result.clickLog.forEach(entry => {
            if (entry.id !== id) {
                nextId++;
                id = entry.id;
                renderedLog.push(entry)
            }
        })
        clickLog = renderedLog || [];
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
    chrome.runtime.sendMessage({ action: 'updatePanelFromFlow' });
}

// Toggle edit mode for entries
function toggleEditMode(enable) {
    const editButton = document.getElementById('editModeToggle');
    const editIcon = document.getElementById('editIcon');
    const saveIcon = document.getElementById('saveIcon');

    const flowTitleElement = document.getElementById('flowTitle');
    const footerElement = document.getElementById('footer');
    const isEditingText = document.getElementById('isEditingText');
    if (enable) {
        editButton.classList.add('secondary-btn');
        flowTitleElement.contentEditable = true;
        flowTitleElement.classList.add('editable');
        footerElement.classList.add('hide');
        isEditingText.innerText = 'Editing'
        editIcon.style.display = 'none';
        saveIcon.style.display = 'flex';
    } else {
        editButton.classList.remove('secondary-btn');
        flowTitleElement.contentEditable = false;
        flowTitleElement.classList.remove('editable');
        footerElement.classList.remove('hide');
        saveIcon.style.display = 'none';
        editIcon.style.display = 'flex';
        // Set the "Saved!" text and fade it in
        isEditingText.innerText = 'Saved!';
        isEditingText.classList.remove('remove'); // Ensure the animation reset

        // Wait 3 seconds, then fade out
        setTimeout(() => {
            isEditingText.classList.add('remove'); // Trigger the "shrink" animation
        }, 1700);

        // Optionally clear the text after the animation completes (e.g., after 0.3s)
        setTimeout(() => {
            isEditingText.innerText = ''; // Clear the text after fade-out
        }, 2000); // Match the animation duration (0.3s in the CSS)

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
        const blockContainer = document.createElement('div');
        blockContainer.className = 'container block';
        blockContainer.dataset.id = entry.id;
        const logEntryDiv = document.createElement('div');
        logEntryDiv.className = 'log-entry container';
        logEntryDiv.draggable = reorder;

        if (reorder) {
            // Handle drag events
            blockContainer.addEventListener('dragstart', dragStart);
            blockContainer.addEventListener('dragover', dragOver);
            blockContainer.addEventListener('drop', drop);
        }


        // Content editable when in edit mode
        const titleElement = document.createElement('div');
        titleElement.className = 'title';
        titleElement.textContent = entry.elementText;
        titleElement.contentEditable = isEditMode;
        if (isEditMode) titleElement.classList.add('editable');

        const descriptionParagraph = document.createElement('p');
        descriptionParagraph.className = 'description';
        descriptionParagraph.textContent = entry.description ? entry.description : "Enter description";
        if (descriptionParagraph.textContent === "Enter description") {
            descriptionParagraph.classList.add('hide-on-print');
        }
        descriptionParagraph.contentEditable = isEditMode;
        if (isEditMode) descriptionParagraph.classList.add('editable');

        // Actions
        const addEntryContainer = document.createElement('div');
        addEntryContainer.className = 'addEntryContainer hide-on-print'
        addEntryContainer.style.pointerEvents = 'none';
        if (isEditMode) {
            addEntryContainer.classList.add('canAdd')
            addEntryContainer.style.pointerEvents = 'auto';
        };

        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'action addEntry hide-on-print';
        addEntryContainer.appendChild(actionsContainer)

        const addEntryButton = document.createElement('button');
        addEntryButton.id = "addEntry";
        addEntryButton.className = 'secondary-btn';
        addEntryButton.innerText = "Add";

        // Add click event listener to the button
        addEntryButton.addEventListener('click', function () {


            const newEntry = {
                elementText: 'Enter title',
                description: 'Enter description',
                dataUrl: '',
                id: nextId,
                isArchived: false,
            };
            nextId++;

            clickLog.splice(index + 1, 0, newEntry); // Insert after the parent



            addEntryContainer.classList.add('growNewEntry');
            setTimeout(() => {
                saveClickLog();  // Save the updated log
                addEntryContainer.classList.remove('growNewEntry');
                renderLog();
            }, 250)


        });
        actionsContainer.appendChild(addEntryButton)

        // Remove button
        const removeButton = document.createElement('button');
        removeButton.className = 'destructive-btn';
        removeButton.textContent = 'Remove';
        removeButton.onclick = function () {
            // Add the animation class
            blockContainer.classList.add('remove');

            // Wait for the animation to complete before archiving and re-rendering
            setTimeout(() => {
                entry.isArchived = true; // Mark entry as archived
                saveClickLog();          // Save the updated click log
                renderLog();             // Re-render active logs
                renderArchivedLog();     // Re-render archived logs
            }, 300); // Match the duration of the animation (0.3s)
        };

        actionsContainer.appendChild(removeButton)


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
        if (entry.dataUrl !== '') {
            const imgElement = document.createElement('img');
            imgElement.src = entry.dataUrl || 'placeholder.png';
            logEntryDiv.appendChild(imgElement); // Ensure this line is within the same scope
        }

        blockContainer.appendChild(logEntryDiv);
        blockContainer.appendChild(addEntryContainer);
        logDiv.appendChild(blockContainer);

    });
}

// Render archived entries
function renderArchivedLog() {
    const archivedDiv = document.getElementById('archivedEntries');
    archivedDiv.innerHTML = '';

    archivedLog = clickLog.filter(entry => entry.isArchived);

    archivedLog.forEach((entry, index) => {
        const logEntryDiv = document.createElement('div');
        logEntryDiv.className = 'archive-entry';

        const titleElement = document.createElement('div');
        titleElement.className = 'title';
        titleElement.textContent = entry.elementText;

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
        el.classList.add('animate')
    });

    document.querySelectorAll('.addEntryContainer').forEach(el => {
        el.style.pointerEvents = 'none'; // Disable interaction
    });



    setTimeout(() => {

        this.classList.add('draggable');
    }, 0);
}

function dragOver(e) {
    e.preventDefault();

    // Ensure `draggedItem` is globally defined
    if (!draggedItem) return;

    // Get bounding box of the current element
    const bounding = this.getBoundingClientRect();

    // Calculate the midpoint of the current element
    const midpoint = bounding.y + bounding.height / 2;

    // Parent container for the log entries
    const parent = this.parentNode;

    // Dragged below the midpoint: place after current element
    if (e.clientY > midpoint) {
        if (this.nextSibling !== draggedItem) {
            parent.insertBefore(draggedItem, this.nextSibling);
        }
    }
    // Dragged above the midpoint: place before current element
    else {
        if (this !== draggedItem) {
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
    const reorderedIds = Array.from(parent.querySelectorAll(".container.block")).map(
        (block) => parseInt(block.dataset.id)
    );
    clickLog = reorderedIds.map((id) => clickLog.find((entry) => entry.id === id));
    console.log(reorderedIds, clickLog)
    draggedItem.classList.remove('draggable');
    saveClickLog();
}

function endDrag() {
    console.log(clickLog)
    // Restore visibility of elements
    document
        .querySelectorAll(".log-entry img, .log-entry p, .log-entry button")
        .forEach((el) => {
            el.classList.remove("hideOnDrag");
            el.classList.remove("animate");
        });
    document.querySelectorAll('.addEntryContainer').forEach(el => {
        el.style.pointerEvents = 'auto'; // Disable interaction
    });

}


function moveEntry(fromIndex, toIndex) {
    const entry = clickLog.splice(fromIndex, 1)[0];
    clickLog.splice(toIndex, 0, entry);
}

document.getElementById('reorder').addEventListener('click', function () {
    reorder = !reorder;
    renderLog()
    if (reorder) { dragStart() } else { endDrag() }
})

// Set button text and functionality for returning to the previous tab
document.getElementById('openFlow')?.addEventListener('click', function () {
    // Send message to go back to the previous tab
    chrome.runtime.sendMessage({ action: 'goBack' });
});





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




document.getElementById('printPDF').addEventListener('click', function () {
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
    console.log(rect.height);
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
                    const imgHeight = imgRect.height;
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

