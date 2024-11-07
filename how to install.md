# How to install and update

## Download a Zip

### Download the Extension Files

1. **Download the Extension**:

   * If the extension is available via a direct download link (such as a ZIP file), simply download the file and extract it to your **Documents** folder or any other location where you prefer to store it.

   * If it's hosted on a platform like GitHub, download the ZIP file by clicking the "Download ZIP" button, and then extract it.

2. **Unzip the File**: If the extension is in a ZIP file, unzip it by double-clicking the file. This will create a folder containing the extension's source files.

## Through terminal

### Download or Clone the Extension Repository

1. Open **Terminal** and navigate to your **Documents** directory (or wherever you'd like to store the extension files):

`cd ~/Documents`

2. Clone the repository

   `git clone https://github.com/benjamayden/Click-through-flow-recorder.git`

## Load the Extension in Chrome

1. **Open Google Chrome**.  
2. Go to the **Extensions** page by typing `chrome://extensions/` in the address bar and pressing **Enter**.  
3. **Enable Developer Mode**:   
   * In the top right corner of the Extensions page, toggle the switch for **Developer mode** to turn it on.  
4. **Load the Unpacked Extension**:  
   * Click the **Load unpacked** button.  
   * In the file dialog that opens, navigate to the folder where you extracted the extension files (from the ZIP download or the folder you cloned from GitHub).  
   * Select the folder and click **Open**.  
5. Your extension will now appear in the list of installed extensions and be active in Chrome. Pin the extension for easy access.

## Update the Extension 

### No Terminal Method

If the extension is updated and you want to get the latest version, follow these steps:

1. **Download the Latest Version**:  
   * Go to the location where the latest version of the extension is hosted (e.g., GitHub) and download the updated version as a ZIP file.  
2. **Extract and Replace the Existing Files**:  
   * Extract the ZIP file into the same folder where the previous version of the extension was stored, replacing the old files with the new ones.  
3. **Reload the Extension in Chrome**:  
   * Go back to `chrome://extensions/`.  
   * Find the Button Click Logger extension and click the **Reload** (circular arrow) button to apply the latest changes.

### Terminal Method (Pulling New Updates)

To get the latest updates, you can simply pull the latest changes from the repository using `git`:

1. **Open Terminal and navigate to the extension folder:**

`cd ~/Documents/ButtonClickLogger`

2. **Pull the latest changes:**

`git pull`

3. **After updating the code**

   * Go to **chrome://extensions/** and click the **Reload** button next to your Button Click Logger extension to apply the changes.
