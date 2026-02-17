import { useState, useCallback, useRef } from "react";
import { Upload, FileUp, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type UploadStep = "idle" | "uploading" | "processing" | "done" | "error";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface InvoiceUploadZoneProps {
  onUploadComplete: () => void;
}

export function InvoiceUploadZone({ onUploadComplete }: InvoiceUploadZoneProps) {
  const { company, session } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<UploadStep>("idle");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileExtension = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    return ext;
  };

  const handleFile = useCallback(
    async (file: File) => {
      if (!company?.id || !session?.access_token) {
        toast({ title: "Σφάλμα", description: "Δεν βρέθηκε εταιρεία ή συνεδρία.", variant: "destructive" });
        return;
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast({ title: "Μη αποδεκτός τύπος", description: "Επιτρεπόμενοι τύποι: PDF, JPG, PNG", variant: "destructive" });
        return;
      }

      if (file.size > MAX_SIZE) {
        toast({ title: "Πολύ μεγάλο αρχείο", description: "Μέγιστο μέγεθος: 10MB", variant: "destructive" });
        return;
      }

      try {
        // Step 1: Upload to storage
        setStep("uploading");
        const timestamp = Date.now();
        const storagePath = `${company.id}/${timestamp}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("invoices")
          .upload(storagePath, file);

        if (uploadError) throw new Error(`Σφάλμα αποθήκευσης: ${uploadError.message}`);

        // Step 2: Get public URL
        const { data: urlData } = supabase.storage
          .from("invoices")
          .getPublicUrl(storagePath);

        // Step 3: Insert into files table
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

        if (fileError || !fileRecord) throw new Error(`Σφάλμα καταγραφής αρχείου: ${fileError?.message}`);

        // Step 4: Insert into invoices table
        const { data: invoiceRecord, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            company_id: company.id,
            file_id: fileRecord.id,
            status: "uploaded",
          })
          .select("id")
          .single();

        if (invoiceError) throw new Error(`Σφάλμα δημιουργίας τιμολογίου: ${invoiceError.message}`);

        // Step 5: Call edge function
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
          toast({ title: "Σφάλμα", description: "Σφάλμα επεξεργασίας τιμολογίου.", variant: "destructive" });
        }

        // Step 6: Done
        setStep("done");
        toast({ title: "Επιτυχία!", description: "Το τιμολόγιο ανέβηκε και επεξεργάζεται." });
        onUploadComplete();

        setTimeout(() => setStep("idle"), 3000);
      } catch (err) {
        console.error("Upload error:", err);
        setStep("error");
        toast({
          title: "Σφάλμα ανεβάσματος",
          description: err instanceof Error ? err.message : "Παρουσιάστηκε σφάλμα.",
          variant: "destructive",
        });
        setTimeout(() => setStep("idle"), 4000);
      }
    },
    [company, session, toast, onUploadComplete]
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
  };

  const stepContent = {
    idle: {
      icon: <Upload className="w-8 h-8 text-muted-foreground" />,
      text: "Σύρετε ή κάντε κλικ για ανέβασμα τιμολογίου",
      sub: "PDF, JPG, PNG — μέγιστο 10MB",
    },
    uploading: {
      icon: <Loader2 className="w-8 h-8 text-accent animate-spin" />,
      text: "Ανέβασμα...",
      sub: "Παρακαλώ περιμένετε",
    },
    processing: {
      icon: <Loader2 className="w-8 h-8 text-accent animate-spin" />,
      text: "Επεξεργασία με AI...",
      sub: "Εξαγωγή δεδομένων τιμολογίου",
    },
    done: {
      icon: <CheckCircle className="w-8 h-8 text-success" />,
      text: "Ολοκληρώθηκε!",
      sub: "Το τιμολόγιο επεξεργάστηκε επιτυχώς",
    },
    error: {
      icon: <AlertCircle className="w-8 h-8 text-destructive" />,
      text: "Σφάλμα",
      sub: "Δοκιμάστε ξανά",
    },
  };

  const current = stepContent[step];
  const isActive = step === "idle";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (isActive) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={isActive ? onDrop : undefined}
      onClick={isActive ? () => fileInputRef.current?.click() : undefined}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isActive ? "cursor-pointer hover:border-accent/50 hover:bg-accent/5" : "cursor-default"
      } ${dragOver ? "border-accent bg-accent/5" : "border-border"}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={onFileChange}
      />
      <div className="flex flex-col items-center gap-2">
        {current.icon}
        <p className="text-sm font-medium text-foreground">{current.text}</p>
        <p className="text-xs text-muted-foreground">{current.sub}</p>
      </div>
    </div>
  );
}
