"use client";

import {
  type ChangeEvent,
  type CSSProperties,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ACCEPTED_IMAGE_TYPES, useImageUpload } from "@/components/page-blocks/use-upload";

// Building blocks for the editor's right-click menu: a menu panel, rows
// that can open a submenu to the side, and the controls used in submenus.

export const MENU_WIDTH = 248;
const EDGE = 8;

/**
 * One menu level: which row's submenu is open, and where submenus of this
 * level go. Each submenu is a level of its own, so submenus can nest.
 */
type MenuContextValue = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
  /** The left edge of the top menu, and how deep this level is. */
  left: number;
  depth: number;
  /** In a Toolbar, rows are icon buttons that open a dropdown below. */
  toolbar?: boolean;
};
const MenuContext = createContext<MenuContextValue>({ openId: null, setOpenId: () => {}, left: 0, depth: 0 });

/** Open this level's submenus to the left when there is no room on the right. */
const opensLeft = (left: number, depth: number) => left + MENU_WIDTH * (depth + 2) + EDGE > window.innerWidth;

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

  useLayoutEffect(() => keepInWindow(panelRef.current), []);

  return (
    <MenuContext.Provider value={{ openId, setOpenId, left, depth: 0 }}>
      {/*
        The menu is a React portal from inside Puck's preview, so React would
        pass its clicks on to the preview, which deselects the block.
      */}
      <div
        ref={menuRef}
        className="fixed z-1000"
        style={{ left, top: y }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          ref={panelRef}
          role="menu"
          style={{ width: MENU_WIDTH }}
          className="rounded-xl border border-zinc-200 bg-(--editor-surface) p-1.5 text-sm text-zinc-800 shadow-2xl"
        >
          {children}
        </div>
      </div>
    </MenuContext.Provider>
  );
}

export function MenuHeader({ children }: { children: ReactNode }) {
  if (useContext(MenuContext).toolbar) return null;
  return (
    <div className="px-2.5 pt-1 pb-1.5 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
      {children}
    </div>
  );
}

export function MenuDivider() {
  if (useContext(MenuContext).toolbar) return <div className="mx-1 h-5 w-px shrink-0 bg-zinc-200" />;
  return <div className="mx-1 my-1 h-px bg-zinc-100" />;
}

/**
 * A row of icon buttons built from the same MenuItems as the menus: each
 * opens its submenu as a dropdown below the button. `doc` is the preview
 * iframe's document, so clicks in the page close the dropdown too.
 */
export function Toolbar({ doc, children }: { doc?: Document | null; children: (close: () => void) => ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openId) return;
    const close = () => setOpenId(null);
    const onPointerDown = (event: Event) => {
      const target = event.target as Element | null;
      if (rootRef.current?.contains(target) || target?.closest?.("[data-toolbar-dropdown]")) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && close();
    // Capture phase: Puck's inline text fields stop events from bubbling.
    const targets: Document[] = doc ? [document, doc] : [document];
    targets.forEach((t) => {
      t.addEventListener("pointerdown", onPointerDown, true);
      t.addEventListener("keydown", onKeyDown, true);
    });
    window.addEventListener("resize", close);
    return () => {
      targets.forEach((t) => {
        t.removeEventListener("pointerdown", onPointerDown, true);
        t.removeEventListener("keydown", onKeyDown, true);
      });
      window.removeEventListener("resize", close);
    };
  }, [openId, doc]);

  return (
    <MenuContext.Provider value={{ openId, setOpenId, left: 0, depth: -1, toolbar: true }}>
      {/* Puck's canvas deselects the block on clicks that bubble up to it. */}
      <div
        ref={rootRef}
        role="toolbar"
        aria-label="Inställningar"
        className="flex items-center gap-0.5"
        onClick={(event) => event.stopPropagation()}
      >
        {children(() => setOpenId(null))}
      </div>
    </MenuContext.Provider>
  );
}

