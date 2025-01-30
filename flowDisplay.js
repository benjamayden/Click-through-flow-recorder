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

document.getElementById("flowTitle").addEventListener("blur", function () {
  const flowTitle = this.textContent.trim();
  chrome.storage.local.set({ flowTitle }, function () {});
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

    //---------Render Header -----------//

    const titleElement = document.createElement("input");
    titleElement.type = "text";
    titleElement.placeholder = "Enter header"; // Native placeholder
    titleElement.value = entry.elementText || ""; // Existing value or empty
    titleElement.className = "editable headerText";
    titleElement.addEventListener("blur", () => {
      entry.elementText = titleElement.value.trim(); // Save on blur
      saveClickLog();
    });
    logEntryDiv.appendChild(titleElement);

    //---------Render description -----------//

    // Create Description Textarea
    const descriptionTextarea = document.createElement("textarea");
    descriptionTextarea.placeholder = "Enter description";
    descriptionTextarea.value = entry.description || ""; // Populate with existing value
    descriptionTextarea.className = "editable descriptionText";
    descriptionTextarea.style.resize = "none"; // Prevent manual resizing

    // Auto-grow textarea on input
    descriptionTextarea.addEventListener("input", () => {
      descriptionTextarea.style.height = "auto"; // Reset height
      descriptionTextarea.style.height = `${descriptionTextarea.scrollHeight}px`; // Adjust to content
    });

    // Save description on blur
    descriptionTextarea.addEventListener("blur", () => {
      entry.description = descriptionTextarea.value.trim();
      saveClickLog();
    });
    logEntryDiv.appendChild(descriptionTextarea);

    //---------------Add new section------------//

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
        originalImage: "",
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

    //--------------Image--------------------//

    if (entry.dataUrl && entry.dataUrl !== "") {
      //----------------Entry Actions---------------------//
      // Create main container
      const imageContainer = document.createElement("div");
      imageContainer.className = "image-container";
      // Create canvas for displaying and cropping image
      const canvasElement = document.createElement("canvas");
      canvasElement.className = "imgElement";

      // Create crop area overlay
      const cropArea = document.createElement("div");
      cropArea.className = "crop-area";

      //----------------Crop---------------------//
      // Create crop button
      const cropButtonContainer = document.createElement("div");
      cropButtonContainer.className = "crop-button-container";
      const cropButton = document.createElement("button");
      cropButton.id = "crop-action";
      cropButton.className = "secondary-btn entry-action";
      cropButton.setAttribute("aria-label", "Crop Image");

      cropButton.appendChild(createCropIcon());

      //cropButton.appendChild(document.createTextNode("Crop"));
      cropButtonContainer.appendChild(cropButton);

      //----------------Copy---------------------//
      const copyButton = document.createElement("button");
      copyButton.id = "copy-action";
      copyButton.className = "secondary-btn entry-action";
      copyButton.setAttribute("aria-label", "Copy Image");
      copyButton.appendChild(createClipboardPlusIcon());
      //copyButton.appendChild(document.createTextNode("Copy"));
      cropButtonContainer.appendChild(copyButton);

      //----------------Archive---------------------//
      // Remove button
      const removeButton = document.createElement("button");
      removeButton.className = "destructive-btn entry-action";
      copyButton.setAttribute("aria-label", "archive section");
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
      removeButton.appendChild(createArchiveBoxIcon());
      //removeButton.appendChild(document.createTextNode("Archive"));
      cropButtonContainer.appendChild(removeButton);

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
      displayImage.alt = entry.alt;
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

      copyButton.addEventListener("click", () => {
        const copyIconComplete = document.getElementById("copy-action").firstChild;

        // Show the "complete" icon temporarily
        copyIconComplete.classList.add("complete");

        // Hide the "complete" icon and revert to the original one after 2 seconds
        setTimeout(() => {
          copyIconComplete.classList.remove("complete");
        }, 2000); // 2000ms = 2 seconds
        const imageDataUrl = entry.dataUrl;
        copyImageToClipboard(imageDataUrl);
      });
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

      //--------------------image alt text----------------//

      const altTextInput = document.createElement("input");
      altTextInput.type = "text";
      altTextInput.placeholder = "Image alt text";
      altTextInput.value = entry.alt || ""; // Existing value or empty
      altTextInput.className = "editable altText";
      altTextInput.addEventListener("blur", () => {
        entry.alt = altTextInput.value.trim();
        saveClickLog();
      });
      logEntryDiv.appendChild(altTextInput);
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

document.getElementById("toClipBoard").addEventListener("click", async () => {
  try {
    const copyIconComplete = document.getElementById("copy-icon");

    // Show the "complete" icon temporarily
    copyIconComplete.classList.add("complete");

    // Hide the "complete" icon and revert to the original one after 2 seconds
    setTimeout(() => {
      copyIconComplete.classList.remove("complete");
    }, 2000); // 2000ms = 2 seconds

    // Retrieve data from Chrome storage
    const { flowTitle, clickLog } = await new Promise((resolve, reject) => {
      chrome.storage.local.get(["flowTitle", "clickLog"], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });

    // Build the HTML content from storage
    let htmlContent = "";

    // Add the flow title (h1)
    if (flowTitle) {
      htmlContent += `<h1>${flowTitle}</h1>`;
    }

    // Add the click log entries
    if (Array.isArray(clickLog)) {
      clickLog.forEach((entry) => {
        if (entry.elementText) {
          htmlContent += `<h3>${entry.elementText}</h3>`;
        }
        if (entry.description) {
          htmlContent += `<p>${entry.description}</p>`;
        }
        if (entry.dataUrl) {
          htmlContent += `<img src="${entry.dataUrl}" alt="${
            entry.alt || ""
          }" />`;
          htmlContent += `<p>&nbsp;&nbsp;&nbsp;</p>`;
        }
      });
    }

    // Create a ClipboardItem with the HTML content
    const blob = new Blob([htmlContent], { type: "text/html" });
    const clipboardItem = new ClipboardItem({ "text/html": blob });
    await navigator.clipboard.write([clipboardItem]);

    showToastMessage("All content copied to clipboard!");
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    alert("Failed to copy content to clipboard.");
  }
});

async function copyImageToClipboard(imageDataUrl) {
  try {
    if (!imageDataUrl) {
      showToastMessage("No image found to copy.");
      return;
    }

    const image = new Image();
    image.src = imageDataUrl;

    image.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set canvas size to match image dimensions
      canvas.width = image.width;
      canvas.height = image.height;

      // Draw image onto canvas
      ctx.drawImage(image, 0, 0);

      // Convert canvas to a PNG Blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          showToastMessage("Image copied to clipboard!");
        } else {
          console.error("Failed to generate PNG from canvas");
          alert("Failed to copy image.");
        }
      }, "image/png");
    };

    image.onerror = () => {
      console.error("Failed to load image.");
      alert("Failed to load image.");
    };
  } catch (error) {
    console.error("Error copying image to clipboard:", error);
    alert("Failed to copy image.");
  }
}

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

