// ---------- Configurations & Globals ----------
const PALETTE = [
    { name: 'RED', hex: '#ff3366' },
    { name: 'GREEN', hex: '#00f2fe' },
    { name: 'BLUE', hex: '#3b82f6' },
    { name: 'YELLOW', hex: '#f59e0b' },
    { name: 'MAGENTA', hex: '#ec4899' },
    { name: 'BLACK', hex: '#111827' }
];

let currentMode = 'gesture'; // 'gesture' or 'mouse'
let currentColor = PALETTE[0].hex;
let currentThickness = 12;

let drawing = false;
let xp = 0; // Previous pointer coordinates
let yp = 0;

// Canvas snapshot stacks for Undo/Redo
let undoHistory = [];
let redoHistory = [];
const MAX_HISTORY = 40;

// Hover-to-click variables for Gesture Selection
let hoverElement = null;
let hoverStartTime = 0;
const HOVER_DURATION = 1000; // 1 second to click

// DOM Elements
const videoElement = document.getElementById('webcam');
const drawCanvas = document.getElementById('drawing-canvas');
const drawCtx = drawCanvas.getContext('2d');
const uiCanvas = document.getElementById('ui-canvas');
const uiCtx = uiCanvas.getContext('2d');
const statusDot = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const brushSizeSlider = document.getElementById('brush-size');
const brushSizeVal = document.getElementById('brush-size-val');
const loader = document.getElementById('loader');
const toastElement = document.getElementById('toast');

// ---------- Initialization ----------
document.addEventListener('DOMContentLoaded', () => {
    setupColorPalette();
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
    
    // Save initial blank canvas state to history
    saveState();
    
    // Setup Event Listeners for controls
    brushSizeSlider.addEventListener('input', (e) => {
        currentThickness = parseInt(e.target.value);
        brushSizeVal.textContent = `${currentThickness}px`;
    });
    
    document.getElementById('btn-clear').addEventListener('click', clearCanvas);
    document.getElementById('btn-undo').addEventListener('click', undo);
    document.getElementById('btn-redo').addEventListener('click', redo);
    document.getElementById('btn-download').addEventListener('click', downloadCanvas);
    
    setupMouseDrawing();
    setupMediaPipe();
});

// Create Color Palette Buttons
function setupColorPalette() {
    const paletteContainer = document.getElementById('color-palette');
    PALETTE.forEach((color, index) => {
        const btn = document.createElement('button');
        btn.className = 'color-option';
        if (index === 0) btn.classList.add('selected');
        btn.style.backgroundColor = color.hex;
        btn.style.setProperty('--accent-glow', color.hex + '66');
        btn.title = color.name;
        btn.addEventListener('click', () => selectColor(color.hex, btn));
        paletteContainer.appendChild(btn);
    });
    
    // Add Eraser Option (acts like drawing with background color/eraser)
    const eraserBtn = document.createElement('button');
    eraserBtn.className = 'color-option eraser';
    eraserBtn.title = 'Eraser';
    eraserBtn.style.setProperty('--accent-glow', 'rgba(255, 255, 255, 0.3)');
    eraserBtn.addEventListener('click', () => selectColor('eraser', eraserBtn));
    paletteContainer.appendChild(eraserBtn);
}

function selectColor(color, element) {
    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    if (color === 'eraser') {
        currentColor = 'eraser';
    } else {
        currentColor = color;
    }
}

// Adjust canvas resolution dynamically to match video dimensions
function resizeCanvases() {
    const rect = drawCanvas.getBoundingClientRect();
    // Use high resolution for smooth lines
    drawCanvas.width = 1280;
    drawCanvas.height = 720;
    uiCanvas.width = 1280;
    uiCanvas.height = 720;
    
    // Redraw the canvas content after resize from last state
    restoreCanvasState(undoHistory[undoHistory.length - 1]);
}

