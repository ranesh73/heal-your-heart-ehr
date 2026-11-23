import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  X,
  RotateCcw,
  Check,
  Trash2,
  AlertCircle,
  FlipHorizontal,
  RefreshCw,
} from "lucide-react";

export function getCameraDiagnosticMessage(err?: any): string {
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return "Camera requires HTTPS or localhost. Browsers strictly block webcam access over insecure HTTP LAN URLs.";
  }
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "Camera access is not supported by your browser environment or webview.";
  }
  if (!err) {
    return "Unable to access webcam.";
  }

  const errName = err.name || "";
  const errMsg = err.message || "";

  if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
    return "Browser or Windows Camera permission is blocked—click the lock icon in the address bar and set Camera to Allow, then click Retry.";
  }
  if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
    return "No webcam detected on this device.";
  }
  if (errName === "NotReadableError" || errName === "TrackStartError") {
    return "Camera is currently in use by another app.";
  }
  if (errName === "OverconstrainedError" || errName === "ConstraintNotSatisfiedError") {
    return "Webcam constraints could not be satisfied. Click Retry to use basic camera mode.";
  }
  if (errName === "SecurityError") {
    return "Camera access blocked by browser security policy. Please verify site permissions.";
  }

  return errMsg || "Camera access failed. Please click Retry or choose 'Upload Photo from Device Instead'.";
}

interface PatientPhotoChooserProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLiveCamera: (initialStream?: MediaStream | null, initialError?: any) => void;
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

  const handleLiveCameraTrigger = async () => {
    // 1. Direct user-gesture trigger:
    // Call getUserMedia directly within the user click event handler
    let stream: MediaStream | null = null;
    let error: any = null;

    if (typeof window !== "undefined" && window.isSecureContext === false) {
      error = new Error("Camera requires HTTPS or localhost");
      onOpenLiveCamera(null, error);
      onClose();
      return;
    }

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        // Simple video: true first for maximum compatibility on desktop webcams
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err: any) {
        console.warn("Direct user-gesture getUserMedia caught:", err);
        error = err;
      }
    } else {
      error = new Error("Camera not supported");
    }

    onOpenLiveCamera(stream, error);
    onClose();
  };

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
            onClick={handleLiveCameraTrigger}
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
                Prompt camera on desktop webcam or mobile
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
  initialStream?: MediaStream | null;
  initialError?: any;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onPhotoAccepted,
  onFallbackToUpload,
  initialStream,
  initialError,
}: CameraCaptureModalProps) {
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop media tracks cleanly
  const stopTracks = useCallback(() => {
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
  }, []);

  // Check multiple cameras
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          setHasMultipleCameras(videoInputs.length > 1);
        })
        .catch(() => {});
    }
  }, []);

  // Core function to start webcam with resilient fallback
  const startCamera = useCallback(
    async (preferFacingMode?: "user" | "environment") => {
      setIsStarting(true);
      setCameraError(null);
      stopTracks();

      // Diagnostic check for secure context
      if (typeof window !== "undefined" && window.isSecureContext === false) {
        setIsStarting(false);
        setCameraError(
          "Camera requires HTTPS or localhost. Browsers strictly block camera permissions on insecure HTTP LAN origins."
        );
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsStarting(false);
        setCameraError("Camera access is not supported by your browser environment.");
        return;
      }

      const targetMode = preferFacingMode || facingMode;

      try {
        // Attempt 1: non-strict facingMode (never use exact, which breaks desktop webcams)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: targetMode ? { facingMode: targetMode } : true,
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraError(null);
      } catch (err1: any) {
        console.warn("Attempt 1 camera request failed:", err1?.name, err1?.message);

        // Attempt 2: fallback to simplest possible constraint: { video: true, audio: false }
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });

          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.play().catch(() => {});
          }
          setCameraError(null);
        } catch (err2: any) {
          console.warn("Attempt 2 fallback camera request failed:", err2?.name, err2?.message);
          const diagnostic = getCameraDiagnosticMessage(err2 || err1);
          setCameraError(diagnostic);
        }
      } finally {
        setIsStarting(false);
      }
    },
    [facingMode, stopTracks]
  );

  // Initialize camera when modal opens
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

    // If an initialStream was acquired during direct user gesture in the chooser, attach it!
    if (initialStream && initialStream.active && initialStream.getVideoTracks().length > 0) {
      streamRef.current = initialStream;
      setCameraError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = initialStream;
        videoRef.current.play().catch(() => {});
      }
      return;
    }

    // If an initialError occurred during direct user gesture
    if (initialError) {
      setCameraError(getCameraDiagnosticMessage(initialError));
      return;
    }

    // Otherwise, start camera automatically
    void startCamera(facingMode);

    return () => {
      stopTracks();
    };
  }, [isOpen, initialStream, initialError, capturedPhoto, facingMode, startCamera, stopTracks]);

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
    void startCamera(facingMode);
  };

  const handleUsePhoto = () => {
    if (capturedPhoto) {
      onPhotoAccepted(capturedPhoto);
      handleClose();
    }
  };

  const toggleCamera = () => {
    stopTracks();
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    void startCamera(nextMode);
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
                maxWidth: 400,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <AlertCircle size={40} color="#f87171" />
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fca5a5" }}>
                Camera Access Needed
              </div>
              <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>
                {cameraError}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  width: "100%",
                  maxWidth: 280,
                  marginTop: 8,
                }}
              >
                {/* User Gesture Retry Button */}
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  disabled={isStarting}
                  style={{
                    background: "#0d9488",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isStarting ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    boxShadow: "0 2px 8px rgba(13, 148, 136, 0.4)",
                  }}
                >
                  <RefreshCw size={14} className={isStarting ? "spin" : ""} />
                  {isStarting ? "Requesting Camera..." : "Retry Camera Permission"}
                </button>
                {onFallbackToUpload && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onFallbackToUpload();
                    }}
                    style={{
                      background: "#1e293b",
                      color: "#cbd5e1",
                      border: "1px solid #475569",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontSize: 12.5,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <Upload size={14} /> Upload Photo from Device Instead
                  </button>
                )}
              </div>
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

              {/* Camera Switch button if multiple cameras available */}
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
