import cv2
import os
import glob
import numpy as np

frame_files = sorted(glob.glob(r"c:\Users\sanju\OneDrive\Desktop\HYH-EHR\scripts\extracted_frames\*.jpg"))
print(f"Total frames: {len(frame_files)}")

# Find keyframes where image difference > threshold
keyframes = []
prev_gray = None

for f in frame_files:
    img = cv2.imread(f)
    if img is None:
        continue
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (320, 180))
    if prev_gray is None:
        keyframes.append(f)
        prev_gray = gray
        continue
    diff = cv2.absdiff(gray, prev_gray)
    non_zero = np.mean(diff)
    if non_zero > 15: # significant transition
        keyframes.append(f)
        prev_gray = gray

print(f"Key transition frames ({len(keyframes)}):")
for k in keyframes[:25]:
    print(os.path.basename(k))

