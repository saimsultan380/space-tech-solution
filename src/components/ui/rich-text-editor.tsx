"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function runCommand(command: string) {
  document.execCommand(command);
}

export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  placeholder = "Write the details...",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = editorRef.current;
    if (!node || document.activeElement === node) return;
    if (node.innerHTML !== value) {
      node.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div className="space-y-2 text-left">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="overflow-hidden rounded-md border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <div className="flex flex-wrap gap-1 border-b border-border bg-muted/40 p-1.5">
          {[
            ["bold", "B"],
            ["italic", "I"],
            ["underline", "U"],
            ["insertUnorderedList", "• List"],
            ["insertOrderedList", "1. List"],
          ].map(([command, text]) => (
            <Button
              key={command}
              type="button"
              variant="ghost"
              size="sm"
              className={cn("h-8 px-2 text-xs", command === "bold" && "font-bold", command === "italic" && "italic", command === "underline" && "underline")}
              onMouseDown={(event) => {
                event.preventDefault();
                editorRef.current?.focus();
                runCommand(command);
              }}
            >
              {text}
            </Button>
          ))}
        </div>
        <div
          id={id}
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          className="min-h-[140px] px-3 py-2 text-sm outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
          onInput={(event) => onChange((event.currentTarget as HTMLDivElement).innerHTML)}
        />
      </div>
    </div>
  );
}