function ToolbarButton({ id, label, icon, hint, disabled, danger, onSelect, submenu, scrollable, face }: MenuItemProps) {
  const { openId, setOpenId } = useContext(MenuContext);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const key = id ?? label;
  const open = submenu !== undefined && openId === key && anchor !== null;
  const title = typeof hint === "string" && hint ? `${label}: ${hint}` : label;

  return (
    <>
      <button
        type="button"
        title={title}
        aria-label={label}
        aria-haspopup={submenu !== undefined || undefined}
        aria-expanded={submenu !== undefined ? open : undefined}
        disabled={disabled}
        onClick={(event) => {
          if (submenu === undefined) {
            setOpenId(null);
            onSelect?.();
            return;
          }
          setAnchor(event.currentTarget.getBoundingClientRect());
          setOpenId(open ? null : key);
        }}
        className={`flex h-8 shrink-0 items-center justify-center rounded-lg disabled:cursor-default disabled:opacity-40 ${
          face === undefined ? "w-8 [&>svg]:size-[18px]" : "px-2 text-sm font-medium whitespace-nowrap"
        } ${
          danger
            ? "text-red-600 hover:bg-red-50"
            : `hover:bg-zinc-100 ${open ? "bg-violet-100 text-violet-900" : "text-zinc-800"}`
        }`}
      >
        {face === "label" ? label : (face ?? icon)}
      </button>
      {open && (
        <Dropdown anchor={anchor} scrollable={scrollable}>
          {submenu}
        </Dropdown>
      )}
    </>
  );
}

