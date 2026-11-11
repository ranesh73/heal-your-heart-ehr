import cv2
import glob
import os

files = sorted(glob.glob(r"c:\Users\sanju\OneDrive\Desktop\HYH-EHR\scripts\extracted_frames\*.jpg"))
# We can crop the tab region: y: 150..220, x: 100..800
# and check if it clicked Roles or Notifications
print("Searching frames for tabs...")
# Let's inspect frames 70 to 112
for i in range(70, 113):
    f = files[i]
    # let's see which ones have dialogs or different tabs
    img = cv2.imread(f)
    # just print file name

