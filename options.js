document.addEventListener("DOMContentLoaded", function () {
  const addOptions = document.getElementById("add-options");
  const saveOptions = document.getElementById("save-options");
  // Load allowed URLs from storage and populate the form list
  chrome.storage.local.get("allowedURLs", function (data) {
    const allowedURLs = data.allowedURLs || [];
    allowedURLs.forEach((url) => {
      addOption(url);
    });
  });

  // Function to add a new option (URL) to the form list
  function addOption(url = "") {
    const form = document.querySelector("form");
    const input = document.createElement("input");
    input.type = "text";
    input.value = url;
    input.placeholder = "Enter URL";
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.className = "destructive-btn";
    removeButton.onclick = function () {
      this.parentElement.remove();
    };
    const option = document.createElement("div");
    option.className = 'row';
    option.appendChild(input);
    option.appendChild(removeButton);
    form.appendChild(option);
  }

  // Function to save options
  saveOptions.onclick = function () {
    const form = document.querySelector("form");
    const inputs = form.querySelectorAll('input[type="text"]');
    const urls = Array.from(inputs).map((input) => input.value);
    chrome.storage.local.set({ allowedURLs: urls }, function () {
      console.log("Options saved");
    });
  };

  // Function to add a new option when the "Add URL" button is clicked
  addOptions.onclick = function () {
    addOption();
  };
});
