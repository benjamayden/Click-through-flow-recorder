// Initialize variables
let isEditMode = true;
let clickLog = [];
let archivedLog = [];
let reorder = false;
let nextId = 999;

loadClickLog();

function showToastMessage(message, clickableElement = null, onClick = null) {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  // Create a new toast
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = message; // Use innerHTML to allow adding HTML elements
  toastContainer.appendChild(toast);

  // Add clickable element if provided
  if (clickableElement && onClick) {
    const clickable = document.createElement("span");
    clickable.className = "toast-clickable";
    clickable.textContent = clickableElement;
    // Attach the click event
    clickable.addEventListener("click", onClick);

    // Append the clickable element to the toast
    toast.appendChild(clickable);
  }

  // Show the toast after a brief delay
  setTimeout(() => {
    toastContainer.classList.add("show");
    toast.classList.add("show");
  }, 100);

  // Remove the toast after 5 seconds (3 seconds + extra 2 seconds)
  setTimeout(() => {
    toastContainer.classList.remove("show");
    toast.classList.remove("show");

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

document.getElementById("flowTitle").addEventListener("blur", function() {
  const flowTitle = this.textContent.trim();
  chrome.storage.local.set({ flowTitle }, function() {});
});


// Load click log from storage
function loadClickLog() {
  chrome.storage.local.get(
    ["clickLog", "archivedLog", "flowTitle"],
    function (result) {
      const flowTitleElement = document.getElementById("flowTitle");
      flowTitleElement.textContent = result.flowTitle || "Click Log"; // Default title if not set
      let renderedLog = [];
      let id = -1;
      result.clickLog.forEach((entry) => {
        if (entry.id !== id) {
          nextId++;
          id = entry.id;
          renderedLog.push(entry);
        }
      });
      clickLog = renderedLog || [];
      archivedLog = result.archivedLog || [];
      renderLog();
      renderArchivedLog();
    }
  );
}

// Save click log to storage
function saveClickLog() {
  chrome.storage.local.set({ clickLog, archivedLog }, function () {});
  chrome.runtime.sendMessage({ action: "updatePanelFromFlow" });

  const isEditingText = document.getElementById("isEditingText");
  // Set the "Saved!" text and fade it in
  isEditingText.innerText = "Saved!";
  isEditingText.classList.remove("remove"); // Ensure the animation reset

  // Wait 3 seconds, then fade out
  setTimeout(() => {
    isEditingText.classList.add("remove"); // Trigger the "shrink" animation
  }, 1700);

  // Optionally clear the text after the animation completes (e.g., after 0.3s)
  setTimeout(() => {
    isEditingText.innerText = ""; // Clear the text after fade-out
  }, 2000); // Match the animation duration (0.3s in the CSS)
}

// Render the click log
function renderLog() {
  const logDiv = document.getElementById("log");
  logDiv.innerHTML = "";

  if (clickLog.length === 0) {
    logDiv.textContent = "No logs recorded.";
    return;
  }

  clickLog.forEach((entry, index) => {
    if (entry.isArchived) return; // Skip archived entries
    const blockContainer = document.createElement("div");
    blockContainer.className = "container block";
    blockContainer.dataset.id = entry.id;
    blockContainer.id = entry.id;
    const logEntryDiv = document.createElement("div");
    logEntryDiv.className = "log-entry container";
    if (entry.class) logEntryDiv.classList.add(entry.class);
    logEntryDiv.draggable = reorder;

    if (reorder) {
      // Handle drag events
      blockContainer.addEventListener("dragstart", dragStart);
      blockContainer.addEventListener("dragover", dragOver);
      blockContainer.addEventListener("dragend", drop);
    }

    // Content editable when in edit mode
    const titleElement = document.createElement("h3");
    titleElement.className = "title";
    titleElement.textContent = entry.elementText;
    if(titleElement.textContent === "Enter header")  {titleElement.classList.add("hide-on-print", 'placeHolderText')}
    titleElement.contentEditable = isEditMode;
    if (isEditMode) titleElement.classList.add("editable");
    
    titleElement.onblur = function() {
        if(titleElement.textContent === ""){
            titleElement.textContent = "Enter header";
            titleElement.classList.add("hide-on-print", 'placeHolderText');
            entry.elementText = "";
        }else{
            entry.elementText = titleElement.textContent;
        }
        
        saveClickLog();
      };
      titleElement.addEventListener("focus", function() {
        if (titleElement.textContent === "Enter header") {
            titleElement.classList.remove("hide-on-print", 'placeHolderText');
            titleElement.textContent = "";
        }else if(titleElement.textContent === ""){
            titleElement.textContent = "Enter header";
            titleElement.classList.add("hide-on-print", 'placeHolderText');
        }
      });
    


    const descriptionContainer = document.createElement("div");
    descriptionContainer.className = "description-container";
    descriptionContainer.contentEditable = isEditMode;
    if (isEditMode) descriptionContainer.classList.add("editable");
    if(descriptionContainer.textContent.trim() === "Enter description")  {descriptionContainer.classList.add("hide-on-print", 'placeHolderText')}
    // Helper function to save the content from the container
    function saveDescription() {
      const paragraphs = Array.from(descriptionContainer.querySelectorAll("p"));
      const description = paragraphs
        .map((paragraph) => paragraph.textContent.trim())
        .filter((text) => text !== "") // Exclude empty paragraphs
        .join("\n");
      entry.description = description; // Update entry.description
      saveClickLog(); // Save to the log
    }

    // Populate description container with existing content
    if (entry.description?.trim()) {
      entry.description.split("\n").forEach((line) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = line.trim();
        descriptionContainer.appendChild(paragraph);
      });
    } else {
      const placeholderParagraph = document.createElement("p");
      placeholderParagraph.textContent = "Enter description";
      placeholderParagraph.classList.add("hide-on-print", "placeHolderText");
      descriptionContainer.appendChild(placeholderParagraph);
    }

    // Handle focus event to add a placeholder paragraph if the container is empty
    descriptionContainer.addEventListener("focus", () => {
      if (descriptionContainer.children.length === 0) {
        const placeholderParagraph = document.createElement("p");
        placeholderParagraph.textContent = "Enter description";
        placeholderParagraph.classList.add("hide-on-print", "placeHolderText");
        descriptionContainer.appendChild(placeholderParagraph);
      }
    });

    // Handle blur event to save the content when the user clicks away
    descriptionContainer.addEventListener("blur", saveDescription);

    // Save content before the page reloads or the tab is closed
    window.addEventListener("beforeunload", (e) => {
        const flowTitle = document.getElementById("flowTitle").textContent.trim();
        chrome.storage.local.set({ flowTitle });
        saveClickLog(); // Ensure content is saved
    });

    const addEntryContainer = document.createElement("div");
    addEntryContainer.className = "addEntryContainer hide-on-print";
    addEntryContainer.style.pointerEvents = "none";
    if (isEditMode) {
      addEntryContainer.classList.add("canAdd");
      addEntryContainer.style.pointerEvents = "auto";
    }

    const actionsContainer = document.createElement("div");
    actionsContainer.className = "action addEntry hide-on-print";
    addEntryContainer.appendChild(actionsContainer);

    const addEntryButton = document.createElement("button");
    addEntryButton.id = "addEntry";
    addEntryButton.className = "secondary-btn";
    addEntryButton.innerText = "Add";

    // Add click event listener to the button
    addEntryButton.addEventListener("click", function () {
      const newEntry = {
        elementText: "Enter title",
        description: "Enter description",
        dataUrl: "",
        alt: "",
        id: nextId,
        isArchived: false,
        class: "custom",
      };
      nextId++;

      clickLog.splice(index + 1, 0, newEntry); // Insert after the parent

      addEntryContainer.classList.add("growNewEntry");
      setTimeout(() => {
        saveClickLog(); // Save the updated log
        addEntryContainer.classList.remove("growNewEntry");
        renderLog();
      }, 250);
    });
    actionsContainer.appendChild(addEntryButton);

    // Remove button
    const removeButton = document.createElement("button");
    removeButton.className = "destructive-btn";
    removeButton.textContent = "Remove";
    removeButton.onclick = function () {
      // Add the animation class
      blockContainer.classList.add("remove");

      // Wait for the animation to complete before archiving and re-rendering
      setTimeout(() => {
        entry.isArchived = true; // Mark entry as archived
        saveClickLog(); // Save the updated click log
        renderLog(); // Re-render active logs
        renderArchivedLog(); // Re-render archived logs
      }, 300); // Match the duration of the animation (0.3s)
    };

    actionsContainer.appendChild(removeButton);

    // Append elements
    logEntryDiv.appendChild(titleElement);
    logEntryDiv.appendChild(descriptionContainer);

    if (entry.dataUrl && entry.dataUrl !== "") {
      // Create main container
      const imageContainer = document.createElement("div");
      imageContainer.className = "image-container";

      // Create canvas for displaying and cropping image
      const canvasElement = document.createElement("canvas");
      canvasElement.className = "imgElement";

      // Create crop area overlay
      const cropArea = document.createElement("div");
      cropArea.className = "crop-area";

      // Create crop button
      const cropButtonContainer = document.createElement("div");
      cropButtonContainer.className = "crop-button-container";
      const cropButton = document.createElement("button");
      cropButton.id = "crop-action";
      cropButton.className = "secondary-btn";
      cropButton.innerText = "Crop";
      cropButtonContainer.appendChild(cropButton);

      // Add everything to the DOM
      imageContainer.appendChild(cropButtonContainer);
      imageContainer.appendChild(canvasElement);
      imageContainer.appendChild(cropArea);
      logEntryDiv.appendChild(imageContainer);

      // Get the canvas context
      const ctx = canvasElement.getContext("2d");
      let isDragging = false;
      let cropStart = { x: 0, y: 0 };
      let cropEnd = { x: 0, y: 0 };

      // Load the dataUrl image
      const displayImage = new Image();
      displayImage.src = entry.dataUrl;
      displayImage.onload = () => {
        // Set canvas to original size
        canvasElement.width = displayImage.width;
        canvasElement.height = displayImage.height;

        // Fit the displayed canvas to the container
        const containerRect = imageContainer.getBoundingClientRect();
        const ratio = Math.min(
          containerRect.width / displayImage.width,
          containerRect.height / displayImage.height,
          1 // Don't enlarge small images
        );
        const displayWidth = displayImage.width * ratio;
        const displayHeight = displayImage.height * ratio;
        canvasElement.style.width = `${displayWidth}px`;
        canvasElement.style.height = `${displayHeight}px`;

        // Draw the image at full resolution onto the canvas
        ctx.drawImage(displayImage, 0, 0);
      };

      // Crop button click: re-load original image before cropping
      cropButton.addEventListener("click", () => {
        // Hide crop button
        cropButtonContainer.style.display = "none";
        imageContainer.style.cursor = "crosshair";
        const originalImage = new Image();
        originalImage.src = entry.originalImage; // Wipe dataUrl and load original

        originalImage.onload = () => {
          // Clear canvas before drawing
          ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

          // Set canvas to original size
          canvasElement.width = originalImage.width;
          canvasElement.height = originalImage.height;

          // Fit the displayed canvas to container
          const containerRect = imageContainer.getBoundingClientRect();
          const ratio = Math.min(
            containerRect.width / originalImage.width,
            containerRect.height / originalImage.height
          );
          const displayWidth = originalImage.width * ratio;
          const displayHeight = originalImage.height * ratio;
          canvasElement.style.width = `100%`;
          canvasElement.style.height = `auto`;

          // Draw the full original image
          ctx.drawImage(originalImage, 0, 0);

          // Reset crop coords
          isDragging = false;
          cropStart = { x: 0, y: 0 };
          cropEnd = { x: 0, y: 0 };

          // mousedown: start the crop box
          canvasElement.addEventListener("mousedown", (e) => {
            isDragging = true;
            const rect = canvasElement.getBoundingClientRect();
            cropStart.x =
              (e.clientX - rect.left) * (originalImage.width / rect.width);
            cropStart.y =
              (e.clientY - rect.top) * (originalImage.height / rect.height);

            // Position the crop area overlay
            cropArea.style.left = `${e.clientX - rect.left}px`;
            cropArea.style.top = `${e.clientY - rect.top}px`;
            cropArea.style.width = "0px";
            cropArea.style.height = "0px";
            cropArea.style.display = "block";
          });

          // mousemove: resize the crop box
          canvasElement.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            const rect = canvasElement.getBoundingClientRect();
            cropEnd.x =
              (e.clientX - rect.left) * (originalImage.width / rect.width);
            cropEnd.y =
              (e.clientY - rect.top) * (originalImage.height / rect.height);

            const left =
              Math.min(cropStart.x, cropEnd.x) /
              (originalImage.width / rect.width);
            const top =
              Math.min(cropStart.y, cropEnd.y) /
              (originalImage.height / rect.height);
            const width =
              Math.abs(cropEnd.x - cropStart.x) /
              (originalImage.width / rect.width);
            const height =
              Math.abs(cropEnd.y - cropStart.y) /
              (originalImage.height / rect.height);

            // Update crop area overlay in the DOM
            cropArea.style.left = `${left}px`;
            cropArea.style.top = `${top}px`;
            cropArea.style.width = `${width - 2}px`;
            cropArea.style.height = `${height - 2}px`;
          });

          // mouseup: finalise crop
          canvasElement.addEventListener("mouseup", () => {
            if (!isDragging) return;
            isDragging = false;
            cropArea.style.display = "none";

            const cropWidth = Math.abs(cropEnd.x - cropStart.x);
            const cropHeight = Math.abs(cropEnd.y - cropStart.y);
            const cropX = Math.min(cropStart.x, cropEnd.x);
            const cropY = Math.min(cropStart.y, cropEnd.y);

            // Create a new canvas for the cropped region
            const croppedCanvas = document.createElement("canvas");
            const croppedCtx = croppedCanvas.getContext("2d");
            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;

            // Draw the cropped area
            croppedCtx.drawImage(
              originalImage,
              cropX,
              cropY,
              cropWidth,
              cropHeight,
              0,
              0,
              cropWidth,
              cropHeight
            );

            // Convert to data URL
            const croppedDataUrl = croppedCanvas.toDataURL();
            entry.dataUrl = croppedDataUrl;

            // Display newly cropped image in our main canvas
            ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            canvasElement.width = croppedCanvas.width;
            canvasElement.height = croppedCanvas.height;
            canvasElement.style.width = `${croppedCanvas.width}px`;
            canvasElement.style.height = `${croppedCanvas.height}px`;
            ctx.drawImage(croppedCanvas, 0, 0);

            // Save and re-render
            imageContainer.style.cursor = "auto";
            saveClickLog();
            renderLog();
          });
        };

        originalImage.onerror = () => {
          console.error("Failed to load the original image.");
        };
      });
    const altTextElement = document.createElement("p");
    altTextElement.textContent = "alternative text";
    altTextElement.className = 'hide-on-print placeHolderText';
    altTextElement.contentEditable = "true";
    altTextElement.onblur = function() {
      entry.alt = altTextElement.textContent;
      saveClickLog();
    };
    altTextElement.addEventListener("focus", function() {
      if (altTextElement.textContent === "alternative text") {
        altTextElement.classList.remove("hide-on-print", 'placeHolderText');
        altTextElement.textContent = "";
      }else if(altTextElement.textContent === ""){
        altTextElement.textContent = "alternative text";
        altTextElement.classList.add("hide-on-print", 'placeHolderText');
      }
    });
    logEntryDiv.appendChild(altTextElement);
    }

    blockContainer.appendChild(logEntryDiv);
    blockContainer.appendChild(addEntryContainer);
    logDiv.appendChild(blockContainer);
  });
}

