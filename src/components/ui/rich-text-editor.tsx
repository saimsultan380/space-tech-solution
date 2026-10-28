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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Pasted dark-mode pages bring black backgrounds and blank blocks. Keep the words only. */
function plainTextToHtml(text: string): string {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => escapeHtml(line)).join("<br>");
}

function stripForeignStyles(root: HTMLElement) {
  root.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("style");
    el.removeAttribute("class");
    el.removeAttribute("color");
    el.removeAttribute("bgcolor");
  });
}

function removeEmptyBlocks(root: HTMLElement) {
  Array.from(root.querySelectorAll("div, p, span")).forEach((el) => {
    const text = el.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
    if (!text && el.childElementCount === 0) el.remove();
  });
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
      stripForeignStyles(node);
      removeEmptyBlocks(node);
    }
  }, [value]);

  const publish = () => {
    const node = editorRef.current;
    if (!node) return;
    stripForeignStyles(node);
    onChange(node.innerHTML);
  };

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
          className="min-h-[140px] px-3 py-2 text-sm leading-5 text-foreground outline-none [&_*]:!m-0 [&_*]:!bg-transparent [&_*]:!p-0 [&_*]:!text-inherit [&_*]:!leading-5 empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text/plain");
            document.execCommand("insertHTML", false, plainTextToHtml(pasted) || "");
            const node = editorRef.current;
            if (node) removeEmptyBlocks(node);
            publish();
          }}
          onInput={publish}
        />
      </div>
    </div>
  );
}