// Listen for messages from content.js to refresh the log display
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("screenshot taken");
  if (request.action === "refreshLog") {
    // Retrieve the updated log from storage and display it
    loadClickLog();
  }
});

document.getElementById("clearLog").addEventListener("click", function () {
  const confirmDelete = confirm(
    "Are you sure you want to delete the log? This action is irreversible."
  );
  if (confirmDelete) {
    // Clear the log and flowTitle
    chrome.storage.local.set({ clickLog: [], flowTitle: "" }, function () {
      displayLog([]); // Clear the displayed log
      showToastMessage("Log and flow title cleared.");
      chrome.runtime.sendMessage({ action: "updatePanelFromFlow" });
      chrome.tabs.getCurrent((tab) => {
        if (tab) {
          chrome.tabs.remove(tab.id);
          showToastMessage("Current tab closed.");
        } else {
          console.error("Failed to close the current tab.");
        }
      });
    });
  } else {
    // Action was cancelled, no need to do anything
    showToastMessage("Log deletion cancelled.");
  }
});

document.getElementById("option-btn").addEventListener("click", () => {
  const dropdownMenu = document.getElementById("dropdownMenu");
  dropdownMenu.style.display =
    dropdownMenu.style.display === "block" ? "none" : "block";
});
// Close dropdown when clicking outside
document.addEventListener("click", (event) => {
  const dropdown = document.querySelector(".dropdown");
  const dropdownMenu = document.getElementById("dropdownMenu");

  if (!dropdown.contains(event.target)) {
    dropdownMenu.style.display = "none";
  }
});

// Hide dropdown menu when the mouse leaves the document
document.addEventListener("mouseleave", () => {
  const dropdownMenu = document.getElementById("dropdownMenu");
  dropdownMenu.style.display = "none"; // Hide the dropdown menu
});

document.getElementById("download-png").addEventListener("click", () => {
  batchDownloadImages();
});

function batchDownloadImages() {
  const flowTitle =
    document.getElementById("flowTitle").textContent.trim() || "Flow";
  const canvases = document.querySelectorAll("canvas.imgElement");

  if (canvases.length === 0) {
    showToastMessage("No images found to download.");
    return;
  }

  canvases.forEach((canvas, index) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${flowTitle}-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } else {
        console.error(`Failed to generate PNG for canvas ${index + 1}`);
      }
    }, "image/png");
  });

  showToastMessage("Images downloaded successfully!");
}

