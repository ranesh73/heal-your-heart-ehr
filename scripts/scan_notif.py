import cv2
import glob

files = sorted(glob.glob(r"c:\Users\sanju\OneDrive\Desktop\HYH-EHR\scripts\extracted_frames\*.jpg"))
# Look between frame 80 and 110
for i in range(80, 115):
    f = files[i]
    img = cv2.imread(f)
    # Check if Notifications is active
    # We can inspect the image or print file names
    # Let's save a list

