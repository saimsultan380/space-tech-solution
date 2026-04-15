"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { updateSaleNoteFields } from "@/lib/actions/sales";
import { Check, CreditCard, FileText, Loader2, Pencil } from "lucide-react";

interface SaleDetailNoteFieldsProps {
  saleId: string;
  initialOtherSaleData: string | null;
  initialSalesNotes: string | null;
  initialProcessingNotes: string | null;
}

function EditableNoteCard({
  title,
  icon,
  value,
  placeholder,
  onSave,
}: {
  title: string;
  icon?: ReactNode;
  value: string;
  placeholder: string;
  onSave: (next: string) => Promise<void>;
}) {
  const router = useRouter();
  const [text, setText] = useState(value);
  const [error, setError] = useState("");
  const [showUpdatedBadge, setShowUpdatedBadge] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setText(value);
    setShowUpdatedBadge(false);
    setIsEditing(false);
  }, [value]);

  const handleTextChange = (next: string) => {
    setText(next);
    setShowUpdatedBadge(false);
  };

  const handleSave = () => {
    setError("");
    startTransition(async () => {
      try {
        await onSave(text);
        setShowUpdatedBadge(true);
        setIsEditing(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-lg">
          {icon}
          <span className="min-w-0">{title}</span>
          {showUpdatedBadge ? (
            <Badge
              variant="success"
              className="ml-0.5 shrink-0 gap-1 font-medium shadow-sm animate-in fade-in zoom-in duration-200"
            >
              <Check className="h-3 w-3" aria-hidden />
              Updated
            </Badge>
          ) : null}
        </CardTitle>
        {isEditing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 px-3"
            disabled={pending}
            onClick={handleSave}
          >
            {pending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                Saving
              </>
            ) : (
              "Save"
            )}
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:bg-transparent hover:text-primary disabled:opacity-50"
            disabled={pending}
            onClick={() => setIsEditing(true)}
            title={`Edit ${title}`}
            aria-label={`Edit ${title}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px] resize-y border-border/80 bg-transparent text-sm shadow-none transition-colors placeholder:text-muted-foreground/70 focus-visible:bg-background/40 dark:focus-visible:bg-background/20"
          disabled={pending || !isEditing}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

export function SaleDetailNoteFields({
  saleId,
  initialOtherSaleData,
  initialSalesNotes,
  initialProcessingNotes,
}: SaleDetailNoteFieldsProps) {
  const other = initialOtherSaleData ?? "";
  const sales = initialSalesNotes ?? "";
  const processing = initialProcessingNotes ?? "";

  return (
    <>
      <EditableNoteCard
        title="Other Sale Data"
        icon={<FileText className="h-4 w-4 text-orange-500" />}
        value={other}
        placeholder="Any additional information regarding this sale…"
        onSave={(next) => updateSaleNoteFields(saleId, { other_sale_data: next })}
      />
      <EditableNoteCard
        title="Sales Notes"
        icon={<CreditCard className="h-4 w-4" />}
        value={sales}
        placeholder="Notes for the team…"
        onSave={(next) => updateSaleNoteFields(saleId, { sales_notes: next })}
      />
      <EditableNoteCard
        title="Processing Notes"
        value={processing}
        placeholder="Processing notes…"
        onSave={(next) => updateSaleNoteFields(saleId, { processing_notes: next })}
      />
    </>
  );
}
