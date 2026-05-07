"use client";

import React from "react";
import { cx } from "../../lib/planner/helpers";
import { COLORS } from "../../lib/planner/constants";

// ==================================
// Button
// ==================================
export function Button({ children, className = "", variant = "default", size = "md", ...props }: any) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    default: "bg-black text-white hover:bg-black/90",
    outline: "border border-neutral-300 hover:bg-neutral-50",
    ghost: "hover:bg-neutral-100",
  };
  const sizes: Record<string, string> = { sm: "h-8 px-3 text-sm", md: "h-9 px-4 text-sm", icon: "h-9 w-9" };
  return (
    <button className={cx(base, variants[variant] || variants.default, sizes[size] || sizes.md, className)} {...props}>
      {children}
    </button>
  );
}

// ==================================
// Card
// ==================================
export function Card({ children, className = "" }: any) {
  return <div className={cx("border rounded-xl bg-white", className)}>{children}</div>;
}

export function CardContent({ children, className = "" }: any) {
  return <div className={cx("p-4", className)}>{children}</div>;
}

// ==================================
// Input / Textarea
// ==================================
export function Input(props: any) {
  return (
    <input
      {...props}
      className={cx(
        "w-full h-9 px-3 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-400",
        props.className
      )}
    />
  );
}

export function Textarea(props: any) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full min-h-28 p-3 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-400",
        props.className
      )}
    />
  );
}

// ==================================
// Tabs
// ==================================
export const TabsCtx = React.createContext<{ value: string; onValueChange: (v: string) => void } | null>(null);

export function Tabs({ value, onValueChange, children }: any) {
  return <TabsCtx.Provider value={{ value, onValueChange }}>{children}</TabsCtx.Provider>;
}

export function TabsList({ children, className = "" }: any) {
  return (
    <div role="tablist" aria-label="Vues" className={cx("inline-flex gap-1 bg-neutral-100 p-1 rounded-lg", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: any) {
  const ctx = (React.useContext(TabsCtx) || { value: undefined, onValueChange: () => {} }) as any;
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx.onValueChange(value)}
      className={cx("px-3 py-1.5 rounded-md text-sm", active ? "bg-white shadow text-black" : "text-neutral-600 hover:bg-white/70")}
    >
      {children}
    </button>
  );
}

// ==================================
// Dialog
// ==================================
export function Dialog({ open, onOpenChange, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>
  );
}

export function DialogContent({ children, className = "" }: any) {
  const arr = React.Children.toArray(children);
  const header = arr.find((c: any) => c?.type === DialogHeader);
  const footer = arr.find((c: any) => c?.type === DialogFooter);
  const body = arr.filter((c: any) => c?.type !== DialogHeader && c?.type !== DialogFooter);
  const footerChildren = (footer as any)?.props?.children;
  return (
    <div className={cx("relative z-10 w-full max-w-lg rounded-xl bg-white shadow-lg flex flex-col max-h-[90vh]", className)}>
      {header && (
        <div className="px-5 pt-5 pb-3 shrink-0">
          {(header as any)?.props?.children}
        </div>
      )}
      <div className="overflow-y-auto flex-1 min-h-0 px-5 pb-3 space-y-3">
        {body}
      </div>
      {footer && (
        <div className="px-5 py-3 shrink-0 border-t border-neutral-100 flex flex-col gap-2">
          {footerChildren}
        </div>
      )}
    </div>
  );
}

export function DialogHeader({ children }: any) { return null; }
export function DialogTitle({ children }: any) {
  return <div className="text-lg font-semibold">{children}</div>;
}
export function DialogDescription({ children, className = "" }: any) {
  return <p className={cx("text-sm text-neutral-500 mt-0.5", className)}>{children}</p>;
}
export function DialogFooter({ children, className = "" }: any) { return null; }

// ==================================
// ColorPicker
// ==================================
export function ColorPicker({ value, onChange, usedColors = [] }: { value: string; onChange: (c: string) => void; usedColors?: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLORS.map((c) => {
        const isSelected = value === c;
        const isTaken = !isSelected && usedColors.includes(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Couleur${isTaken ? " (déjà utilisée)" : ""}`}
            title={isTaken ? "Déjà utilisée" : undefined}
            className={cx(
              "relative w-6 h-6 rounded-full border transition-transform",
              c,
              isSelected ? "ring-2 ring-offset-1 ring-black border-black scale-110" : "border-transparent hover:scale-110",
              isTaken ? "opacity-35" : ""
            )}
          >
            {isTaken && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 ring-1 ring-black/20" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