// ---------- Mode Selection ----------
window.setMode = function(mode) {
    currentMode = mode;
    document.getElementById('mode-gesture').classList.toggle('active', mode === 'gesture');
    document.getElementById('mode-mouse').classList.toggle('active', mode === 'mouse');
    
    if (mode === 'mouse') {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Mouse Control Mode';
        uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    } else {
        statusDot.className = 'status-dot active';
        statusText.textContent = 'Tracking Hand...';
    }
    xp = 0;
    yp = 0;
};

// ---------- History Management (Undo/Redo) ----------
function saveState() {
    // Keep a copy of the canvas pixels
    const imgData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    undoHistory.push(imgData);
    if (undoHistory.length > MAX_HISTORY) {
        undoHistory.shift();
    }
    redoHistory = []; // Clear redo stack on new action
}

function undo() {
    if (undoHistory.length > 1) {
        const currentState = undoHistory.pop();
        redoHistory.push(currentState);
        const previousState = undoHistory[undoHistory.length - 1];
        restoreCanvasState(previousState);
        showToast('Undone!');
    }
}

function redo() {
    if (redoHistory.length > 0) {
        const nextState = redoHistory.pop();
        undoHistory.push(nextState);
        restoreCanvasState(nextState);
        showToast('Redone!');
    }
}

function restoreCanvasState(state) {
    if (state) {
        drawCtx.putImageData(state, 0, 0);
    }
}

function clearCanvas() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    saveState();
    showToast('Canvas Cleared!');
}