/** A toolbar button's dropdown, in the page so the toolbar can't clip it. */
function Dropdown({ anchor, scrollable, children }: { anchor: DOMRect; scrollable?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const left = Math.max(EDGE, Math.min(anchor.left, window.innerWidth - MENU_WIDTH - EDGE));
  useLayoutEffect(() => keepInWindow(ref.current), []);
  // Scrolling would clip nested submenus, so only long lists scroll.
  return createPortal(
    <MenuContext.Provider value={{ openId, setOpenId, left, depth: 0 }}>
      <div
        ref={ref}
        role="menu"
        data-toolbar-dropdown
        style={{ left, top: anchor.bottom + 6, width: MENU_WIDTH }}
        className={`fixed z-1000 rounded-xl border border-zinc-200 bg-(--editor-surface) p-1.5 text-sm text-zinc-800 shadow-2xl ${
          scrollable ? "max-h-[70vh] overflow-y-auto" : ""
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </MenuContext.Provider>,
    document.body,
  );
}

type MenuItemProps = {
  /** Tells rows with the same label apart (defaults to the label). */
  id?: string;
  label: string;
  icon?: ReactNode;
  /** Shown to the right, e.g. the current value. */
  hint?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSelect?: () => void;
  /** Content of a submenu that opens beside this row. */
  submenu?: ReactNode;
  /** For long submenus (e.g. fonts): scroll instead of growing. */
  scrollable?: boolean;
  /**
   * What the button shows in a Toolbar instead of the icon, e.g. a color
   * or the font name; "label" shows the label as text.
   */
  face?: ReactNode;
};

/** Whether this is rendered in a Toolbar rather than a menu. */
export const useInToolbar = () => Boolean(useContext(MenuContext).toolbar);

export function MenuItem(props: MenuItemProps) {
  if (useContext(MenuContext).toolbar) return <ToolbarButton {...props} />;
  return <MenuRow {...props} />;
}

function MenuRow({ id, label, icon, hint, disabled, danger, onSelect, submenu, scrollable }: MenuItemProps) {
  const { openId, setOpenId, left, depth } = useContext(MenuContext);
  const key = id ?? label;
  const open = submenu !== undefined && openId === key;

  return (
    <div className="relative" onMouseEnter={() => setOpenId(submenu !== undefined ? key : null)}>
      <button
        type="button"
        role="menuitem"
        aria-haspopup={submenu !== undefined || undefined}
        aria-expanded={submenu !== undefined ? open : undefined}
        disabled={disabled}
        onClick={() => (submenu !== undefined ? setOpenId(key) : onSelect?.())}
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
      {open && (
        <Submenu left={left} depth={depth} scrollable={scrollable}>
          {submenu}
        </Submenu>
      )}
    </div>
  );
}

function Submenu({
  left,
  depth,
  scrollable,
  children,
}: {
  left: number;
  depth: number;
  scrollable?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  useLayoutEffect(() => keepInWindow(ref.current), []);
  // Scrolling would clip nested submenus, so only long lists scroll.
  // z-10: without it, the rows after this one in the parent menu are drawn
  // on top of the submenu when it opens over them (e.g. a third level that
  // opens to the left, over the first menu).
  return (
    <MenuContext.Provider value={{ openId, setOpenId, left, depth: depth + 1 }}>
      <div
        ref={ref}
        role="menu"
        style={{ width: MENU_WIDTH }}
        className={`absolute -top-1.5 z-10 rounded-xl border border-zinc-200 bg-(--editor-surface) p-1.5 shadow-2xl ${
          scrollable ? "max-h-[70vh] overflow-y-auto" : ""
        } ${opensLeft(left, depth) ? "right-full mr-1.5" : "left-full ml-1.5"}`}
      >
        {children}
      </div>
    </MenuContext.Provider>
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
  labelStyle,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  preview?: ReactNode;
  /** E.g. a font, to show each font in itself. */
  labelStyle?: CSSProperties;
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
      <span style={labelStyle} className="flex-1 truncate">
        {label}
      </span>
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
          label="Standard"
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

/** A number with a unit (e.g. px) and a save button. */
export function NumberInput({
  value,
  min,
  max,
  unit,
  hint,
  onSave,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  hint?: string;
  onSave: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const number = Number(text);
  const valid = text.trim() !== "" && Number.isFinite(number) && number >= min && number <= max;
  return (
    <form
      className="grid gap-2 p-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSave(Math.round(number));
      }}
    >
      <label className="flex items-center gap-2">
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 px-2.5 text-sm tabular-nums focus:border-violet-500 focus:outline-none"
        />
        <span className="text-zinc-500">{unit}</span>
      </label>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      <button
        type="submit"
        disabled={!valid}
        className="h-8 rounded-lg bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        Spara
      </button>
    </form>
  );
}

/** A number with a choice of unit (e.g. px or %), and a save button. */
export function NumberUnitInput({
  value,
  unit,
  units,
  min,
  hint,
  onSave,
}: {
  value: number;
  unit: string;
  units: { value: string; label: string; max: number }[];
  min: number;
  hint?: string;
  onSave: (value: number, unit: string) => void;
}) {
  const [text, setText] = useState(String(value));
  const [current, setCurrent] = useState(unit);
  const max = units.find((u) => u.value === current)?.max ?? Infinity;
  const number = Number(text);
  const valid = text.trim() !== "" && Number.isFinite(number) && number >= min && number <= max;
  return (
    <form
      className="grid gap-2 p-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSave(Math.round(number), current);
      }}
    >
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          aria-label="Värde"
          min={min}
          max={max}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 px-2.5 text-sm tabular-nums focus:border-violet-500 focus:outline-none"
        />
        <div role="radiogroup" aria-label="Enhet" className="flex rounded-lg bg-zinc-100 p-0.5">
          {units.map((u) => (
            <button
              key={u.value}
              type="button"
              role="radio"
              aria-checked={current === u.value}
              onClick={() => setCurrent(u.value)}
              className={`h-8 min-w-9 rounded-md px-2 text-sm font-medium ${
                current === u.value ? "bg-(--editor-surface) text-violet-800 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      <button
        type="submit"
        disabled={!valid}
        className="h-8 rounded-lg bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        Spara
      </button>
    </form>
  );
}

/** Upload, edit or remove an image. */
export function ImageActions({
  hasImage,
  onChange,
  onEdit,
}: {
  hasImage: boolean;
  onChange: (url: string) => void;
  /** Opens the image editor; the row shows when there is an image. */
  onEdit?: () => void;
}) {
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
      {hasImage && onEdit && (
        <ActionRow
          label="Redigera bild..."
          icon={
            <Icon>
              <path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" />
            </Icon>
          }
          onSelect={onEdit}
        />
      )}
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
