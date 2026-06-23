// ---------- DOM ELEMENTS ----------
const video = document.getElementById('webcam');
const canvasBg = document.getElementById('canvas-bg');
const canvasDrawing = document.getElementById('canvas-drawing');
const canvasUi = document.getElementById('canvas-ui');
const loadingOverlay = document.getElementById('loading-overlay');
const toast = document.getElementById('toast');

const ctxBg = canvasBg.getContext('2d');
const ctxDrawing = canvasDrawing.getContext('2d', { willReadFrequently: true });
const ctxUi = canvasUi.getContext('2d');

const colorButtons = document.querySelectorAll('.color-btn');
const actionButtons = document.querySelectorAll('.action-btn');

// ---------- APP CONFIG / STATE ----------
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const BRUSH_THICKNESS = 12;

let currentDrawingColor = '#FF0000'; // Default is Red
let isEraserMode = false;

// Drawing state
let xp = 0;
let yp = 0;

// History stacks for Undo / Redo
const maxHistorySize = 25;
let undoHistory = [];
let redoHistory = [];

// UI Interaction State
let hoveredButton = null;
let hoverStartTime = null;
const HOVER_ACTIVATION_MS = 1000; // 1 second to select

// Keep track of active button for styling
let activeColorButton = document.getElementById('btn-red');

// Save the blank canvas state initially so undo can clear it
function initHistory() {
  saveHistoryState();
}

function saveHistoryState() {
  if (undoHistory.length >= maxHistorySize) {
    undoHistory.shift(); // Remove oldest
  }
  undoHistory.push(ctxDrawing.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
  redoHistory = []; // Clear redo stack on new action
}

// ---------- GESTURE RECOGNITION ----------
function getFingersUp(landmarks) {
  // Landmarks indices for tips
  const tipsIds = [4, 8, 12, 16, 20];
  const fingers = [];

  // Thumb check (mirrored view): x-coordinate of tip < x-coordinate of base
  fingers.push(landmarks[tipsIds[0]].x < landmarks[tipsIds[0] - 1].x);

  // Other fingers check: y-coordinate of tip < y-coordinate of joint (lower y is higher up)
  for (let i = 1; i < 5; i++) {
    fingers.push(landmarks[tipsIds[i]].y < landmarks[tipsIds[i] - 2].y);
  }

  return fingers; // [thumb, index, middle, ring, pinky]
}

// ---------- BUTTON COLLISION DETECTION ----------
function getElementUnderPoint(clientX, clientY) {
  // Check color buttons
  for (const btn of colorButtons) {
    const rect = btn.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top && clientY <= rect.bottom) {
      return btn;
    }
  }

  // Check action buttons
  for (const btn of actionButtons) {
    const rect = btn.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top && clientY <= rect.bottom) {
      return btn;
    }
  }

  return null;
}

// ---------- COLOR / ACTION TRIGGERS ----------
function handleColorSelect(btn) {
  const color = btn.getAttribute('data-color');
  
  if (activeColorButton) {
    activeColorButton.classList.remove('active');
  }
  btn.classList.add('active');
  activeColorButton = btn;

  if (btn.classList.contains('eraser-btn')) {
    isEraserMode = true;
  } else {
    isEraserMode = false;
    currentDrawingColor = color;
  }
}

