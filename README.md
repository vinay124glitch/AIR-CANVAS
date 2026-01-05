# 🎨 Air Canvas

A **real-time gesture-based drawing application** that allows users to draw on a virtual canvas by moving their fingers in the air. This project uses **Computer Vision** techniques to track hand landmarks and convert gestures into digital strokes — no mouse, no stylus, no touchscreen required.

---

## 🚀 Features

* Real-time hand tracking using a webcam
* Finger-based drawing in mid-air
* Touch-free interaction
* Smooth and low-latency drawing experience
* Simple and intuitive gesture controls

---

## 🛠️ Tech Stack

* **Python**
* **OpenCV** – video processing and rendering
* **MediaPipe** – hand landmark detection
* **NumPy** – numerical operations

---

## ⚙️ How It Works

1. Captures live video feed from the webcam
2. Detects hand landmarks using MediaPipe
3. Tracks fingertip coordinates frame-by-frame
4. Recognizes drawing gestures
5. Maps finger movement to strokes on a virtual canvas

---

## 📂 Project Structure

```
Air-Canvas/
│── air_canvas.py
│── requirements.txt
│── README.md
```

---

## ▶️ Installation & Usage

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/Air-Canvas.git
cd Air-Canvas
```

### 2️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

### 3️⃣ Run the Application

```bash
python air_canvas.py
```

---

## 📌 Controls (Example)

* **Index finger up** → Draw
* **Multiple fingers** → Pause drawing / Reset (customizable)

---

## 🌱 Future Enhancements

* Color selection using gestures
* Shape recognition
* Multi-hand support
* Save drawings as images
* AR/VR integration

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork this repository and submit a pull request.

---

## 📄 License

This project is open-source and available under the **MIT License**.

---

## ⭐ Acknowledgements

* OpenCV Community
* Google MediaPipe

If you found this project useful, don’t forget to ⭐ the repository!
