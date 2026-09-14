"use client";

import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useEffect, useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import type { ThemeColors } from "./surface-contracts";

export function railTextColors(theme: ThemeColors) {
  const dark = theme.bgMain === "#0e1514" || theme.bgMain === "#050605";
  return {
    railMuted: dark ? "rgba(248, 245, 232, 0.72)" : theme.textMuted,
    railSecondary: dark ? "rgba(248, 245, 232, 0.88)" : theme.textSecondary,
  };
}

export function useRailOverflowCue(ref: RefObject<HTMLElement | null>, enabled: boolean, deps: unknown[] = []) {
  const [showCue, setShowCue] = useState(false);
  const depsKey = JSON.stringify(deps);

  useLayoutEffect(() => {
    if (!enabled) {
      queueMicrotask(() => setShowCue(false));
      return;
    }
    const rail = ref.current;
    if (!rail) {
      queueMicrotask(() => setShowCue(false));
      return;
    }
    const measure = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      setShowCue(maxScrollLeft > 8 && rail.scrollLeft < maxScrollLeft - 8);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(rail);
    rail.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      rail.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [enabled, ref, depsKey]);

  return showCue;
}

export function RailOverflowCue({ theme, className = "size-6" }: { theme: ThemeColors; className?: string }) {
  return <span aria-hidden="true" className={`grid shrink-0 place-items-center ${className}`.trim()} style={{ color: theme.accentGold, opacity: 0.7 }}><ChevronRight size={14} /></span>;
}

export function RailOverflowCorner({ theme, cueClassName = "size-6", className = "right-3 top-3" }: { theme: ThemeColors; cueClassName?: string; className?: string }) {
  return <div aria-hidden="true" className={`pointer-events-none absolute ${className} z-20`.trim()}><span aria-hidden="true" className="absolute inset-y-[-0.5rem] right-0 w-16 rounded-l-[1.4rem] sm:w-24" style={{ background: `linear-gradient(90deg, transparent 0%, color-mix(in srgb, ${theme.bgCardElevated} 4%, transparent) 56%, color-mix(in srgb, ${theme.bgCardElevated} 12%, transparent) 100%)` }} /><RailOverflowCue theme={theme} className={cueClassName} /></div>;
}

export function IconControl({ children, onClick, theme, ariaLabel, disabled = false, className = "" }: { children: ReactNode; onClick?: () => void; theme: ThemeColors; ariaLabel: string; disabled?: boolean; className?: string }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`grid size-10 shrink-0 place-items-center rounded-full border shadow-sm transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()} style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary, "--tw-ring-color": theme.primary, "--tw-ring-offset-color": theme.bgCard } as React.CSSProperties} aria-label={ariaLabel} title={ariaLabel}>{children}</button>;
}

export function ModalCornerCloseButton({ onClick, theme, ariaLabel, className = "" }: { onClick: () => void; theme: ThemeColors; ariaLabel: string; className?: string }) {
  return <IconControl onClick={onClick} theme={theme} ariaLabel={ariaLabel} className={`absolute right-4 top-4 z-20 ${className}`.trim()}><X size={16} aria-hidden="true" /></IconControl>;
}

export function ToggleSwitch({ checked, onChange, theme, ariaLabel, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; theme: ThemeColors; ariaLabel: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel} title={ariaLabel} disabled={disabled} onClick={() => onChange(!checked)} className="relative inline-flex h-9 w-[3.65rem] shrink-0 items-center rounded-full border p-1 transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: checked ? theme.primary : theme.borderMedium, backgroundColor: checked ? theme.primary : theme.bgCardElevated, boxShadow: checked ? `0 0 0 1px color-mix(in srgb, ${theme.primary} 18%, transparent)` : "none", "--tw-ring-color": theme.primary, "--tw-ring-offset-color": theme.bgCard } as React.CSSProperties}>
      <span aria-hidden="true" className="inline-block size-7 rounded-full border shadow-sm transition-transform duration-200 ease-out" style={{ transform: checked ? "translateX(1.35rem)" : "translateX(0)", borderColor: checked ? "rgba(255,255,255,0.24)" : theme.borderLight, backgroundColor: checked ? theme.textOnPrimary : theme.bgCard }} />
    </button>
  );
}

export function DisclosureIndicator({ open, theme, label }: { open: boolean; theme: ThemeColors; label: string }) {
  return <span aria-hidden="true" title={label} className="grid size-9 shrink-0 place-items-center rounded-full border transition" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}><ChevronDown size={15} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease" }} /></span>;
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [active]);
}