// Render archived entries
function renderArchivedLog() {
  const archivedDiv = document.getElementById("archivedEntries");
  archivedDiv.innerHTML = "";

  archivedLog = clickLog.filter((entry) => entry.isArchived);

  archivedLog.forEach((entry, index) => {
    const logEntryDiv = document.createElement("div");
    logEntryDiv.className = "archive-entry hide-on-print";

    const titleElement = document.createElement("h3");
    titleElement.className = "title";
    titleElement.textContent = entry.elementText;

    const restoreButton = document.createElement("button");
    restoreButton.className = "secondary-btn";
    restoreButton.textContent = "Restore";
    restoreButton.onclick = function () {
      let thisId = entry.id;
      entry.isArchived = false;

      saveClickLog();
      renderLog();
      renderArchivedLog();
      // Assuming you have a way to select the restored entry, for example:
      const restoredEntryElement = document.getElementById(thisId);

      // Scroll it into view
      if (restoredEntryElement) {
        restoredEntryElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    };

    // Create Remove Button
    const removeButton = document.createElement("button");
    removeButton.className = "destructive-btn danger"; // Add a danger class for styling
    removeButton.textContent = "Remove";
    removeButton.onclick = function () {
      // Remove the entry completely from clickLog
      clickLog = clickLog.filter((block) => block.id !== entry.id);

      // Save the updated log and re-render the archived log
      saveClickLog();
      renderArchivedLog();
      chrome.runtime.sendMessage({ action: "updatePanelFromFlow" });
    };
    //add a remove button that removes it entriely from storage

    logEntryDiv.appendChild(titleElement);
    logEntryDiv.appendChild(restoreButton);
    logEntryDiv.appendChild(removeButton);
    archivedDiv.appendChild(logEntryDiv);
  });
}

// Drag and Drop functions
let draggedItem = null;

function dragStart(e) {
  draggedItem = this;
  // Add the hideOnDrag class to all elements to be hidden
  document
    .querySelectorAll(".log-entry img, .log-entry p, .log-entry button")
    .forEach((el) => {
      el.classList.add("hideOnDrag");
      el.classList.add("animate");
    });

  document.querySelectorAll(".addEntryContainer").forEach((el) => {
    el.style.pointerEvents = "none"; // Disable interaction
  });

  setTimeout(() => {
    this.classList.add("draggable");
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
  const reorderedIds = Array.from(
    parent.querySelectorAll(".container.block")
  ).map((block) => parseInt(block.dataset.id));
  clickLog = reorderedIds.map((id) =>
    clickLog.find((entry) => entry.id === id)
  );
  draggedItem.classList.remove("draggable");
  saveClickLog();
}

function endDrag() {
  // Restore visibility of elements
  document
    .querySelectorAll(".log-entry img, .log-entry p, .log-entry button")
    .forEach((el) => {
      el.classList.remove("hideOnDrag");
      el.classList.remove("animate");
    });
  document.querySelectorAll(".addEntryContainer").forEach((el) => {
    el.style.pointerEvents = "auto"; // Disable interaction
  });
}

function moveEntry(fromIndex, toIndex) {
  const entry = clickLog.splice(fromIndex, 1)[0];
  clickLog.splice(toIndex, 0, entry);
}

document.getElementById("reorder").addEventListener("click", function () {
  reorder = !reorder;
  const reorderSpan = document.getElementById("reorderSpan");
  const finishSpan = document.getElementById("finishedSpan");
  renderLog();
  if (reorder) {
    dragStart();
    finishSpan.style.display = "flex";
    reorderSpan.style.display = "none";
  } else {
    endDrag();
    finishSpan.style.display = "none";
    reorderSpan.style.display = "flex";
  }
});

// Set button text and functionality for returning to the previous tab
document.getElementById("openFlow")?.addEventListener("click", function () {
  // Send message to go back to the previous tab
  chrome.runtime.sendMessage({ action: "goBack" });
});

// Function to check if log is empty and hide/show buttons accordingly
function hideButtonsIfLogIsEmpty() {
  chrome.storage.local.get(["clickLog"], function (result) {
    const clickLog = result.clickLog || [];

    // Get the buttons you want to hide/show
    const buttons = document.getElementsByTagName("button"); // Get all button elements
    const footer = document.getElementById("footer");
    // Convert HTMLCollection to an array for easy iteration
    const buttonArray = Array.from(buttons);

    if (clickLog.length === 0) {
      // Hide buttons if the log is empty
      buttonArray.forEach((button) => (button.style.display = "none"));
      footer.style.display = "none";
    }
  });
}

document.getElementById("printPDF").addEventListener("click", function () {
  saveClickLog();
  renderLog();
  window.print();
});

document
  .getElementById("saveImages")
  .addEventListener("click", async function () {
    const logEntries = document.querySelectorAll(".log-entry"); // Select all log entries
    const flowTitle = document.getElementById("flowTitle")
      ? document.getElementById("flowTitle").textContent.trim()
      : "Flow";

    for (let entryIndex = 0; entryIndex < logEntries.length; entryIndex++) {
      const entry = logEntries[entryIndex];
      downloadImage(flowTitle, entry, entryIndex);
    }
  });

function downloadImage(flowTitle, entry, entryIndex = 0) {
  // Skip log entries with the class 'custom'
  if (entry.classList.contains("custom")) {
    return;
  }

  // Capture the image data from the canvas
  const canvas = entry.querySelector("canvas");
  if (canvas) {
    const imageData = canvas.toDataURL("image/png");

    // Create a filename for the saved image
    const filename = `${flowTitle}_${entryIndex + 1}.png`;

    // Create a link element to trigger the image download
    const link = document.createElement("a");
    link.href = imageData;
    link.download = filename;
    link.click();
  }
}

document.getElementById("toClipBoard").addEventListener("click", async () => {
  try {
    // Gather h1, h3, p, img, and canvas in document order
    const elements = document.querySelectorAll("h1, h3, p, img, canvas");
    let htmlContent = "";

    elements.forEach((element) => {
      // Build htmlContent by tag name
      if (element.tagName === "H1") {
        htmlContent += `<h1>${element.textContent}</h1>`;
      } else if (element.tagName === "H3") {
        htmlContent += `<h3>${element.textContent}</h3>`;
      } else if (
        element.tagName === "P" &&
        element.textContent.trim() !== "Enter description"
      ) {
        htmlContent += `<p>${element.textContent}</p>`;
      } else if (element.tagName === "IMG") {
        // Use the existing image source
        htmlContent += `<img src="${element.src}" alt="${
          element.alt || ""
        }" />`;
        htmlContent += `<p>&nbsp;&nbsp;&nbsp;</p>`;
      } else if (element.tagName === "CANVAS") {
        // Convert canvas to data URL before adding
        const dataUrl = element.toDataURL("image/png");
        htmlContent += `<img src="${dataUrl}" alt="${element.alt}" />`;
        htmlContent += `<p>&nbsp;&nbsp;&nbsp;</p>`;
      }
    });

    // Create a ClipboardItem with the HTML content
    const blob = new Blob([htmlContent], { type: "text/html" });
    const clipboardItem = new ClipboardItem({ "text/html": blob });
    await navigator.clipboard.write([clipboardItem]);

    showToastMessage("Content copied to clipboard!");
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    alert("Failed to copy content to clipboard.");
  }
});

chrome.storage.local.get(["clickLog"], function (result) {
  const logDiv = document.getElementById("log");
  let clickLog = result.clickLog || [];
  logDiv.innerHTML = ""; // Clear previous log

  if (clickLog.length === 0) {
    logDiv.textContent = "No logs recorded.";
    return;
  }

  // Function to save clickLog to Chrome storage

  renderLog(); // Initial rendering of the log
});

const getLinks = document.getElementById("getLinks");

getLinks.addEventListener("click", async () => {
  let links = "";
  chrome.storage.local.get(["clickLog"], async function (result) {
    if (result.clickLog) {
      result.clickLog.forEach((entry) => {
        if (entry.url) {
          links += `${entry.url},${entry.elementText}\n`;
        }
      });

      try {
        // Create a ClipboardItem with the text content
        const blob = new Blob([links], { type: "text/plain" });
        const clipboardItem = new ClipboardItem({ "text/plain": blob });
        await navigator.clipboard.write([clipboardItem]);
        showToastMessage("Links copied to clipboard successfully!");
      } catch (error) {
        console.error("Failed to copy links to clipboard:", error);
      }
    } else {
      console.warn("No clickLog found in storage.");
    }
  });
});
