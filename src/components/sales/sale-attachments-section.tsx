"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SaleAttachment, UserRole } from "@/lib/types";
import { createSaleAttachment, deleteSaleAttachment } from "@/lib/actions/sale-attachments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/loading";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatDateTime } from "@/lib/utils";
import { FileText, Image as ImageIcon, Upload, Eye, Download, Trash2 } from "@/components/ui/icons";

function humanSize(bytes: number) {
  const b = Number(bytes || 0);
  if (!Number.isFinite(b) || b <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let v = b;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx++;
  }
  return `${Math.round(v * 10) / 10} ${units[idx]}`;
}

function isImageMime(mime: string) {
  return (mime || "").toLowerCase().startsWith("image/");
}

export function SaleAttachmentsSection(props: {
  saleId: string;
  initialAttachments: SaleAttachment[];
  mode: "view" | "edit" | "create";
  userRole: UserRole;
}) {
  const { saleId, initialAttachments, mode, userRole } = props;
  const [attachments, setAttachments] = useState<SaleAttachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<SaleAttachment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SaleAttachment | null>(null);
  const canDelete = userRole === "super_admin" || mode === "edit";
  const canUpload = mode === "edit";

  const images = useMemo(() => attachments.filter((a) => isImageMime(a.mime_type)), [attachments]);
  const docs = useMemo(() => attachments.filter((a) => !isImageMime(a.mime_type)), [attachments]);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setErr(null);
    try {
      const supabase = createClient();
      const uploaded: SaleAttachment[] = [];

      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^\w.\-()\s]/g, "_");
        const path = `sales/${saleId}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: false, cacheControl: "3600" });

        if (uploadError) throw new Error(uploadError.message);

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        const url = data.publicUrl;

        const row = await createSaleAttachment({
          sale_id: saleId,
          file_name: file.name,
          file_path: path,
          file_url: url,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size || 0,
        });
        uploaded.push(row);
      }

      setAttachments((prev) => [...uploaded, ...prev]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setErr(null);
    try {
      await deleteSaleAttachment(confirmDelete.id, saleId);
      setAttachments((prev) => prev.filter((a) => a.id !== confirmDelete.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete attachment");
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-4 w-4 text-orange-500" />
            Attachments
            <Badge variant="secondary">{attachments.length}</Badge>
          </CardTitle>

          {canUpload && (
            <div className="flex items-center gap-2">
              <input
                id="sale-attachments-upload"
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                className="hidden"
                onChange={(e) => void uploadFiles(e.target.files)}
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById("sale-attachments-upload")?.click()}
              >
                {uploading ? <Spinner /> : <Upload className="h-4 w-4" />}
                <span className="ml-2">Upload</span>
              </Button>
            </div>
          )}
        </div>
        {mode === "create" && (
          <p className="text-xs text-muted-foreground">
            Save the sale first, then you can upload attachments from the Edit screen.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {err && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {err}
          </p>
        )}

        {attachments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium">No attachments</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload images or documents (PDF, Word, Excel).
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {images.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Images
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setPreview(a)}
                      className="group overflow-hidden rounded-xl border border-border bg-muted/10 text-left shadow-sm transition-colors hover:bg-muted/20"
                      title="Preview"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.file_url}
                        alt={a.file_name}
                        className="h-28 w-full object-cover"
                      />
                      <div className="p-3">
                        <p className="truncate text-sm font-semibold">{a.file_name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {humanSize(a.size_bytes)} · {formatDateTime(a.created_at)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-background/60 px-2 py-1 text-[11px] text-muted-foreground">
                            <Eye className="h-3 w-3" /> View
                          </span>
                          {canDelete && (
                            <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive opacity-0 transition-opacity group-hover:opacity-100">
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {docs.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Documents
                </p>
                <div className="grid gap-2">
                  {docs.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col gap-2 rounded-xl border border-border bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{a.file_name}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {humanSize(a.size_bytes)} · {formatDateTime(a.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:shrink-0 sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(a.file_url, "_blank", "noopener,noreferrer")}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="ml-2">View</span>
                        </Button>
                        <a
                          href={a.file_url}
                          download={a.file_name}
                          className={cn(
                            "inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium",
                            "hover:bg-muted"
                          )}
                        >
                          <Download className="h-4 w-4" />
                          <span className="ml-2">Download</span>
                        </a>
                        {canDelete && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setConfirmDelete(a)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {preview && (
        <Dialog open onClose={() => setPreview(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Preview
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="rounded-xl border border-border bg-muted/10 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.file_url}
                alt={preview.file_name}
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{preview.file_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {humanSize(preview.size_bytes)} · {formatDateTime(preview.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(preview.file_url, "_blank", "noopener,noreferrer")}
                  >
                    Open
                  </Button>
                  <a
                    href={preview.file_url}
                    download={preview.file_name}
                    className={cn(
                      "inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium",
                      "hover:bg-muted"
                    )}
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            {canDelete && (
              <Button type="button" variant="destructive" onClick={() => setConfirmDelete(preview)}>
                <Trash2 className="h-4 w-4" />
                <span className="ml-2">Delete</span>
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setPreview(null)}>
              Close
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {confirmDelete && (
        <Dialog open onClose={() => setConfirmDelete(null)}>
          <DialogHeader>
            <DialogTitle>Delete attachment?</DialogTitle>
          </DialogHeader>
          <div className="mt-3 text-sm text-muted-foreground">
            This will remove the attachment record from the sale. (The uploaded file in storage may remain unless
            removed manually.)
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </Card>
  );
}

