import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CameraDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

type CameraStep = "preview" | "captured";

export function CameraDialog({ open, onClose, onCapture }: CameraDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<CameraStep>("preview");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    setStep("preview");
    setCapturedBlob(null);
    setCapturedUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Δεν ήταν δυνατή η πρόσβαση στην κάμερα. Ελέγξτε τα δικαιώματα.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setStep("preview");
      setCapturedBlob(null);
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedUrl(null);
      setError(null);
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        setStep("captured");
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  const handleRetake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    startCamera();
  };

  const handleUse = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `invoice_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    onCapture(file);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="w-5 h-5 text-accent" />
            Λήψη φωτογραφίας τιμολογίου
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black aspect-[4/3] w-full">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <p className="text-sm text-destructive-foreground bg-destructive/80 rounded-md px-4 py-3">
                {error}
              </p>
            </div>
          ) : step === "preview" ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : capturedUrl ? (
            <img
              src={capturedUrl}
              alt="Captured invoice"
              className="w-full h-full object-contain"
            />
          ) : null}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center justify-center gap-3 p-4 bg-background">
          {error ? (
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-1.5" />
              Κλείσιμο
            </Button>
          ) : step === "preview" ? (
            <>
              <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-1.5" />
                Ακύρωση
              </Button>
              <Button onClick={handleCapture}>
                <Camera className="w-4 h-4 mr-1.5" />
                Λήψη
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleRetake}>
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Επανάληψη
              </Button>
              <Button onClick={handleUse}>
                <Check className="w-4 h-4 mr-1.5" />
                Χρήση
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
