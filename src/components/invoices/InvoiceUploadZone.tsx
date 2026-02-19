import { useState, useCallback, useRef } from "react";
import { Upload, CheckCircle, Loader2, AlertCircle, Camera, FileUp } from "lucide-react";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { CameraDialog } from "./CameraDialog";

type UploadStep = "idle" | "uploading" | "processing" | "done" | "error";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = 10 * 1024 * 1024;

interface InvoiceUploadZoneProps {
  onUploadComplete: () => void;
}

export function InvoiceUploadZone({ onUploadComplete }: InvoiceUploadZoneProps) {
  const { company, session } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [step, setStep] = useState<UploadStep>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const getFileExtension = (filename: string): string => {
    return filename.split(".").pop()?.toLowerCase() || "";
  };

  const handleFile = useCallback(
    async (file: File) => {
      if (!company?.id || !session?.access_token) {
        toast({ title: t("toast.error"), description: t("upload.no_company"), variant: "destructive" });
        return;
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast({ title: t("upload.invalid_type"), description: t("upload.accepted_types"), variant: "destructive" });
        return;
      }

      if (file.size > MAX_SIZE) {
        toast({ title: t("upload.file_too_large"), description: t("upload.max_size"), variant: "destructive" });
        return;
      }

      try {
        setStep("uploading");
        const timestamp = Date.now();
        const storagePath = `${company.id}/${timestamp}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("invoices")
          .upload(storagePath, file);

        if (uploadError) throw new Error(uploadError.message);

        const ext = getFileExtension(file.name);
        const { data: fileRecord, error: fileError } = await supabase
          .from("files")
          .insert({
            company_id: company.id,
            storage_path: storagePath,
            original_filename: file.name,
            file_type: ext,
            source_channel: "web_upload",
            file_size_bytes: file.size,
          })
          .select("id")
          .single();

        if (fileError || !fileRecord) throw new Error(fileError?.message);

        const { error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            company_id: company.id,
            file_id: fileRecord.id,
            status: "uploaded",
          })
          .select("id")
          .single();

        if (invoiceError) throw new Error(invoiceError.message);

        setStep("processing");
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/process-invoice`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              file_id: fileRecord.id,
              company_id: company.id,
            }),
          }
        );

        if (!response.ok) {
          console.warn("Edge function returned non-OK status:", response.status);
          toast({ title: t("toast.error"), description: t("upload.processing_error"), variant: "destructive" });
          setStep("error");
          setTimeout(() => setStep("idle"), 4000);
          return;
        }

        setStep("done");
        toast({ title: t("upload.success"), description: t("upload.success_desc") });
        onUploadComplete();
        setTimeout(() => setStep("idle"), 3000);
      } catch (err) {
        console.error("Upload error:", err);
        setStep("error");
        toast({
          title: t("upload.upload_error"),
          description: err instanceof Error ? err.message : t("modal.unexpected_error"),
          variant: "destructive",
        });
        setTimeout(() => setStep("idle"), 4000);
      }
    },
    [company, session, toast, onUploadComplete, t]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleCameraClick = () => {
    if (isMobile) {
      cameraInputRef.current?.click();
    } else {
      setCameraOpen(true);
    }
  };

  const isActive = step === "idle";

  const stepContent = {
    idle: {
      icon: <Upload className="w-8 h-8 text-muted-foreground" />,
      text: t("upload.drag_text"),
      sub: t("upload.drag_sub"),
    },
    uploading: {
      icon: <Loader2 className="w-8 h-8 text-accent animate-spin" />,
      text: t("upload.uploading"),
      sub: t("upload.please_wait"),
    },
    processing: {
      icon: <Loader2 className="w-8 h-8 text-accent animate-spin" />,
      text: t("upload.ai_processing"),
      sub: t("upload.extracting_data"),
    },
    done: {
      icon: <CheckCircle className="w-8 h-8 text-success" />,
      text: t("upload.done"),
      sub: t("upload.done_sub"),
    },
    error: {
      icon: <AlertCircle className="w-8 h-8 text-destructive" />,
      text: t("upload.error"),
      sub: t("upload.try_again"),
    },
  };

  const current = stepContent[step];

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (isActive) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={isActive ? onDrop : undefined}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? "border-accent bg-accent/5" : "border-border"
        }`}
      >
        <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={onFileChange} />
        <input ref={cameraInputRef} type="file" className="hidden" accept="image/jpeg,image/png" capture="environment" onChange={onFileChange} />

        <div className="flex flex-col items-center gap-3">
          {current.icon}
          <p className="text-sm font-medium text-foreground">{current.text}</p>
          <p className="text-xs text-muted-foreground">{current.sub}</p>

          {isActive && (
            <div className="flex items-center gap-3 mt-2">
              <Button variant="outline" size="sm" onClick={handleCameraClick}>
                <Camera className="w-4 h-4 mr-1.5" />
                {t("upload.take_photo")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="w-4 h-4 mr-1.5" />
                {t("upload.choose_file")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <CameraDialog open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleFile} />
    </>
  );
}
