"use client";

import { type ComponentData, createUsePuck, type Field, useGetPuck } from "@puckeditor/core";
import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useImageEditor } from "@/components/page-blocks/image-editor-context";
import { TypographyControls, typographySummary } from "@/components/page-blocks/typography-field";
import {
  type PuckApi,
  ROOT_ZONE,
  updateBlockProps,
  updateRootProps,
} from "@/components/page-blocks/update-block";
import { ACCEPTED_FONT_TYPES, useFontUpload } from "@/components/page-blocks/use-upload";
import type { PageConfig } from "@/lib/page/config";
import type { Typography } from "@/lib/page/typography";
import {
  type CustomFont,
  customFontValue,
  fontFamily,
  fontLabel,
  fontNameFromFile,
  GOOGLE_FONTS,
} from "@/lib/page/fonts";
import {
  ActionRow,
  ColorPicker,
  Icon,
  ImageActions,
  Menu,
  MenuDivider,
  MenuHeader,
  MenuItem,
  OptionRow,
  Swatch,
  TextInput,
} from "./context-menu-ui";

const usePuck = createUsePuck<PageConfig>();

/** Where the menu was opened; `id` is null for the page itself. */
type MenuTarget = { x: number; y: number; id: string | null };

// Survives closing the menu, so a copied block can be pasted elsewhere.
let clipboard: ComponentData | null = null;

// Puck iframe override. Module-level on purpose: Puck remounts the preview
// when this component changes identity.
export function PreviewFrame({ children, document: doc }: { children: ReactNode; document?: Document }) {
  return (
    <>
      <CanvasContextMenu doc={doc} />
      {children}
    </>
  );
}

// Right-click menu for the preview, like in Canva: change a block's
// settings (colors, alignment, links, images...) without the side panel.
// `doc` is the iframe's document; the menu renders in the host page so it
// isn't scaled down with the zoomed preview.
function CanvasContextMenu({ doc }: { doc?: Document }) {
  const getPuck = useGetPuck();
  const [target, setTarget] = useState<MenuTarget | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doc) return;

    const onContextMenu = (event: MouseEvent) => {
      const element = event.target as Element | null;
      // Keep the browser menu for copy/paste while text is selected.
      const selection = doc.getSelection();
      if (element?.closest("[contenteditable='true']") && selection && !selection.isCollapsed) return;
      event.preventDefault();

      const id = element?.closest("[data-puck-component]")?.getAttribute("data-puck-component") ?? null;
      const selector = id ? getPuck().getSelectorForId(id) : undefined;
      getPuck().dispatch({ type: "setUi", ui: { itemSelector: selector ?? null } });

      // The preview is scaled to fit, so map iframe coordinates to the page.
      const frame = doc.defaultView?.frameElement as HTMLElement | null;
      const rect = frame?.getBoundingClientRect();
      const scale = rect && frame?.offsetWidth ? rect.width / frame.offsetWidth : 1;
      setTarget({
        x: (rect?.left ?? 0) + event.clientX * scale,
        y: (rect?.top ?? 0) + event.clientY * scale,
        id: selector ? id : null,
      });
    };

    doc.addEventListener("contextmenu", onContextMenu);
    return () => doc.removeEventListener("contextmenu", onContextMenu);
  }, [doc, getPuck]);

  useEffect(() => {
    if (!target || !doc) return;
    const close = () => setTarget(null);
    const onPointerDown = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && close();
    const onWheel = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) close();
    };
    // Capture phase: Puck's inline text fields stop key and pointer events
    // from bubbling up to the document.
    const targets = [document, doc];
    targets.forEach((t) => {
      t.addEventListener("pointerdown", onPointerDown, true);
      t.addEventListener("keydown", onKeyDown, true);
      t.addEventListener("wheel", onWheel, true);
    });
    window.addEventListener("resize", close);
    return () => {
      targets.forEach((t) => {
        t.removeEventListener("pointerdown", onPointerDown, true);
        t.removeEventListener("keydown", onKeyDown, true);
        t.removeEventListener("wheel", onWheel, true);
      });
      window.removeEventListener("resize", close);
    };
  }, [target, doc]);

  if (!target) return null;
  const close = () => setTarget(null);

  return createPortal(
    <Menu key={`${target.x}:${target.y}`} x={target.x} y={target.y} menuRef={menuRef}>
      {target.id ? <BlockMenu id={target.id} close={close} /> : <PageMenu close={close} />}
    </Menu>,
    document.body,
  );
}

