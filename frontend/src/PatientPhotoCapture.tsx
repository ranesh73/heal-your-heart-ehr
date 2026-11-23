import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  X,
  RotateCcw,
  Check,
  Trash2,
  AlertCircle,
  FlipHorizontal,
} from "lucide-react";

interface PatientPhotoChooserProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLiveCamera: () => void;
  onOpenDeviceUpload: () => void;
  onRemovePhoto?: () => void;
  hasPhoto?: boolean;
}

export function PatientPhotoChooserModal({
  isOpen,
  onClose,
  onOpenLiveCamera,
  onOpenDeviceUpload,
  onRemovePhoto,
  hasPhoto,
}: PatientPhotoChooserProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 360,
          background: "#ffffff",
          borderRadius: 14,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          animation: "fadeIn 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
            Patient Profile Photo
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              padding: 2,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Option 1: Live Camera */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenLiveCamera();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              background: "#F0FDFA",
              border: "1px solid #CCFBF1",
              borderRadius: 10,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "#0D9488",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Camera size={20} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0F766E" }}>
                Capture Photo (Live Camera)
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b" }}>
                Use webcam or tablet front/rear camera
              </div>
            </div>
          </button>

          {/* Option 2: Device Upload */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDeviceUpload();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "#2563EB",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Upload size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1E293B" }}>
                Upload Photo from Device
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b" }}>
                Browse JPG, PNG from computer files
              </div>
            </div>
          </button>

          {/* Optional: Remove current photo */}
          {hasPhoto && onRemovePhoto && (
            <button
              type="button"
              onClick={() => {
                onRemovePhoto();
                onClose();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "none",
                border: "none",
                color: "#DC2626",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 4,
                justifyContent: "center",
              }}
            >
              <Trash2 size={15} /> Remove Current Photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoAccepted: (dataUrl: string) => void;
  onFallbackToUpload?: () => void;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onPhotoAccepted,
  onFallbackToUpload,
}: CameraCaptureModalProps) {
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop media tracks
  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Check multiple cameras
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoInputs.length > 1);
      }).catch(() => {});
    }
  }, []);

  // Start live stream when open and no captured photo
  useEffect(() => {
    if (!isOpen) {
      stopTracks();
      setCapturedPhoto(null);
      setCameraError(null);
      return;
    }

    if (capturedPhoto) {
      // Photo captured, no live stream needed
      stopTracks();
      return;
    }

    let isMounted = true;
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access is not supported by your browser environment.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      .then((stream) => {
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch((err) => {
        console.warn("Camera getUserMedia error:", err);
        if (isMounted) {
          setCameraError(
            "Camera access denied or device not found. Please allow camera permissions in your browser or choose 'Upload Photo from Device'."
          );
        }
      });

    return () => {
      isMounted = false;
      stopTracks();
    };
  }, [isOpen, facingMode, capturedPhoto]);

  // Clean close
  const handleClose = () => {
    stopTracks();
    setCapturedPhoto(null);
    setCameraError(null);
    onClose();
  };

  // Snap photo onto canvas
  const handleSnap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    // Standard square avatar crop
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Crop center square
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPhoto(dataUrl);
    stopTracks();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleUsePhoto = () => {
    if (capturedPhoto) {
      onPhotoAccepted(capturedPhoto);
      handleClose();
    }
  };

  const toggleCamera = () => {
    stopTracks();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 16,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#0f172a",
          color: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          border: "1px solid #334155",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Camera size={18} color="#0d9488" />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc" }}>
              {capturedPhoto ? "Review Patient Photo" : "Capture Patient Photo"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewport Area */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 340,
            background: "#020617",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {cameraError ? (
            <div
              style={{
                padding: "24px 20px",
                textAlign: "center",
                maxWidth: 360,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <AlertCircle size={36} color="#f87171" />
              <div style={{ fontSize: 13, color: "#fca5a5", lineHeight: 1.5 }}>
                {cameraError}
              </div>
              {onFallbackToUpload && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onFallbackToUpload();
                  }}
                  style={{
                    background: "#0d9488",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    marginTop: 6,
                  }}
                >
                  Upload Photo from Device Instead
                </button>
              )}
            </div>
          ) : capturedPhoto ? (
            /* Review Captured Photo */
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#090d16",
              }}
            >
              <img
                src={capturedPhoto}
                alt="Captured Preview"
                style={{
                  maxHeight: "100%",
                  maxWidth: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          ) : (
            /* Live Camera Feed */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                }}
              />
              {/* Oval Guideline Mask Overlay */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 210,
                  height: 250,
                  borderRadius: "50%",
                  border: "2px dashed #0D9488",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  paddingBottom: 16,
                }}
              >
                <span
                  style={{
                    background: "rgba(0, 0, 0, 0.6)",
                    color: "#f8fafc",
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontWeight: 500,
                  }}
                >
                  Align Patient Face
                </span>
              </div>
            </>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div
          style={{
            padding: "16px 20px",
            background: "#0f172a",
            borderTop: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {capturedPhoto ? (
            /* Review State Buttons */
            <>
              <button
                type="button"
                onClick={handleRetake}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 16px",
                  borderRadius: 8,
                  border: "1px solid #475569",
                  background: "#1e293b",
                  color: "#cbd5e1",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={15} /> Retake
              </button>

              <button
                type="button"
                onClick={handleUsePhoto}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "#0d9488",
                  color: "#ffffff",
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(13, 148, 136, 0.35)",
                }}
              >
                <Check size={16} /> Use Photo
              </button>
            </>
          ) : (
            /* Live Camera State Buttons */
            <>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: "9px 16px",
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "transparent",
                  color: "#94a3b8",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              {/* Shutter Button */}
              {!cameraError && (
                <button
                  type="button"
                  onClick={handleSnap}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: "50%",
                    background: "#0d9488",
                    border: "4px solid #ffffff",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 0 15px rgba(13, 148, 136, 0.6)",
                  }}
                  title="Capture Photo"
                >
                  <Camera size={24} />
                </button>
              )}

              {/* Camera Switch button if available */}
              {hasMultipleCameras && !cameraError ? (
                <button
                  type="button"
                  onClick={toggleCamera}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    color: "#94a3b8",
                    padding: "8px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                  }}
                  title="Switch Camera (Front/Back)"
                >
                  <FlipHorizontal size={15} /> Switch
                </button>
              ) : (
                <div style={{ width: 60 }} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