function handleActionTrigger(btnId) {
  switch (btnId) {
    case 'btn-clear':
      saveHistoryState();
      ctxDrawing.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      showToast('Canvas Cleared!');
      break;

    case 'btn-undo':
      if (undoHistory.length > 0) {
        redoHistory.push(ctxDrawing.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
        const prevState = undoHistory.pop();
        ctxDrawing.putImageData(prevState, 0, 0);
        showToast('Undo');
      }
      break;

    case 'btn-redo':
      if (redoHistory.length > 0) {
        undoHistory.push(ctxDrawing.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
        const nextState = redoHistory.pop();
        ctxDrawing.putImageData(nextState, 0, 0);
        showToast('Redo');
      }
      break;

    case 'btn-save':
      saveCanvasImage();
      break;
  }
}

// Save drawing merged with the background video
function saveCanvasImage() {
  // Create a temporary canvas to merge both layers
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = CANVAS_WIDTH;
  tempCanvas.height = CANVAS_HEIGHT;
  const tempCtx = tempCanvas.getContext('2d');

  // 1. Draw mirrored background video
  tempCtx.translate(CANVAS_WIDTH, 0);
  tempCtx.scale(-1, 1);
  tempCtx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  tempCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

  // 2. Overlay the drawing canvas
  tempCtx.drawImage(canvasDrawing, 0, 0);

  // 3. Export as PNG download
  const link = document.createElement('a');
  link.download = `air_canvas_${Date.now()}.png`;
  link.href = tempCanvas.toDataURL('image/png');
  link.click();

  showToast('Saved to Downloads!');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// ---------- EVENT LISTENERS FOR CLICK CONTROLS ----------
// Allow standard clicks/taps as fallback
colorButtons.forEach(btn => {
  btn.addEventListener('click', () => handleColorSelect(btn));
});

actionButtons.forEach(btn => {
  btn.addEventListener('click', () => handleActionTrigger(btn.id));
});

// ---------- KEYBOARD SHORTCUTS ----------
document.addEventListener('keydown', (e) => {
  if (e.key === 'c' || e.key === 'C') {
    handleActionTrigger('btn-clear');
  }
});

// ---------- MAIN DRAWING FRAME FUNCTION ----------
let isModelLoaded = false;

function onHandResults(results) {
  // Hide loading screen on first successful frame
  if (!isModelLoaded) {
    isModelLoaded = true;
    loadingOverlay.classList.add('hidden');
    initHistory();
  }

  // Clear previous frame background & UI layer
  ctxBg.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctxUi.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. Render mirrored webcam video to canvas-bg
  ctxBg.save();
  ctxBg.translate(CANVAS_WIDTH, 0);
  ctxBg.scale(-1, 1);
  ctxBg.drawImage(results.image, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctxBg.restore();

  let targetHoverBtn = null;
  let clientX = 0;
  let clientY = 0;
  let ix = 0;
  let iy = 0;

  // 2. Process Hand Landmarks
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    // Compute coordinates of Index finger tip (landmark 8)
    // Mirror x value for natural user interface feedback
    ix = Math.round((1 - landmarks[8].x) * CANVAS_WIDTH);
    iy = Math.round(landmarks[8].y * CANVAS_HEIGHT);

    // Map drawing coordinate to HTML element client coordinate system
    const viewportRect = canvasUi.getBoundingClientRect();
    const xPercent = 1 - landmarks[8].x;
    const yPercent = landmarks[8].y;
    clientX = viewportRect.left + (xPercent * viewportRect.width);
    clientY = viewportRect.top + (yPercent * viewportRect.height);

    // Get gesture state
    const fingers = getFingersUp(landmarks);
    const indexFingerUp = fingers[1];
    const middleFingerUp = fingers[2];

    // Check if finger is hovering over a UI button
    const elementHovered = getElementUnderPoint(clientX, clientY);

    // Mode A: Selection mode (Index + Middle Up)
    if (indexFingerUp && middleFingerUp) {
      xp = 0; // Reset drawing path
      yp = 0;

      // Draw custom Selection Pointer (2 circles indicating selection Mode)
      ctxUi.beginPath();
      ctxUi.arc(ix, iy, 12, currentDrawingColor, 2);
      ctxUi.strokeStyle = '#FFFFFF';
      ctxUi.lineWidth = 2;
      ctxUi.stroke();

      const mix = Math.round((1 - landmarks[12].x) * CANVAS_WIDTH);
      const miy = Math.round(landmarks[12].y * CANVAS_HEIGHT);
      ctxUi.beginPath();
      ctxUi.arc(mix, miy, 8, '#FFFFFF', -1);
      ctxUi.fill();

      // Handle button hover logic
      if (elementHovered) {
        targetHoverBtn = elementHovered;
      }
    }
    // Mode B: Drawing mode (Index Up ONLY)
    else if (indexFingerUp && !middleFingerUp) {
      // If we just started a stroke, save snapshot for Undo
      if (xp === 0 && yp === 0) {
        saveHistoryState();
        xp = ix;
        yp = iy;
      }

      // Draw stroke on drawing canvas
      ctxDrawing.beginPath();
      ctxDrawing.moveTo(xp, yp);
      ctxDrawing.lineTo(ix, iy);

      if (isEraserMode) {
        ctxDrawing.globalCompositeOperation = 'destination-out';
        ctxDrawing.strokeStyle = 'rgba(0,0,0,1)';
        ctxDrawing.lineWidth = BRUSH_THICKNESS * 2.5; // Larger brush for erasing
      } else {
        ctxDrawing.globalCompositeOperation = 'source-over';
        ctxDrawing.strokeStyle = currentDrawingColor;
        ctxDrawing.lineWidth = BRUSH_THICKNESS;
      }

      ctxDrawing.lineCap = 'round';
      ctxDrawing.lineJoin = 'round';
      ctxDrawing.stroke();

      // Update trace anchor points
      xp = ix;
      yp = iy;

      // Draw active brush indicator on UI layer
      ctxUi.beginPath();
      ctxUi.arc(ix, iy, isEraserMode ? BRUSH_THICKNESS * 1.25 : BRUSH_THICKNESS / 2, isEraserMode ? 'rgba(255,255,255,0.5)' : currentDrawingColor, -1);
      if (isEraserMode) {
        ctxUi.strokeStyle = '#FFFFFF';
        ctxUi.lineWidth = 1.5;
        ctxUi.stroke();
      } else {
        ctxUi.fill();
      }
    }
    // Mode C: Resting mode (all other gestures)
    else {
      xp = 0;
      yp = 0;

      // Draw custom passive pointer circle
      ctxUi.beginPath();
      ctxUi.arc(ix, iy, 6, 'rgba(255, 255, 255, 0.4)', -1);
      ctxUi.fill();
    }

    // Draw full hand skeleton connectors
    drawConnectors(ctxUi, landmarks, HAND_CONNECTIONS, {color: 'rgba(255, 255, 255, 0.25)', lineWidth: 2});
    drawLandmarks(ctxUi, landmarks, {color: 'rgba(59, 130, 246, 0.6)', lineWidth: 1, radius: 4});
  } else {
    // Reset path when hand leaves the frame
    xp = 0;
    yp = 0;
  }

  // 3. UI Hover-to-Click Loader Animation Logic
  if (targetHoverBtn) {
    if (hoveredButton !== targetHoverBtn) {
      hoveredButton = targetHoverBtn;
      hoverStartTime = Date.now();
      targetHoverBtn.classList.add('btn-hover-progress');
    } else {
      const elapsed = Date.now() - hoverStartTime;
      const progress = Math.min(elapsed / HOVER_ACTIVATION_MS, 1);

      // Draw beautiful loading circular ring around pointer on UI canvas
      if (progress < 1) {
        ctxUi.beginPath();
        ctxUi.arc(ix, iy, 22, -Math.PI / 2, (-Math.PI / 2) + (2 * Math.PI * progress));
        ctxUi.strokeStyle = '#3b82f6';
        ctxUi.lineWidth = 4;
        ctxUi.stroke();

        // Draw shadow glow for ring
        ctxUi.shadowBlur = 8;
        ctxUi.shadowColor = '#3b82f6';
        ctxUi.stroke();
        ctxUi.shadowBlur = 0; // Reset shadow
      } else {
        // Trigger action once loading completes!
        hoveredButton.classList.remove('btn-hover-progress');
        
        if (hoveredButton.classList.contains('color-btn')) {
          handleColorSelect(hoveredButton);
        } else {
          handleActionTrigger(hoveredButton.id);
        }

        // Reset hover trackers to prevent double-firing
        hoveredButton = null;
        hoverStartTime = null;
      }
    }
  } else {
    if (hoveredButton) {
      hoveredButton.classList.remove('btn-hover-progress');
      hoveredButton = null;
      hoverStartTime = null;
    }
  }
}

// ---------- INITIALIZE MEDIAPIPE ----------
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(onHandResults);

// Setup webcam stream
const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({image: video});
  },
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT
});

// Start camera!
camera.start().catch(err => {
  console.error("Camera access failed: ", err);
  alert("Could not start camera. Please ensure camera access is granted in browser permissions and reload.");
});
