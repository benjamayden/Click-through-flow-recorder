const imageInput = document.getElementById('imageInput');
const imageCanvas = document.getElementById('imageCanvas');
const cropArea = document.getElementById('cropArea');
const copyButton = document.getElementById('copyButton');

const ctx = imageCanvas.getContext('2d');
let image = null;
let isDragging = false;
let cropStart = { x: 0, y: 0 };
let cropEnd = { x: 0, y: 0 };

imageInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      image = new Image();
      image.onload = () => {
// Actual pixel dimensions (full resolution)
imageCanvas.width = image.width;
imageCanvas.height = image.height;

// Measure container
const container = document.querySelector('.container');
const containerRect = container.getBoundingClientRect();

// Calculate scale ratio to fit the image in the container if needed
const ratio = Math.min(
  containerRect.width / image.width,
  containerRect.height / image.height,
  1 // Do not enlarge small images
);

// Scale the canvas in CSS
const displayWidth = image.width * ratio;
const displayHeight = image.height * ratio;
imageCanvas.style.width = `${displayWidth}px`;
imageCanvas.style.height = `${displayHeight}px`;

// Draw original resolution so cropping will be sharp
ctx.drawImage(image, 0, 0);

// for testing if needed Then draw your grid on the full resolution
// drawGrid(ctx, imageCanvas.width, imageCanvas.height, 10);

      };
      image.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});

imageCanvas.addEventListener('mousedown', (e) => {
  if (!image) return;
  isDragging = true;
  const rect = imageCanvas.getBoundingClientRect();
  const scaleX = imageCanvas.width / rect.width;
  const scaleY = imageCanvas.height / rect.height;
  cropStart.x = (e.clientX - rect.left) * scaleX;
  cropStart.y = (e.clientY - rect.top) * scaleY;
  cropArea.style.left = `${e.clientX - rect.left}px`;
  cropArea.style.top = `${e.clientY - rect.top}px`;
  cropArea.style.width = '0px';
  cropArea.style.height = '0px';
  cropArea.style.display = 'block';
});

imageCanvas.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const rect = imageCanvas.getBoundingClientRect();
    const scaleX = imageCanvas.width / rect.width;
    const scaleY = imageCanvas.height / rect.height;

    cropEnd.x = (e.clientX - rect.left) * scaleX;
    cropEnd.y = (e.clientY - rect.top) * scaleY;

    const left = Math.min(cropStart.x, cropEnd.x) / scaleX;
    const top = Math.min(cropStart.y, cropEnd.y) / scaleY;
    const width = Math.abs(cropEnd.x - cropStart.x) / scaleX;
    const height = Math.abs(cropEnd.y - cropStart.y) / scaleY;

    cropArea.style.left = `${left}px`;
    cropArea.style.top = `${top}px`;
    cropArea.style.width = `${width-2}px`;
    cropArea.style.height = `${height-2}px`;
  }
});

imageCanvas.addEventListener('mouseup', () => {
  isDragging = false;
});

copyButton.addEventListener('click', () => {
  if (!image || cropArea.style.display === 'none') return;

  const rect = imageCanvas.getBoundingClientRect();
  const scaleX = imageCanvas.width / rect.width;
  const scaleY = imageCanvas.height / rect.height;

  const cropX = Math.min(cropStart.x, cropEnd.x);
  const cropY = Math.min(cropStart.y, cropEnd.y);
  const cropWidth = Math.abs(cropEnd.x - cropStart.x)+2;
  const cropHeight = Math.abs(cropEnd.y - cropStart.y)+2;

  if (cropWidth === 0 || cropHeight === 0) return;

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  const croppedCtx = croppedCanvas.getContext('2d');

  croppedCtx.drawImage(
    imageCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  croppedCanvas.toBlob((blob) => {
    navigator.clipboard
      .write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ])
      .then(() => {
        alert('Cropped image copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy image:', err);
      });
  });
});

function drawGrid(ctx, width, height, gridSize) {
  ctx.strokeStyle = '#cccccc'; // Grid line colour
  ctx.lineWidth = 0.5; // Thin grid lines

  // Draw vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}
