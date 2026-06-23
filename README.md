# 🎨 Virtual Air Canvas

A **real-time gesture-based drawing application** that allows users to draw on a virtual canvas by moving their fingers in the air. Using **Computer Vision** techniques to track hand landmarks, this project converts gestures into digital strokes with no mouse, stylus, or touchscreen required.

---

## 🚀 Features

- **Real-Time Hand Tracking:** Low-latency tracking using Google MediaPipe.
- **Air Drawing:** Select from a variety of colors and draw in mid-air.
- **Interactive UI Menu:** Hover over screen menus to select actions.
- **Action Controls:**
  - **Colors:** Red, Green, Blue, Yellow, Magenta, and Black.
  - **Canvas Actions:** `CLEAR`, `SAVE` (saves composition in `captures/`), `UNDO`, and `REDO`.
- **Keyboard Shortcuts:** Press `c` to clear the canvas, and `Esc` to exit.
- **Easy Setup:** Pre-configured environment scripts for Windows and Unix.

---

## 🛠️ Tech Stack

- **Python**
- **OpenCV** – Video processing and canvas rendering
- **MediaPipe** – Hand landmark detection
- **NumPy** – High-performance matrix operations

---

## ⚙️ How It Works

1. **Video Capture:** Captures live feed from the webcam (mirrored for natural interaction).
2. **Landmark Detection:** Detects hand landmarks and coordinates.
3. **Gesture Controls:**
   - 👆 **Index finger up ONLY:** Drawing mode (draws with the current color).
   - ✌️ **Index + Middle fingers up:** Selection/UI mode (hover over menu boxes to select colors or trigger actions like Save, Clear, Undo, and Redo).
   - ✊ **All other hand poses:** Hover/resting mode (stops drawing/selection).

---

## 📂 Project Structure

```
Air-Canvas/
├── air_canvas.py       # Main application source code
├── requirements.txt    # Python library dependencies
├── run_windows.bat     # Automated setup & run script for Windows
├── run_unix.sh         # Automated setup & run script for Linux/Mac
└── README.md           # Documentation
```

---

## ▶️ Installation & Usage

### Method 1: Quick Start (Automated Scripts)

#### 💻 Windows
Simply double-click `run_windows.bat` or run it from the Command Prompt:
```cmd
run_windows.bat
```
*This script will automatically create a virtual environment (`venv`), install dependencies, and launch the application.*

#### 🐧 Linux / 🍎 Mac
Open your terminal in the repository folder and run:
```bash
chmod +x run_unix.sh
./run_unix.sh
```

### Method 2: Manual Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/vinay124glitch/AIR-CANVAS.git
   cd AIR-CANVAS
   ```

2. **Create and Activate a Virtual Environment:**
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/Mac:
   source venv/bin/activate
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Application:**
   ```bash
   python air_canvas.py
   ```

---

## 📄 License

This project is open-source and available under the **MIT License**.

---

## ⭐ Acknowledgements

- OpenCV Community
- Google MediaPipe
