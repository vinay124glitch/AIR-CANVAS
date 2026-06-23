import cv2
import numpy as np
import mediapipe as mp
import time
import os

# ---------- Config ----------
CAM_WIDTH, CAM_HEIGHT = 1280, 720
BRUSH_THICKNESS = 12
SAVE_FOLDER = "captures"
os.makedirs(SAVE_FOLDER, exist_ok=True)

# Palette (BGR)
PALETTE = [
    (0, 0, 255),    # Red
    (0, 255, 0),    # Green
    (255, 0, 0),    # Blue
    (0, 255, 255),  # Yellow
    (255, 0, 255),  # Magenta
    (5, 5, 5)       # Dark Gray (for Black)
]
PALETTE_LABELS = ["RED", "GREEN", "BLUE", "YELLOW", "MAGENTA", "BLACK"]

# MediaPipe setup
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(static_image_mode=False,
                       max_num_hands=1,
                       model_complexity=1,
                       min_detection_confidence=0.6,
                       min_tracking_confidence=0.6)

# ---------- Helper functions ----------
def fingers_up(hand_landmarks):
    tips_ids = [4, 8, 12, 16, 20]
    lm = hand_landmarks.landmark
    fingers = []

    # Thumb: simple check comparing tip and preceding x (works for mirrored feed)
    fingers.append(lm[tips_ids[0]].x < lm[tips_ids[0]-1].x)

    # Other fingers: tip y < pip y => finger up (y axis: 0 top)
    for i in range(1, 5):
        fingers.append(lm[tips_ids[i]].y < lm[tips_ids[i]-2].y)
    return fingers  # [thumb, index, middle, ring, pinky]

def draw_ui(frame, current_color):
    h, w = frame.shape[:2]
    block_w = 110
    padding = 16
    y0 = 10
    x = padding
    boxes = []

    for i, color in enumerate(PALETTE):
        x1, y1 = x, y0
        x2, y2 = x + block_w, y0 + 70
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, -1)
        if color == current_color:
            cv2.rectangle(frame, (x1, y1), (x2, y2), (255,255,255), 3)
        cv2.putText(frame, PALETTE_LABELS[i], (x1+6, y2+25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 1)
        boxes.append((x1, y1, x2, y2))
        x += block_w + 10

    # CLEAR
    clear_x1, clear_y1 = x, y0
    clear_x2, clear_y2 = x + block_w, y0 + 70
    cv2.rectangle(frame, (clear_x1, clear_y1), (clear_x2, clear_y2), (70,70,70), -1)
    cv2.putText(frame, "CLEAR", (clear_x1+14, clear_y1+45), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,255), 2)
    clear_box = (clear_x1, clear_y1, clear_x2, clear_y2)
    x += block_w + 10

    # SAVE
    save_x1, save_y1 = x, y0
    save_x2, save_y2 = x + block_w, y0 + 70
    cv2.rectangle(frame, (save_x1, save_y1), (save_x2, save_y2), (100,100,100), -1)
    cv2.putText(frame, "SAVE", (save_x1+22, save_y1+45), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,255), 2)
    save_box = (save_x1, save_y1, save_x2, save_y2)
    x += block_w + 10

    # UNDO
    undo_x1, undo_y1 = x, y0
    undo_x2, undo_y2 = x + block_w, y0 + 70
    cv2.rectangle(frame, (undo_x1, undo_y1), (undo_x2, undo_y2), (120,120,120), -1)
    cv2.putText(frame, "UNDO", (undo_x1+18, undo_y1+45), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,255), 2)
    undo_box = (undo_x1, undo_y1, undo_x2, undo_y2)
    x += block_w + 10

    # REDO
    redo_x1, redo_y1 = x, y0
    redo_x2, redo_y2 = x + block_w, y0 + 70
    cv2.rectangle(frame, (redo_x1, redo_y1), (redo_x2, redo_y2), (140,140,140), -1)
    cv2.putText(frame, "REDO", (redo_x1+18, redo_y1+45), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,255), 2)
    redo_box = (redo_x1, redo_y1, redo_x2, redo_y2)

    return boxes, clear_box, save_box, undo_box, redo_box

