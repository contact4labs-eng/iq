import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Check, X, Truck } from "lucide-react";
import type { DeliveryPlatform } from "@/hooks/useDeliveryPlatforms";

interface DeliveryPlatformManagerProps {
  platforms: DeliveryPlatform[];
  onAdd: (name: string, commission: number) => Promise<void>;
  onUpdate: (id: string, updates: { name?: string; commission_percent?: number }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DeliveryPlatformManager({
  platforms,
  onAdd,
  onUpdate,
  onDelete,
}: DeliveryPlatformManagerProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCommission, setNewCommission] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCommission, setEditCommission] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await onAdd(newName.trim(), parseFloat(newCommission) || 0);
      setAdding(false);
      setNewName("");
      setNewCommission("");
      toast({ title: t("toast.success"), description: t("cogs.platform_added") });
    } catch (err: unknown) {
      toast({
        title: t("toast.error"),
        description: err instanceof Error ? err.message : t("modal.unexpected_error"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (platform: DeliveryPlatform) => {
    setEditingId(platform.id);
    setEditName(platform.name);
    setEditCommission(String(platform.commission_percent));
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      await onUpdate(editingId, {
        name: editName.trim(),
        commission_percent: parseFloat(editCommission) || 0,
      });
      setEditingId(null);
      toast({ title: t("toast.success"), description: t("cogs.platform_updated") });
    } catch (err: unknown) {
      toast({
        title: t("toast.error"),
        description: err instanceof Error ? err.message : t("modal.unexpected_error"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await onDelete(id);
      toast({ title: t("toast.success"), description: t("cogs.platform_deleted") });
    } catch (err: unknown) {
      toast({
        title: t("toast.error"),
        description: err instanceof Error ? err.message : t("modal.unexpected_error"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-500" />
            {t("cogs.delivery_platforms")}
          </CardTitle>
          {!adding && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {t("cogs.add_platform")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {platforms.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("cogs.no_platforms")}
          </p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2 font-semibold">{t("cogs.platform_name")}</th>
                  <th className="text-right px-4 py-2 font-semibold">{t("cogs.commission_percent")}</th>
                  <th className="text-right px-4 py-2 font-semibold w-24">{t("cogs.col_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {platforms.map((platform) => (
                  <tr key={platform.id} className="hover:bg-muted/30 transition-colors">
                    {editingId === platform.id ? (
                      <>
                        <td className="px-4 py-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={editCommission}
                              onChange={(e) => setEditCommission(e.target.value)}
                              className="h-8 text-sm w-20 text-right"
                            />
                            <span className="text-muted-foreground">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600"
                              onClick={handleSaveEdit}
                              disabled={saving}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 font-medium">{platform.name}</td>
                        <td className="px-4 py-2 text-right font-mono">
                          {platform.commission_percent}%
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleStartEdit(platform)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(platform.id)}
                              disabled={saving}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {adding && (
                  <tr className="bg-muted/20">
                    <td className="px-4 py-2">
                      <Input
                        placeholder={t("cogs.platform_name_placeholder")}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="25"
                          value={newCommission}
                          onChange={(e) => setNewCommission(e.target.value)}
                          className="h-8 text-sm w-20 text-right"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600"
                          onClick={handleAdd}
                          disabled={saving || !newName.trim()}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setAdding(false);
                            setNewName("");
                            setNewCommission("");
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
