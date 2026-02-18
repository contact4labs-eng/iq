import { FileData } from "@/hooks/useInvoiceDetail";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  file: FileData | null;
  fileUrl: string | null;
  loading: boolean;
}

export function InvoiceDocPreview({ file, fileUrl, loading }: Props) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <Skeleton className="w-full h-[500px] rounded-md" />
      </div>
    );
  }

  if (!file || !fileUrl) {
    return (
      <div className="bg-card border rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
        <FileText className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">{t("doc_preview.no_file")}</p>
      </div>
    );
  }

  const isImage = ["jpg", "jpeg", "png", "webp"].includes(file.file_type?.toLowerCase());
  const isPdf = file.file_type?.toLowerCase() === "pdf";

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-secondary/30">
        <span className="text-sm font-medium text-foreground truncate">{file.original_filename}</span>
        <Button variant="ghost" size="sm" asChild>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
            <Download className="w-4 h-4 mr-1" />
            {t("doc_preview.download")}
          </a>
        </Button>
      </div>

      {isImage && (
        <div className="p-4 flex justify-center bg-muted/30">
          <img src={fileUrl} alt={file.original_filename} className="max-w-full max-h-[600px] rounded object-contain" />
        </div>
      )}

      {isPdf && (
        <iframe src={fileUrl} title={file.original_filename} className="w-full h-[600px] border-0" />
      )}

      {!isImage && !isPdf && (
        <div className="p-8 flex flex-col items-center text-center">
          <FileText className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">{t("doc_preview.no_preview")}</p>
          <Button variant="outline" size="sm" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
              <Download className="w-4 h-4 mr-1" />
              {t("doc_preview.download_file")}
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
