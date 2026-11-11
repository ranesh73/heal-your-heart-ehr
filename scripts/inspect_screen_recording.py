import cv2
import os

video_path = r"C:\Users\sanju\Videos\Screen Recordings\Screen Recording 2026-11-11 152539.mp4"
output_dir = r"c:\Users\sanju\OneDrive\Desktop\HYH-EHR\scripts\extracted_frames"
os.makedirs(output_dir, exist_ok=True)

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(f"Error opening video: {video_path}")
    exit(1)

fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = total_frames / fps if fps > 0 else 0
print(f"Video opened. FPS: {fps}, Total frames: {total_frames}, Duration: {duration:.2f} seconds")

# Sample 1 frame every 1 or 2 seconds
step_sec = 2.0
step_frames = int(fps * step_sec) if fps > 0 else 30

frame_idx = 0
saved_count = 0
while True:
    ret, frame = cap.read()
    if not ret:
        break
    if frame_idx % step_frames == 0:
        sec = frame_idx / fps
        out_name = os.path.join(output_dir, f"frame_{saved_count:03d}_{sec:.1f}s.jpg")
        cv2.imwrite(out_name, frame)
        saved_count += 1
    frame_idx += 1

cap.release()
print(f"Extracted {saved_count} frames to {output_dir}")