function downloadCanvas() {
    // Save image with composite background so the saved image is not transparent
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = drawCanvas.width;
    tempCanvas.height = drawCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw mirrored background (or dark theme background)
    tempCtx.fillStyle = '#090a0f';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw canvas drawings (needs to be mirrored to match what the user drew)
    tempCtx.save();
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(drawCanvas, 0, 0);
    tempCtx.restore();
    
    const link = document.createElement('a');
    link.download = `air-canvas-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
    showToast('Drawing Saved!');
}

function showToast(msg) {
    toastElement.textContent = msg;
    toastElement.className = 'toast-show';
    setTimeout(() => {
        toastElement.className = 'toast-hidden';
    }, 2000);
}

// ---------- Mouse Drawing Logic ----------
function setupMouseDrawing() {
    let mouseDrawing = false;
    
    const getCoordinates = (e) => {
        const rect = drawCanvas.getBoundingClientRect();
        // Since canvas displays scaleX(-1), we need to invert mouse x mapping
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;
        
        // Canvas width is 1280, height is 720. Map client coordinates to canvas space.
        // We also mirror the coordinates because drawing-canvas has scaleX(-1) applied.
        const canvasX = drawCanvas.width - (relativeX / rect.width) * drawCanvas.width;
        const canvasY = (relativeY / rect.height) * drawCanvas.height;
        
        return { x: canvasX, y: canvasY };
    };
    
    const startDraw = (e) => {
        if (currentMode !== 'mouse') return;
        mouseDrawing = true;
        const coords = getCoordinates(e);
        xp = coords.x;
        yp = coords.y;
        saveState();
    };
    
    const drawMove = (e) => {
        if (!mouseDrawing || currentMode !== 'mouse') return;
        const coords = getCoordinates(e);
        
        drawCtx.beginPath();
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.lineWidth = currentThickness;
        
        if (currentColor === 'eraser') {
            drawCtx.globalCompositeOperation = 'destination-out';
        } else {
            drawCtx.globalCompositeOperation = 'source-over';
            drawCtx.strokeStyle = currentColor;
        }
        
        drawCtx.moveTo(xp, yp);
        drawCtx.lineTo(coords.x, coords.y);
        drawCtx.stroke();
        
        xp = coords.x;
        yp = coords.y;
        
        e.preventDefault();
    };
    
    const stopDraw = () => {
        mouseDrawing = false;
    };
    
    // Mouse Events
    drawCanvas.addEventListener('mousedown', startDraw);
    drawCanvas.addEventListener('mousemove', drawMove);
    window.addEventListener('mouseup', stopDraw);
    
    // Touch Events
    drawCanvas.addEventListener('touchstart', startDraw);
    drawCanvas.addEventListener('touchmove', drawMove, { passive: false });
    window.addEventListener('touchend', stopDraw);
}

// ---------- MediaPipe Setup & Tracking ----------
function setupMediaPipe() {
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
    
    // Start Camera using MediaPipe Helper
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            if (currentMode === 'gesture') {
                await hands.send({ image: videoElement });
            }
        },
        width: 1280,
        height: 720
    });
    
    camera.start()
        .then(() => {
            statusDot.className = 'status-dot active';
            statusText.textContent = 'Camera Active';
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        })
        .catch(err => {
            console.error('Camera Access Failed:', err);
            statusText.textContent = 'Webcam Access Denied!';
            statusDot.className = 'status-dot disconnected';
            alert('Could not access webcam. Please verify camera permissions and reload.');
        });
}

// MediaPipe Results Processing Callback
function onHandResults(results) {
    // Clear last UI frame
    uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    
    if (currentMode !== 'gesture') return;
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Tracking Hand';
        
        const handLandmarks = results.multiHandLandmarks[0];
        
        // Fingertip & joint coordinates
        const indexTip = handLandmarks[8];
        const indexPip = handLandmarks[6];
        const middleTip = handLandmarks[12];
        const middlePip = handLandmarks[10];
        const ringTip = handLandmarks[16];
        const ringPip = handLandmarks[14];
        const pinkyTip = handLandmarks[20];
        const pinkyPip = handLandmarks[18];
        
        // Check which fingers are up
        const indexUp = indexTip.y < indexPip.y;
        const middleUp = middleTip.y < middlePip.y;
        const ringUp = ringTip.y < ringPip.y;
        const pinkyUp = pinkyTip.y < pinkyPip.y;
        
        // Map normalized MediaPipe coordinates directly to UI Canvas (1280x720)
        // Since canvas and camera are mirrored using CSS scaleX(-1), mapping matches directly
        const ix = indexTip.x * uiCanvas.width;
        const iy = indexTip.y * uiCanvas.height;
        const mx = middleTip.x * uiCanvas.width;
        const my = middleTip.y * uiCanvas.height;
        
        // Selection Mode: Index & Middle up
        if (indexUp && middleUp && !ringUp && !pinkyUp) {
            drawing = false;
            xp = 0; // Reset drawing pointer
            yp = 0;
            
            // Draw visual pointer for Selection Mode (two fingers tracking cursor)
            const cx = (ix + mx) / 2;
            const cy = (iy + my) / 2;
            
            drawGestureCursor(cx, cy, true);
            handleHoverSelect(cx, cy);
            
        } 
        // Drawing Mode: Only Index up
        else if (indexUp && !middleUp && !ringUp && !pinkyUp) {
            // Cancel any pending UI hover action
            cancelHover();
            
            // Draw drawing cursor
            drawGestureCursor(ix, iy, false);
            
            // Draw lines on drawCanvas
            if (xp === 0 && yp === 0) {
                saveState();
                xp = ix;
                yp = iy;
            }
            
            drawCtx.beginPath();
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';
            drawCtx.lineWidth = currentThickness;
            
            if (currentColor === 'eraser') {
                drawCtx.globalCompositeOperation = 'destination-out';
            } else {
                drawCtx.globalCompositeOperation = 'source-over';
                drawCtx.strokeStyle = currentColor;
            }
            
            drawCtx.moveTo(xp, yp);
            drawCtx.lineTo(ix, iy);
            drawCtx.stroke();
            
            xp = ix;
            yp = iy;
        } 
        // Hover/Fist/Rest State: No drawing
        else {
            cancelHover();
            drawing = false;
            xp = 0;
            yp = 0;
        }
    } else {
        cancelHover();
        statusDot.className = 'status-dot active';
        statusText.textContent = 'Searching for hand...';
        xp = 0;
        yp = 0;
    }
}

// ---------- UI Custom Gesture Cursor & Hover to Click ----------

function drawGestureCursor(x, y, isSelectionMode) {
    uiCtx.shadowBlur = 10;
    
    if (isSelectionMode) {
        uiCtx.strokeStyle = '#fff';
        uiCtx.shadowColor = 'rgba(255,255,255,0.4)';
        uiCtx.lineWidth = 2;
        
        // Draw outer ring
        uiCtx.beginPath();
        uiCtx.arc(x, y, 16, 0, 2 * Math.PI);
        uiCtx.stroke();
        
        // Draw inner dot
        uiCtx.fillStyle = '#00f2fe';
        uiCtx.beginPath();
        uiCtx.arc(x, y, 4, 0, 2 * Math.PI);
        uiCtx.fill();
    } else {
        // Drawing mode cursor matches brush size and color
        uiCtx.fillStyle = currentColor === 'eraser' ? '#ffffff' : currentColor;
        uiCtx.shadowColor = currentColor === 'eraser' ? '#ffffff80' : currentColor + '80';
        
        uiCtx.beginPath();
        uiCtx.arc(x, y, currentThickness / 2 + 2, 0, 2 * Math.PI);
        uiCtx.fill();
        
        // Draw small pointer dot
        uiCtx.strokeStyle = '#fff';
        uiCtx.lineWidth = 1;
        uiCtx.beginPath();
        uiCtx.arc(x, y, 2, 0, 2 * Math.PI);
        uiCtx.stroke();
    }
    
    uiCtx.shadowBlur = 0; // reset
}

// Convert coordinates on canvas to standard viewport coordinates to find what button is underneath
function handleHoverSelect(canvasX, canvasY) {
    // Map Canvas coordinate to viewport client coordinate
    const rect = drawCanvas.getBoundingClientRect();
    
    // Account for CSS scaleX(-1) mirroring
    const normalizedX = 1 - (canvasX / drawCanvas.width);
    const viewportX = rect.left + (normalizedX * rect.width);
    const viewportY = rect.top + ((canvasY / drawCanvas.height) * rect.height);
    
    // Find DOM element under pointer
    const elementUnderPointer = document.elementFromPoint(viewportX, viewportY);
    
    if (elementUnderPointer) {
        // Find nearest interactive element (button or class)
        const interactiveElement = elementUnderPointer.closest('.color-option, .action-btn, .mode-btn');
        
        if (interactiveElement) {
            if (hoverElement === interactiveElement) {
                // Continue hovering
                const elapsed = Date.now() - hoverStartTime;
                const progress = Math.min(elapsed / HOVER_DURATION, 1);
                
                // Draw circular progress ring on UI Canvas
                drawProgressRing(canvasX, canvasY, progress);
                
                if (progress >= 1) {
                    // Trigger Click!
                    interactiveElement.click();
                    // Pulse feedback visual
                    triggerVisualPulse(interactiveElement);
                    cancelHover(); // Reset hover state
                }
            } else {
                // Start hovering on new element
                hoverElement = interactiveElement;
                hoverStartTime = Date.now();
                interactiveElement.classList.add('hovered');
            }
            return;
        }
    }
    cancelHover();
}

function cancelHover() {
    if (hoverElement) {
        hoverElement.classList.remove('hovered');
        hoverElement = null;
    }
}

// Visual circular ring that fills up around the cursor representing click timer
function drawProgressRing(x, y, progress) {
    uiCtx.strokeStyle = '#10b981'; // Green progress ring
    uiCtx.lineWidth = 4;
    uiCtx.beginPath();
    // Start drawing from top (-Math.PI / 2) to (progress * 2 * Math.PI)
    uiCtx.arc(x, y, 22, -Math.PI / 2, (-Math.PI / 2) + (progress * 2 * Math.PI));
    uiCtx.stroke();
}

// Add simple visual active scale pulse to clicked elements
function triggerVisualPulse(element) {
    element.style.transform = 'scale(0.85)';
    setTimeout(() => {
        element.style.transform = '';
    }, 150);
}
