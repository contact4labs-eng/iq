import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight, FileText } from "lucide-react";

interface Invoice {
  id: string;
  invoice_date: string | null;
  created_at: string;
  invoice_number: string | null;
  total_amount: number | null;
  vat_amount: number | null;
  status: string;
  supplier_name: string | null;
}

const PAGE_SIZE = 20;

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "all", label: "Όλα" },
  { key: "extracted", label: "Εξαγμένα" },
  { key: "approved", label: "Εγκεκριμένα" },
  { key: "flagged", label: "Σημαιωμένα" },
  { key: "rejected", label: "Απορριφθέντα" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  uploaded: { label: "Ανέβηκε", className: "bg-muted text-muted-foreground border-border" },
  processing: { label: "Επεξεργασία", className: "bg-info/15 text-info border-info/30" },
  extracted: { label: "Εξαγωγή", className: "bg-warning/15 text-warning border-warning/30" },
  approved: { label: "Εγκρίθηκε", className: "bg-success/15 text-success border-success/30" },
  flagged: { label: "Σημαία", className: "bg-warning/20 text-warning border-warning/40" },
  rejected: { label: "Απορρίφθηκε", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface InvoiceListProps {
  refreshKey: number;
}

export function InvoiceList({ refreshKey }: InvoiceListProps) {
  const { company } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchInvoices = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);

    let query = supabase
      .from("invoices")
      .select("id, invoice_date, created_at, invoice_number, total_amount, vat_amount, status, supplier_id, suppliers(name)", { count: "exact" })
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (activeTab !== "all") {
      query = query.eq("status", activeTab);
    }

    if (search.trim()) {
      query = query.or(`invoice_number.ilike.%${search.trim()}%,suppliers.name.ilike.%${search.trim()}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Invoice list error:", error);
      setInvoices([]);
    } else {
      const mapped = (data || []).map((inv: Record<string, unknown>) => ({
        id: inv.id as string,
        invoice_date: inv.invoice_date as string | null,
        created_at: inv.created_at as string,
        invoice_number: inv.invoice_number as string | null,
        total_amount: inv.total_amount as number | null,
        vat_amount: inv.vat_amount as number | null,
        status: inv.status as string,
        supplier_name: (inv.suppliers as Record<string, unknown>)?.name as string | null ?? null,
      }));
      setInvoices(mapped);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [company?.id, activeTab, search, page]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices, refreshKey]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [activeTab, search]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="bg-card border rounded-lg">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-3 border-b overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Αναζήτηση προμηθευτή ή αριθμού τιμολογίου..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ημερομηνία</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Προμηθευτής</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Αρ. Τιμολογίου</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ποσό (€)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">ΦΠΑ (€)</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Κατάσταση</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              : invoices.length > 0
              ? invoices.map((inv) => {
                  const status = statusConfig[inv.status] || {
                    label: inv.status,
                    className: "bg-muted text-muted-foreground border-border",
                  };
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="border-b hover:bg-secondary/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-foreground">
                        {formatDate(inv.invoice_date || inv.created_at)}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">
                        {inv.supplier_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {inv.invoice_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground font-semibold">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatCurrency(inv.vat_amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={`text-xs ${status.className}`}>
                          {status.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-10 h-10 text-muted-foreground/40" />
                      <p className="text-muted-foreground font-medium">Δεν υπάρχουν τιμολόγια ακόμα.</p>
                      <p className="text-sm text-muted-foreground">Ανεβάστε το πρώτο σας!</p>
                    </div>
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-xs text-muted-foreground">
            {totalCount} τιμολόγια — Σελίδα {page + 1} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
