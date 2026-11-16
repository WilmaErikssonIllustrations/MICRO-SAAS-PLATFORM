"use client";

import {
  type ChangeEvent,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ACCEPTED_IMAGE_TYPES, useImageUpload } from "@/components/page-blocks/use-image-upload";

// Building blocks for the editor's right-click menu: a menu panel, rows
// that can open a submenu to the side, and the controls used in submenus.

export const MENU_WIDTH = 248;
const EDGE = 8;

type MenuContextValue = { openId: string | null; setOpenId: (id: string | null) => void; flip: boolean };
const MenuContext = createContext<MenuContextValue>({ openId: null, setOpenId: () => {}, flip: false });

/** Moves `el` up so it stays inside the window. */
function keepInWindow(el: HTMLElement | null) {
  if (!el) return;
  const overflow = el.getBoundingClientRect().bottom - (window.innerHeight - EDGE);
  if (overflow > 0) el.style.translate = `0 ${-overflow}px`;
}

export function Menu({
  x,
  y,
  menuRef,
  children,
}: {
  x: number;
  y: number;
  menuRef: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const left = Math.max(EDGE, Math.min(x, window.innerWidth - MENU_WIDTH - EDGE));
  // Open submenus to the left when there is no room on the right.
  const flip = left + MENU_WIDTH * 2 + EDGE > window.innerWidth;

  useLayoutEffect(() => keepInWindow(panelRef.current), []);

  return (
    <MenuContext.Provider value={{ openId, setOpenId, flip }}>
      <div ref={menuRef} className="fixed z-1000" style={{ left, top: y }}>
        <div
          ref={panelRef}
          role="menu"
          style={{ width: MENU_WIDTH }}
          className="rounded-xl border border-zinc-200 bg-white p-1.5 text-sm text-zinc-800 shadow-2xl"
        >
          {children}
        </div>
      </div>
    </MenuContext.Provider>
  );
}

export function MenuHeader({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pt-1 pb-1.5 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
      {children}
    </div>
  );
}

export function MenuDivider() {
  return <div className="mx-1 my-1 h-px bg-zinc-100" />;
}

type MenuItemProps = {
  label: string;
  icon?: ReactNode;
  /** Shown to the right, e.g. the current value. */
  hint?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSelect?: () => void;
  /** Content of a submenu that opens beside this row. */
  submenu?: ReactNode;
};

export function MenuItem({ label, icon, hint, disabled, danger, onSelect, submenu }: MenuItemProps) {
  const { openId, setOpenId, flip } = useContext(MenuContext);
  const open = submenu !== undefined && openId === label;

  return (
    <div className="relative" onMouseEnter={() => setOpenId(submenu !== undefined ? label : null)}>
      <button
        type="button"
        role="menuitem"
        aria-haspopup={submenu !== undefined || undefined}
        aria-expanded={submenu !== undefined ? open : undefined}
        disabled={disabled}
        onClick={() => (submenu !== undefined ? setOpenId(label) : onSelect?.())}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left disabled:cursor-default disabled:opacity-40 ${
          danger
            ? "text-red-600 hover:bg-red-50"
            : `hover:bg-violet-50 hover:text-violet-900 ${open ? "bg-violet-50 text-violet-900" : ""}`
        }`}
      >
        <span className="flex size-4 shrink-0 items-center justify-center text-current opacity-70">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {hint !== undefined && <span className="max-w-24 truncate text-xs text-zinc-400">{hint}</span>}
        {submenu !== undefined && (
          <Icon className="shrink-0 text-zinc-400">
            <path d="m9 6 6 6-6 6" />
          </Icon>
        )}
      </button>
      {open && <Submenu flip={flip}>{submenu}</Submenu>}
    </div>
  );
}

function Submenu({ flip, children }: { flip: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => keepInWindow(ref.current), []);
  return (
    <div
      ref={ref}
      role="menu"
      style={{ width: MENU_WIDTH }}
      className={`absolute -top-1.5 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xl ${
        flip ? "right-full mr-1.5" : "left-full ml-1.5"
      }`}
    >
      {children}
    </div>
  );
}

/** A plain action inside a submenu. */
export function ActionRow({
  label,
  icon,
  disabled,
  danger,
  onSelect,
}: {
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left disabled:cursor-default disabled:opacity-40 ${
        danger ? "text-red-600 hover:bg-red-50" : "hover:bg-violet-50 hover:text-violet-900"
      }`}
    >
      <span className="flex size-4 shrink-0 items-center justify-center opacity-70">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

/** A choice in a submenu, with a check mark when it is the current one. */
export function OptionRow({
  label,
  selected,
  onSelect,
  preview,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  preview?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-violet-50 ${
        selected ? "font-semibold text-violet-800" : ""
      }`}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {selected && (
          <Icon>
            <path d="M5 12l5 5 9-11" />
          </Icon>
        )}
      </span>
      {preview}
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

const SWATCHES = [
  "#111827", "#ffffff", "#64748b", "#2563eb", "#0891b2", "#0d9488",
  "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#7c3aed",
];

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Color swatches, a custom color picker and (optionally) "Standard". */
export function ColorPicker({
  value,
  onChange,
  optional,
}: {
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  const [hex, setHex] = useState(value);

  function pick(color: string) {
    setHex(color);
    onChange(color);
  }

  return (
    <div className="grid gap-2 p-1">
      {optional && (
        <OptionRow
          label="Standard (temafärgen)"
          selected={!value}
          onSelect={() => pick("")}
          preview={<Swatch color="" />}
        />
      )}
      <div className="grid grid-cols-6 gap-1.5 px-1">
        {SWATCHES.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            aria-label={`Färg ${color}`}
            onClick={() => pick(color)}
            style={{ background: color }}
            className={`aspect-square rounded-full ring-1 ring-black/10 transition hover:scale-110 ${
              value.toLowerCase() === color ? "outline-2 outline-offset-2 outline-violet-600" : ""
            }`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 px-1 pt-1">
        <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-black/10">
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
          />
          <input
            type="color"
            aria-label="Egen färg"
            value={HEX_COLOR.test(value) ? value : "#000000"}
            onChange={(event) => pick(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <input
          type="text"
          value={hex}
          placeholder={optional ? "Standard" : "#000000"}
          maxLength={7}
          onChange={(event) => {
            setHex(event.target.value);
            if (HEX_COLOR.test(event.target.value)) onChange(event.target.value);
          }}
          className="h-8 min-w-0 flex-1 rounded-lg border border-zinc-200 px-2 font-mono text-xs focus:border-violet-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

export function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-4 shrink-0 rounded-full ring-1 ring-black/15"
      style={{
        background: color || "linear-gradient(135deg, #fff 45%, #ef4444 45%, #ef4444 55%, #fff 55%)",
      }}
    />
  );
}

/** A text input with a save button, for links and other short texts. */
export function TextInput({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder?: string;
  onSave: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  return (
    <form
      className="grid gap-2 p-1"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(text.trim());
      }}
    >
      <input
        autoFocus
        type="text"
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        className="h-9 rounded-lg border border-zinc-200 px-2.5 text-sm focus:border-violet-500 focus:outline-none"
      />
      <button
        type="submit"
        className="h-8 rounded-lg bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700"
      >
        Spara
      </button>
    </form>
  );
}

/** Upload or remove an image. */
export function ImageActions({ hasImage, onChange }: { hasImage: boolean; onChange: (url: string) => void }) {
  const { upload, uploading, error } = useImageUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await upload(file);
    if (url) onChange(url);
  }

  return (
    <div className="grid">
      <ActionRow
        label={uploading ? "Laddar upp..." : hasImage ? "Byt bild..." : "Ladda upp bild..."}
        disabled={uploading}
        icon={
          <Icon>
            <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
          </Icon>
        }
        onSelect={() => inputRef.current?.click()}
      />
      {hasImage && (
        <ActionRow
          label="Ta bort bild"
          danger
          icon={
            <Icon>
              <path d="M6 6l12 12M18 6 6 18" />
            </Icon>
          }
          onSelect={() => onChange("")}
        />
      )}
      {error && <p className="px-2.5 py-1 text-xs text-red-600">{error}</p>}
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES} onChange={handleFile} className="hidden" />
    </div>
  );
}

export function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}