function createCropIcon() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.id = 'entry-copy-icon';
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute(
    "d",
    "M10 6H14.8C15.9201 6 16.4802 6 16.908 6.21799C17.2843 6.40973 17.5903 6.71569 17.782 7.09202C18 7.51984 18 8.07989 18 9.2V14M2 6H6M18 18V22M22 18L9.2 18C8.07989 18 7.51984 18 7.09202 17.782C6.71569 17.5903 6.40973 17.2843 6.21799 16.908C6 16.4802 6 15.9201 6 14.8V2"
  );
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svg.appendChild(path);
  return svg;
}

function createArchiveBoxIcon() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute(
    "d",
    "M20.5 8V16.2C20.5 17.8802 20.5 18.7202 20.173 19.362C19.8854 19.9265 19.4265 20.3854 18.862 20.673C18.2202 21 17.3802 21 15.7 21H8.3C6.61984 21 5.77976 21 5.13803 20.673C4.57354 20.3854 4.1146 19.9265 3.82698 19.362C3.5 18.7202 3.5 17.8802 3.5 16.2V8M3.6 3H20.4C20.9601 3 21.2401 3 21.454 3.10899C21.6422 3.20487 21.7951 3.35785 21.891 3.54601C22 3.75992 22 4.03995 22 4.6V6.4C22 6.96005 22 7.24008 21.891 7.45399C21.7951 7.64215 21.6422 7.79513 21.454 7.89101C21.2401 8 20.9601 8 20.4 8H3.6C3.03995 8 2.75992 8 2.54601 7.89101C2.35785 7.79513 2.20487 7.64215 2.10899 7.45399C2 7.24008 2 6.96005 2 6.4V4.6C2 4.03995 2 3.75992 2.10899 3.54601C2.20487 3.35785 2.35785 3.20487 2.54601 3.10899C2.75992 3 3.03995 3 3.6 3ZM9.6 11.5H14.4C14.9601 11.5 15.2401 11.5 15.454 11.609C15.6422 11.7049 15.7951 11.8578 15.891 12.046C16 12.2599 16 12.5399 16 13.1V13.9C16 14.4601 16 14.7401 15.891 14.954C15.7951 15.1422 15.6422 15.2951 15.454 15.391C15.2401 15.5 14.9601 15.5 14.4 15.5H9.6C9.03995 15.5 8.75992 15.5 8.54601 15.391C8.35785 15.2951 8.20487 15.1422 8.10899 14.954C8 14.7401 8 14.4601 8 13.9V13.1C8 12.5399 8 12.2599 8.10899 12.046C8.20487 11.8578 8.35785 11.7049 8.54601 11.609C8.75992 11.5 9.03995 11.5 9.6 11.5Z"
  );
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svg.appendChild(path);
  return svg;
}

function createClipboardPlusIcon() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute(
    "d",
    "M16 4C16.93 4 17.395 4 17.7765 4.10222C18.8117 4.37962 19.6204 5.18827 19.8978 6.22354C20 6.60504 20 7.07003 20 8V17.2C20 18.8802 20 19.7202 19.673 20.362C19.3854 20.9265 18.9265 21.3854 18.362 21.673C17.7202 22 16.8802 22 15.2 22H8.8C7.11984 22 6.27976 22 5.63803 21.673C5.07354 21.3854 4.6146 20.9265 4.32698 20.362C4 19.7202 4 18.8802 4 17.2V8C4 7.07003 4 6.60504 4.10222 6.22354C4.37962 5.18827 5.18827 4.37962 6.22354 4.10222C6.60504 4 7.07003 4 8 4M12 17V11M9 14H15M9.6 6H14.4C14.9601 6 15.2401 6 15.454 5.89101C15.6422 5.79513 15.7951 5.64215 15.891 5.45399C16 5.24008 16 4.96005 16 4.4V3.6C16 3.03995 16 2.75992 15.891 2.54601C15.7951 2.35785 15.6422 2.20487 15.454 2.10899C15.2401 2 14.9601 2 14.4 2H9.6C9.03995 2 8.75992 2 8.54601 2.10899C8.35785 2.20487 8.20487 2.35785 8.10899 2.54601C8 2.75992 8 3.03995 8 3.6V4.4C8 4.96005 8 5.24008 8.10899 5.45399C8.20487 5.64215 8.35785 5.79513 8.54601 5.89101C8.75992 6 9.03995 6 9.6 6Z"
  );
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svg.appendChild(path);
  return svg;
}
