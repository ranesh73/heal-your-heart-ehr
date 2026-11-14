import React, { useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Indent,
  Outdent,
  Link as LinkIcon,
  RotateCcw,
} from "lucide-react";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Compose signature or message...",
  minHeight = 220,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sync external value changes into the contentEditable div
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== (value || "")) {
        editorRef.current.innerHTML = value || "";
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const exec = (command: string, arg?: string) => {
    if (disabled) return;
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleLink = () => {
    if (disabled) return;
    const url = prompt("Enter URL (e.g. https://example.com):", "https://");
    if (url) {
      exec("createLink", url);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: 6,
        background: disabled ? "#f8fafc" : "#ffffff",
        overflow: "hidden",
      }}
    >
      {/* Rich Text Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 4,
          padding: "6px 10px",
          background: "#f1f5f9",
          borderBottom: "1px solid #e2e8f0",
          userSelect: "none",
        }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => exec("bold")}
          title="Bold"
          style={btnStyle}
        >
          <Bold size={14} />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => exec("italic")}
          title="Italic"
          style={btnStyle}
        >
          <Italic size={14} />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => exec("underline")}
          title="Underline"
          style={btnStyle}
        >
          <Underline size={14} />
        </button>

        <div style={separatorStyle} />

        {/* Font Family */}
        <select
          disabled={disabled}
          onChange={(e) => exec("fontName", e.target.value)}
          defaultValue="Arial"
          style={selectStyle}
          title="Font Family"
        >
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>

        {/* Font Size */}
        <select
          disabled={disabled}
          onChange={(e) => exec("fontSize", e.target.value)}
          defaultValue="3"
          style={selectStyle}
          title="Font Size"
        >
          <option value="1">Small (8pt)</option>
          <option value="2">Normal (10pt)</option>
          <option value="3">Medium (12pt)</option>
          <option value="4">Large (14pt)</option>
          <option value="5">Extra Large (18pt)</option>
        </select>

        {/* Color picker */}
        <label
          title="Text Color"
          style={{
            ...btnStyle,
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          <span style={{ fontWeight: 800, color: "#0f172a", fontSize: 13 }}>A</span>
          <input
            type="color"
            disabled={disabled}
            defaultValue="#0f172a"
            onChange={(e) => exec("foreColor", e.target.value)}
            style={{ width: 14, height: 14, padding: 0, border: "none", background: "none", cursor: "pointer" }}
          />
        </label>

        <div style={separatorStyle} />

        {/* Alignment */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => exec("justifyLeft")}
          title="Align Left"
          style={btnStyle}
        >
          <AlignLeft size={14} />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => exec("justifyCenter")}
          title="Align Center"
          style={btnStyle}
        >
          <AlignCenter size={14} />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => exec("justifyRight")}
          title="Align Right"
          style={btnStyle}
        >
          <AlignRight size={14} />
        </button>

        <div style={separatorStyle} />

        {/* Lists */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => exec("insertUnorderedList")}
          title="Bullet List"
          style={btnStyle}
        >
          <List size={14} />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => exec("insertOrderedList")}
          title="Numbered List"
          style={btnStyle}
        >
          <ListOrdered size={14} />
        </button>

        {/* Indent / Outdent */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => exec("outdent")}
          title="Decrease Indent"
          style={btnStyle}
        >
          <Outdent size={14} />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => exec("indent")}
          title="Increase Indent"
          style={btnStyle}
        >
          <Indent size={14} />
        </button>

        <div style={separatorStyle} />

        {/* Link & Clear format */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleLink}
          title="Insert Link"
          style={btnStyle}
        >
          <LinkIcon size={14} />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => exec("removeFormat")}
          title="Clear Formatting"
          style={btnStyle}
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Editable Canvas */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        style={{
          minHeight,
          padding: "12px 14px",
          outline: "none",
          fontSize: 13,
          lineHeight: 1.6,
          color: "#1e293b",
          fontFamily: "Arial, sans-serif",
          cursor: disabled ? "not-allowed" : "text",
        }}
        data-placeholder={placeholder}
      />
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  padding: 0,
  border: "1px solid #cbd5e1",
  borderRadius: 4,
  background: "#ffffff",
  color: "#334155",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const selectStyle: React.CSSProperties = {
  height: 28,
  padding: "0 6px",
  fontSize: 12,
  border: "1px solid #cbd5e1",
  borderRadius: 4,
  background: "#ffffff",
  color: "#334155",
  cursor: "pointer",
};

const separatorStyle: React.CSSProperties = {
  width: 1,
  height: 20,
  background: "#cbd5e1",
  margin: "0 4px",
};

