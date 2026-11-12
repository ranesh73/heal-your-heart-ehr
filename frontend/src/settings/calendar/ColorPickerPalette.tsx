import React from "react";

export const PALETTE_COLORS = [
  "#d1fae5", "#fef08a", "#94a3b8", "#06b6d4", "#fde047", "#a8a29e", "#38bdf8", "#22c55e",
  "#f59e0b", "#78716c", "#0284c7", "#f97316", "#854d0e", "#0000ff", "#ef4444", "#ec4899",
  "#4a044e", "#172554", "#84cc16", "#a21caf", "#047857", "#1e1b4b", "#7c3aed", "#059669",
];

interface ColorPickerPaletteProps {
  selectedColor: string;
  onChange: (color: string) => void;
}

export function ColorPickerPalette({
  selectedColor,
  onChange,
}: ColorPickerPaletteProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Current color preview block matching CharmHealth */}
      <div
        style={{
          width: 64,
          height: 36,
          backgroundColor: selectedColor || "#0000ff",
          borderRadius: 2,
          border: "1px solid #cbd5e1",
        }}
      />

      {/* 24-swatch grid (3 rows of 8) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 24px)",
          gap: 6,
        }}
      >
        {PALETTE_COLORS.map((c) => {
          const isSelected = selectedColor?.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              style={{
                width: 24,
                height: 24,
                backgroundColor: c,
                border: isSelected ? "2px solid #000" : "1px solid rgba(0,0,0,0.15)",
                borderRadius: 2,
                cursor: "pointer",
                padding: 0,
                outline: isSelected ? "2px solid #2563eb" : "none",
                outlineOffset: 1,
              }}
              title={c}
            />
          );
        })}
      </div>
    </div>
  );
}

