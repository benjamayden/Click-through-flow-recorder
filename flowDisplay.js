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


document.addEventListener('DOMContentLoaded', () => {
    const flowTitleElement = document.getElementById('flowTitle');

    // Load saved title from Chrome storage
    chrome.storage.local.get(['flowTitle'], function (result) {
        if (result.flowTitle) {
            flowTitleElement.textContent = result.flowTitle;
        }
    });

    // Save title on blur or Enter key press
    flowTitleElement.addEventListener('blur', saveTitle);
    flowTitleElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();  // Prevents newline in the title
            saveTitle();
            flowTitleElement.blur();  // Blur to trigger save
        }
    });

    function saveTitle() {
        const newTitle = flowTitleElement.textContent;

        chrome.storage.local.set({ flowTitle: newTitle }, function () {
            console.log('Flow title updated in storage');
        });
    }
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




document.getElementById('hideButtons').addEventListener('click', function () {
    window.print();
});


function captureElement(element) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas size based on the element's bounding box
    const rect = element.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = 1920*scale;
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

    // Function to render child elements (text, images)
    async function renderChildren() {
        for (const child of element.childNodes) {
            console.log(child.tagName)
if (child.classList && child.classList.contains('title')) {
                console.log("making title")
                // Render title elements
                context.font = 'bold 32px Arial';
                context.fillStyle = 'black';
                context.fillText(child.textContent, 10, 20); // Adjust positioning as needed
            } else if (child.classList && child.classList.contains('description')) {
                console.log("making description")
                // Render description text
                context.font = '16px Arial';
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
                        imgRect.left + rect.left*1.45,
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
                item.style.width = '50%';
            });
        }
    }
});






document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('log');
    let clickLog = [];

    // Load clickLog from storage
    chrome.storage.local.get(['clickLog'], function (result) {
        clickLog = result.clickLog || [];
        renderLog();
    });

    // Toolbar Buttons
    document.getElementById('addH2').addEventListener('click', () => addNewBlock('h2'));
    document.getElementById('addP').addEventListener('click', () => addNewBlock('p'));
    document.getElementById('addLogEntry').addEventListener('click', addNewLogEntry);

    function addNewBlock(type) {
        const newBlock = { elementText: '', description: '', dataUrl: '' };

        switch (type) {
            case 'h2':
                newBlock.elementText = 'New H2 Heading';
                break;
            case 'p':
                newBlock.description = 'New Paragraph...';
                break;
        }

        clickLog.push(newBlock);
        saveClickLog();
        renderLog();
    }

    function addNewLogEntry() {
        const newEntry = { elementText: 'New Log Title', description: 'Log description...', dataUrl: '' };
        clickLog.push(newEntry);
        saveClickLog();
        renderLog();
    }

    function renderLog() {
        editor.innerHTML = '';

        if (clickLog.length === 0) {
            editor.textContent = 'No logs recorded.';
            return;
        }

        clickLog.forEach((entry, index) => {
            const logEntryDiv = document.createElement('div');
            logEntryDiv.className = 'log-entry container';
            logEntryDiv.setAttribute('draggable', 'true');

            const titleElement = document.createElement('h2');
            titleElement.className = 'block';
            titleElement.contentEditable = 'true';
            titleElement.textContent = entry.elementText;
            titleElement.setAttribute('draggable', 'true');

            const descriptionParagraph = document.createElement('p');
            descriptionParagraph.className = 'block';
            descriptionParagraph.contentEditable = 'true';
            descriptionParagraph.textContent = entry.description;
            descriptionParagraph.setAttribute('draggable', 'true');

            const imgElement = document.createElement('img');
            imgElement.className = 'block';
            imgElement.src = entry.dataUrl;
            imgElement.setAttribute('draggable', 'true');

            editor.appendChild(titleElement);
            editor.appendChild(descriptionParagraph);
            editor.appendChild(imgElement);

            // Auto-save changes on blur
            [titleElement, descriptionParagraph].forEach(el => {
                el.addEventListener('blur', () => {
                    entry.elementText = titleElement.textContent;
                    entry.description = descriptionParagraph.textContent;
                    saveClickLog();
                });
            });

            addDragEvents(titleElement);
            addDragEvents(descriptionParagraph);
            addDragEvents(imgElement);
            editor.appendChild(logEntryDiv);
        });
    }

    function saveClickLog() {
        chrome.storage.local.set({ clickLog }, function () {
            console.log('Click log updated in storage');
        });
    }

    function addDragEvents(block) {
        block.addEventListener('dragstart', (e) => {
            block.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        block.addEventListener('dragend', () => {
            block.classList.remove('dragging');
            saveClickLog();
            renderLog();
        });
    }

    editor.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(editor, e.clientY);
        const draggingBlock = document.querySelector('.dragging');
        if (afterElement == null) {
            editor.appendChild(draggingBlock);
        } else {
            editor.insertBefore(draggingBlock, afterElement);
        }
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.log-entry:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
});




// Initialize flowTitle on page load
initializeFlowTitle();
// Initial check to hide buttons if the log is empty on page load
hideButtonsIfLogIsEmpty();