# ---------- Main ----------
def main():
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)

    canvas = np.zeros((CAM_HEIGHT, CAM_WIDTH, 3), dtype=np.uint8)
    current_color = PALETTE[0]
    xp, yp = 0, 0
    last_save_time = 0
    undo_history = []
    redo_history = []

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Cannot read from webcam.")
            break
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = hands.process(rgb)

        palette_boxes, clear_box, save_box, undo_box, redo_box = draw_ui(frame, current_color)

        if res.multi_hand_landmarks:
            hand_landmarks = res.multi_hand_landmarks[0]
            h, w = frame.shape[:2]
            ix, iy = int(hand_landmarks.landmark[8].x * w), int(hand_landmarks.landmark[8].y * h)
            mx, my = int(hand_landmarks.landmark[12].x * w), int(hand_landmarks.landmark[12].y * h)

            f = fingers_up(hand_landmarks)
            index_up, middle_up = f[1], f[2]

            # Check if over any UI box
            over_ui = False
            for box in palette_boxes:
                x1, y1, x2, y2 = box
                if x1 <= ix <= x2 and y1 <= iy <= y2:
                    over_ui = True
                    break
            cx1, cy1, cx2, cy2 = clear_box
            if cx1 <= ix <= cx2 and cy1 <= iy <= cy2:
                over_ui = True
            sx1, sy1, sx2, sy2 = save_box
            if sx1 <= ix <= sx2 and sy1 <= iy <= sy2:
                over_ui = True
            ux1, uy1, ux2, uy2 = undo_box
            if ux1 <= ix <= ux2 and uy1 <= iy <= uy2:
                over_ui = True
            rx1, ry1, rx2, ry2 = redo_box
            if rx1 <= ix <= rx2 and ry1 <= iy <= ry2:
                over_ui = True

            # Selection mode: index + middle up and over UI -> press UI
            if index_up and middle_up and over_ui:
                xp, yp = 0, 0
                # palette boxes
                for i, box in enumerate(palette_boxes):
                    x1, y1, x2, y2 = box
                    if x1 <= ix <= x2 and y1 <= iy <= y2:
                        current_color = PALETTE[i]
                # clear
                if cx1 <= ix <= cx2 and cy1 <= iy <= cy2:
                    undo_history.append(canvas.copy())
                    redo_history.clear()
                    canvas[:] = 0
                # save
                if sx1 <= ix <= sx2 and sy1 <= iy <= sy2:
                    composed = cv2.addWeighted(frame, 0.5, canvas, 0.5, 0)
                    fname = os.path.join(SAVE_FOLDER, f"air_{int(time.time())}.png")
                    cv2.imwrite(fname, composed)
                    last_save_time = time.time()
                # undo
                if ux1 <= ix <= ux2 and uy1 <= iy <= uy2:
                    if undo_history:
                        redo_history.append(canvas.copy())
                        canvas[:] = undo_history.pop()
                # redo
                if rx1 <= ix <= rx2 and ry1 <= iy <= ry2:
                    if redo_history:
                        undo_history.append(canvas.copy())
                        canvas[:] = redo_history.pop()

            # Drawing mode: only index finger up -> draw with current color
            elif index_up and not middle_up:
                if xp == 0 and yp == 0:
                    undo_history.append(canvas.copy())
                    redo_history.clear()
                    xp, yp = ix, iy
                cv2.line(canvas, (xp, yp), (ix, iy), current_color, BRUSH_THICKNESS)
                xp, yp = ix, iy
                cv2.circle(frame, (ix, iy), 10, current_color, -1)

            else:
                xp, yp = 0, 0

            mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

        # merge canvas and frame
        gray = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)
        _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY)
        mask_inv = cv2.bitwise_not(mask)
        frame_bg = cv2.bitwise_and(frame, frame, mask=mask_inv)
        canvas_fg = cv2.bitwise_and(canvas, canvas, mask=mask)
        out = cv2.add(frame_bg, canvas_fg)

        # Saved notification
        if time.time() - last_save_time < 1.5 and last_save_time != 0:
            cv2.putText(out, "Saved!", (CAM_WIDTH - 200, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0,255,0), 3)

        cv2.imshow("Virtual Air Canvas", out)
        key = cv2.waitKey(1) & 0xFF
        if key == 27:
            break
        elif key == ord('c'):
            canvas[:] = 0

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