function BlockMenu({ id, close }: { id: string; close: () => void }) {
  const getPuck = useGetPuck();
  // Re-render on every change so the menu shows current values.
  usePuck((s) => s.appState.data);
  const puck = getPuck();
  const item = puck.getItemById(id);
  const selector = puck.getSelectorForId(id);
  if (!item || !selector) return null;

  const { index, zone } = selector;
  const component = puck.config.components[item.type];
  const fields = Object.entries(component?.fields ?? {}) as [string, Field][];
  const count = zoneLength(puck, zone);
  const run = (action: () => void) => {
    action();
    close();
  };

  return (
    <>
      <MenuHeader>{component?.label ?? item.type}</MenuHeader>
      {fields.map(([name, field]) => (
        <FieldItem
          key={name}
          name={name}
          field={field}
          value={item.props[name]}
          block={{ id, props: item.props }}
          optionalColor
          onChange={(value) =>
            // Picking Ljus/Mörk etc. should win over a custom hero color.
            updateBlockProps(
              getPuck(),
              id,
              name === "background" && "backgroundColor" in item.props
                ? { background: value, backgroundColor: "" }
                : { [name]: value },
            )
          }
          close={close}
        />
      ))}
      <MenuItem
        label="Alla inställningar"
        icon={<Icon><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></Icon>}
        onSelect={() =>
          run(() =>
            puck.dispatch({ type: "setUi", ui: { itemSelector: selector, rightSideBarVisible: true } }),
          )
        }
      />
      <MenuDivider />
      <MenuItem
        label="Lägg till block under"
        icon={<Icon><path d="M12 5v14M5 12h14" /></Icon>}
        submenu={<BlockPicker onPick={(type) => run(() => insertBlock(getPuck, type, zone, index + 1))} />}
      />
      <MenuItem
        label="Kopiera"
        icon={<Icon><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></Icon>}
        onSelect={() => run(() => (clipboard = structuredClone(item)))}
      />
      <MenuItem
        label="Klistra in under"
        disabled={!clipboard}
        icon={<Icon><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1" /></Icon>}
        onSelect={() => run(() => clipboard && insertBlock(getPuck, clipboard.type, zone, index + 1, clipboard))}
      />
      <MenuItem
        label="Duplicera"
        icon={<Icon><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></Icon>}
        onSelect={() => run(() => puck.dispatch({ type: "duplicate", sourceIndex: index, sourceZone: zone }))}
      />
      <MenuItem
        label="Flytta upp"
        disabled={index === 0}
        icon={<Icon><path d="M12 19V5M6 11l6-6 6 6" /></Icon>}
        onSelect={() => run(() => move(puck, zone, index, index - 1))}
      />
      <MenuItem
        label="Flytta ner"
        disabled={index >= count - 1}
        icon={<Icon><path d="M12 5v14M6 13l6 6 6-6" /></Icon>}
        onSelect={() => run(() => move(puck, zone, index, index + 1))}
      />
      <MenuDivider />
      <RootColorItem />
      <MenuDivider />
      <MenuItem
        label="Ta bort"
        danger
        icon={<Icon><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Icon>}
        onSelect={() =>
          run(() => {
            puck.dispatch({ type: "setUi", ui: { itemSelector: null } });
            puck.dispatch({ type: "remove", index, zone });
          })
        }
      />
    </>
  );
}

function PageMenu({ close }: { close: () => void }) {
  const getPuck = useGetPuck();
  const data = usePuck((s) => s.appState.data);
  const puck = getPuck();
  const fields = Object.entries(puck.config.root?.fields ?? {}) as [string, Field][];
  const end = data.content.length;
  const run = (action: () => void) => {
    action();
    close();
  };

  return (
    <>
      <MenuHeader>Sida</MenuHeader>
      {fields.map(([name, field]) => (
        <FieldItem
          key={name}
          name={name}
          field={field}
          value={(data.root.props as Record<string, unknown> | undefined)?.[name]}
          onChange={(value) => updateRootProps(getPuck(), { [name]: value })}
          close={close}
        />
      ))}
      <MenuDivider />
      <MenuItem
        label="Lägg till block"
        icon={<Icon><path d="M12 5v14M5 12h14" /></Icon>}
        submenu={<BlockPicker onPick={(type) => run(() => insertBlock(getPuck, type, ROOT_ZONE, end))} />}
      />
      <MenuItem
        label="Klistra in sist"
        disabled={!clipboard}
        icon={<Icon><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1" /></Icon>}
        onSelect={() => run(() => clipboard && insertBlock(getPuck, clipboard.type, ROOT_ZONE, end, clipboard))}
      />
    </>
  );
}

/** The page's theme color, reachable from every block's menu. */
function RootColorItem() {
  const getPuck = useGetPuck();
  const themeColor = usePuck((s) => (s.appState.data.root.props?.themeColor as string | undefined) ?? "");
  return (
    <MenuItem
      label="Sidans temafärg"
      icon={<Icon><path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5s.8-1.5 2-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8.5-9-8.5Z" /></Icon>}
      hint={<Swatch color={themeColor} />}
      submenu={<ColorPicker value={themeColor} onChange={(value) => updateRootProps(getPuck(), { themeColor: value })} />}
    />
  );
}

/**
 * One menu row per editable field, built from the Puck config so new
 * blocks and fields show up here automatically. Text that is edited
 * directly on the page, slots and richtext are left out.
 */
function FieldItem({
  name,
  field,
  value,
  onChange,
  close,
  block,
  optionalColor,
}: {
  name: string;
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  close: () => void;
  /** The block the field belongs to; absent for page fields. */
  block?: { id: string; props: Record<string, unknown> };
  optionalColor?: boolean;
}) {
  const imageEditor = useImageEditor();
  // "Bakgrundsbild (valfri)" -> "Bakgrundsbild": the menu is narrow.
  const label = (field.label ?? name).replace(/\s*\(.*\)$/, "");
  const kind = field.metadata?.kind as string | undefined;

  switch (field.type) {
    case "select":
    case "radio": {
      const current = field.options.find((option) => option.value === value);
      return (
        <MenuItem
          label={label}
          icon={<Icon><path d="M4 7h16M4 12h10M4 17h6" /></Icon>}
          hint={current?.label}
          submenu={field.options.map((option) => (
            <OptionRow
              key={String(option.value)}
              label={option.label}
              selected={option.value === value}
              onSelect={() => {
                onChange(option.value);
                close();
              }}
            />
          ))}
        />
      );
    }
    case "text":
    case "textarea": {
      if (field.contentEditable) return null;
      const text = typeof value === "string" ? value : "";
      return (
        <MenuItem
          label={label}
          icon={
            kind === "url" ? (
              <Icon><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Icon>
            ) : (
              <Icon><path d="M5 6h14M12 6v13" /></Icon>
            )
          }
          hint={kind === "url" ? undefined : text || "–"}
          submenu={
            <TextInput
              value={text}
              placeholder={kind === "url" ? "https://... eller mailto:..." : undefined}
              onSave={(next) => {
                onChange(next);
                close();
              }}
            />
          }
        />
      );
    }
    case "custom": {
      const text = typeof value === "string" ? value : "";
      if (kind === "color") {
        return (
          <MenuItem
            label={label}
            icon={<Icon><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" /></Icon>}
            hint={<Swatch color={text} />}
            submenu={<ColorPicker value={text} onChange={onChange} optional={optionalColor} />}
          />
        );
      }
      if (kind === "image") {
        return (
          <MenuItem
            label={label}
            icon={<Icon><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></Icon>}
            hint={text ? "Vald" : "Ingen"}
            submenu={
              <ImageActions
                hasImage={!!text}
                onChange={(url) => {
                  onChange(url);
                  close();
                }}
              />
            }
          />
        );
      }
      if (kind === "imageEdit") {
        const imageProp = field.metadata?.imageProp as string;
        const hasImage = Boolean(block?.props[imageProp]);
        if (!block || !imageEditor) return null;
        return (
          <MenuItem
            label={hasImage ? "Redigera bild..." : "Redigera bild (ingen bild)"}
            disabled={!hasImage}
            icon={<Icon><path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" /></Icon>}
            onSelect={() => {
              imageEditor.open({
                blockId: block.id,
                imageProp,
                editProp: name,
                background: Boolean(field.metadata?.background),
              });
              close();
            }}
          />
        );
      }
      if (kind === "typography") {
        const typography = value as Partial<Typography> | undefined;
        return (
          <MenuItem
            label={label}
            icon={<Icon><path d="M4 7V5h10v2M9 5v14M7 19h4M14 13v-1h6v1M17 12v7M15.5 19h3" /></Icon>}
            hint={typographySummary(typography)}
            submenu={<TypographyControls value={typography} onChange={onChange} />}
          />
        );
      }
      if (kind === "font") {
        return (
          <MenuItem
            label={label}
            icon={<Icon><path d="M4 20 10 4h1l6 16M6.5 14h8" /></Icon>}
            hint={<span style={{ fontFamily: fontFamily(text) }}>{fontLabel(text)}</span>}
            submenu={
              <FontPicker
                value={text}
                onChange={(font) => {
                  onChange(font);
                  close();
                }}
              />
            }
          />
        );
      }
      return null;
    }
    default:
      return null;
  }
}

/** Fonts shown in their own typeface, plus uploading a new one. */
function FontPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const getPuck = useGetPuck();
  const stored = usePuck((s) => s.appState.data.root.props?.customFonts);
  const customFonts: CustomFont[] = Array.isArray(stored) ? stored : [];
  const { upload, uploading, error } = useFontUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await upload(file);
    if (!url) return;
    const name = fontNameFromFile(file.name, customFonts.map((font) => font.name));
    // Add it to the page's fonts, then use it right away.
    updateRootProps(getPuck(), { customFonts: [...customFonts, { name, url }] });
    onChange(customFontValue(name));
  }

  const option = (font: string) => (
    <OptionRow
      key={font}
      label={fontLabel(font)}
      selected={value === font}
      labelStyle={{ fontFamily: fontFamily(font), fontSize: 15 }}
      onSelect={() => onChange(font)}
    />
  );

  return (
    <>
      <ActionRow
        label={uploading ? "Laddar upp..." : "Ladda upp typsnitt..."}
        disabled={uploading}
        icon={<Icon><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></Icon>}
        onSelect={() => inputRef.current?.click()}
      />
      {error && <p className="px-2.5 py-1 text-xs text-red-600">{error}</p>}
      <input ref={inputRef} type="file" accept={ACCEPTED_FONT_TYPES} onChange={handleFile} className="hidden" />
      <MenuDivider />
      {option("")}
      {customFonts.length > 0 && <MenuHeader>Dina typsnitt</MenuHeader>}
      {customFonts.map((font) => option(customFontValue(font.name)))}
      <MenuHeader>Google Fonts</MenuHeader>
      {GOOGLE_FONTS.map((font) => option(font.name))}
    </>
  );
}

function BlockPicker({ onPick }: { onPick: (type: string) => void }) {
  const getPuck = useGetPuck();
  const { components } = getPuck().config;
  return Object.entries(components).map(([type, component]) => (
    <ActionRow key={type} label={component.label ?? type} onSelect={() => onPick(type)} />
  ));
}

function zoneLength(puck: PuckApi, zone: string) {
  if (zone === ROOT_ZONE) return puck.appState.data.content.length;
  // Slot zones are "<parent id>:<slot prop>".
  const [parentId, slot] = zone.split(":");
  const slotContent = puck.getItemById(parentId)?.props[slot];
  return Array.isArray(slotContent) ? slotContent.length : 0;
}

function move(puck: PuckApi, zone: string, from: number, to: number) {
  puck.dispatch({ type: "reorder", sourceIndex: from, destinationIndex: to, destinationZone: zone });
}

/** Inserts a new block, optionally with the props of a copied block. */
function insertBlock(
  getPuck: () => PuckApi,
  type: string,
  zone: string,
  index: number,
  copy?: ComponentData,
) {
  const id = `${type}-${crypto.randomUUID()}`;
  getPuck().dispatch({ type: "insert", componentType: type, destinationIndex: index, destinationZone: zone, id });
  if (copy) {
    // A fresh object, so dropping the copied block's id is safe.
    const props = withNewIds(copy.props) as Record<string, unknown>;
    delete props.id;
    updateBlockProps(getPuck(), id, props);
  }
  getPuck().dispatch({ type: "setUi", ui: { itemSelector: { index, zone } } });
}

/** Gives blocks nested in slots (e.g. Kolumner) fresh ids, so a pasted copy doesn't clash. */
function withNewIds(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (entry && typeof entry === "object" && "type" in entry && "props" in entry) {
        const block = entry as ComponentData;
        return {
          ...block,
          props: { ...(withNewIds(block.props) as object), id: `${block.type}-${crypto.randomUUID()}` },
        };
      }
      return entry;
    });
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, withNewIds(entry)]));
  }
  return value;
}
