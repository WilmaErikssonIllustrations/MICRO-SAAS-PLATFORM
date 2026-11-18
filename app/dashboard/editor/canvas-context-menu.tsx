"use client";

import { type ComponentData, createUsePuck, type Field, useGetPuck } from "@puckeditor/core";
import { type ChangeEvent, Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useImageEditor } from "@/components/page-blocks/image-editor-context";
import { BoxControls, boxSummary } from "@/components/page-blocks/box-field";
import { setColumnColor } from "@/components/page-blocks/column-colors-field";
import { columnWidthsSummary } from "@/components/page-blocks/column-widths-field";
import {
  resolveBasePx,
  TypographyControls,
  type TypographyMetadata,
  typographySummary,
} from "@/components/page-blocks/typography-field";
import {
  type PuckApi,
  ROOT_ZONE,
  updateBlockProps,
  updateRootProps,
} from "@/components/page-blocks/update-block";
import { ACCEPTED_FONT_TYPES, useFontUpload } from "@/components/page-blocks/use-upload";
import type { Box } from "@/lib/page/box";
import type { PageConfig } from "@/lib/page/config";
import type { TextStyle } from "@/lib/page/text-style";
import { TYPOGRAPHY_RANGES, type Typography, withTypographyDefaults } from "@/lib/page/typography";
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
  NumberInput,
  NumberUnitInput,
  OptionRow,
  Swatch,
  TextInput,
  Toolbar,
  useInToolbar,
} from "./context-menu-ui";
import { PART_LABELS, partAt, setActivePart, useActivePart } from "./active-part";
import { layerLabel, renameLayer } from "./layers-panel";
import { PartTracker } from "./part-fields";
import { ResizeHandles } from "./resize-handles";

const usePuck = createUsePuck<PageConfig>();

/** Where the menu was opened; `id` is null for the page itself. */
/**
 * Where the menu was opened; `id` is null for the page itself. `part` is
 * the part of a block that was clicked (e.g. the Hero's title), see
 * `data-part` in components/page-blocks/blocks.tsx.
 */
type MenuTarget = { x: number; y: number; id: string | null; part: string | null };


// Survives closing the menu, so a copied block can be pasted elsewhere.
let clipboard: ComponentData | null = null;

// Puck iframe override. Module-level on purpose: Puck remounts the preview
// when this component changes identity.
export function PreviewFrame({ children, document: doc }: { children: ReactNode; document?: Document }) {
  return (
    <>
      <CanvasContextMenu doc={doc} />
      <SettingsToolbar doc={doc} />
      <PartTracker doc={doc} />
      <ResizeHandles doc={doc} />
      {children}
    </>
  );
}

// Puck's bar with the Mobil/Surfplatta/Dator buttons above the canvas. Puck
// has no override for it, so the toolbar is put into it from outside.
const VIEWPORT_BAR = '[class*="_ViewportControls-actionsInner_"]';

/** Puck's viewport bar, once it is on the page. */
function useViewportBar() {
  const [bar, setBar] = useState<Element | null>(null);
  useEffect(() => {
    const find = () => {
      const found = document.querySelector(VIEWPORT_BAR);
      setBar((current) => (current === found ? current : found));
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return bar;
}

// The settings of the selected block (or of the clicked part of it, e.g.
// the Hero's title), as icons with dropdowns beside the viewport buttons.
// Nothing shows with nothing selected. Replaces Puck's side panel.
function SettingsToolbar({ doc }: { doc?: Document }) {
  const bar = useViewportBar();
  const selectedId = usePuck((s) => s.selectedItem?.props.id as string | undefined);
  const active = useActivePart();
  // With nothing selected there is nothing to set: the page's name is in
  // the top bar and fonts are picked per text block.
  if (!bar || !selectedId) return null;
  const part = selectedId && active?.id === selectedId ? active.part : null;

  return createPortal(
    <div className="ml-1 flex items-center border-l border-zinc-200 pl-1">
      {/* Keyed so an open dropdown closes when the selection changes. */}
      <Toolbar key={`${selectedId}:${part}`} doc={doc}>
        {(close) => <BlockFieldItems id={selectedId} part={part} close={close} />}
      </Toolbar>
    </div>,
    bar,
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

      const { id, part } = partAt(element);
      const selector = id ? getPuck().getSelectorForId(id) : undefined;
      // The side panel follows the clicked part too.
      setActivePart(id && part ? { id, part } : null);
      getPuck().dispatch({ type: "setUi", ui: { itemSelector: selector ?? null } });

      // The preview is scaled to fit, so map iframe coordinates to the page.
      const frame = doc.defaultView?.frameElement as HTMLElement | null;
      const rect = frame?.getBoundingClientRect();
      const scale = rect && frame?.offsetWidth ? rect.width / frame.offsetWidth : 1;
      setTarget({
        x: (rect?.left ?? 0) + event.clientX * scale,
        y: (rect?.top ?? 0) + event.clientY * scale,
        id: selector ? id : null,
        part,
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
      {target.id ? <BlockMenu id={target.id} part={target.part} close={close} /> : <PageMenu close={close} />}
    </Menu>,
    document.body,
  );
}

function BlockMenu({ id, part, close }: { id: string; part: string | null; close: () => void }) {
  const getPuck = useGetPuck();
  // Re-render on every change so the menu shows current values.
  usePuck((s) => s.appState.data);
  const puck = getPuck();
  const item = puck.getItemById(id);
  const selector = puck.getSelectorForId(id);
  if (!item || !selector) return null;

  const { index, zone } = selector;
  const component = puck.config.components[item.type];
  const count = zoneLength(puck, zone);
  const run = (action: () => void) => {
    action();
    close();
  };

  // A right-click on a part (e.g. the hero's title) shows only that part.
  if (hasPartFields(puck, item, part)) {
    return (
      <>
        <MenuHeader>{`${layerLabel(puck, item)} › ${PART_LABELS[part ?? ""] ?? part}`}</MenuHeader>
        <BlockFieldItems id={id} part={part} close={close} />
      </>
    );
  }

  return (
    <>
      <MenuHeader>{layerLabel(puck, item)}</MenuHeader>
      <BlockFieldItems id={id} part={null} close={close} />
      <MenuDivider />
      <MenuItem
        label="Ordna"
        icon={<Icon><path d="M4 7h16M4 12h16M4 17h16" /></Icon>}
        submenu={
          <>
            <MenuItem
              label="Byt namn..."
              icon={<Icon><path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" /></Icon>}
              submenu={
                <TextInput
                  value={typeof item.props.layerName === "string" ? item.props.layerName : ""}
                  placeholder={component?.label ?? item.type}
                  onSave={(name) => run(() => renameLayer(getPuck(), id, name))}
                />
              }
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
            <MenuItem
              label="Duplicera"
              icon={<Icon><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></Icon>}
              onSelect={() => run(() => puck.dispatch({ type: "duplicate", sourceIndex: index, sourceZone: zone }))}
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
            <MenuDivider />
            <MenuItem
              label="Lägg till block under"
              icon={<Icon><path d="M12 5v14M5 12h14" /></Icon>}
              submenu={<BlockPicker onPick={(type) => run(() => insertBlock(getPuck, type, zone, index + 1))} />}
            />
            <MenuItem
              label="Gruppera"
              icon={<Icon><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 9h10M7 13h6" /></Icon>}
              onSelect={() => run(() => wrapInSection(getPuck, id))}
            />
          </>
        }
      />
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

/** A color for text (vs. a fill like a background or button), by its label. */
const isTextColor = (name: string, field: Field) => /text|rubrik/i.test(field.label ?? name);

/** Font, size, text color, B/I/U, then everything else. */
function textOrder(name: string, field: Field) {
  const kind = field.metadata?.kind;
  if (kind === "font") return 0;
  if (kind === "typography") return 1;
  if (kind === "color" && isTextColor(name, field)) return 2;
  if (kind === "textStyle") return 3;
  if (kind === "textEffect") return 3.5;
  return 4;
}

/** Whether a block has settings of its own for `part` (metadata.part). */
function hasPartFields(puck: PuckApi, item: ComponentData, part: string | null) {
  if (!part) return false;
  const fields = Object.values(puck.config.components[item.type]?.fields ?? {}) as Field[];
  return fields.some((field) => field.metadata?.part === part);
}

/**
 * A block's settings, as menu rows (or toolbar buttons, see Toolbar):
 * only the fields of `part` when it has any (e.g. the Hero's title), so a
 * change there only affects that part; otherwise the whole block's
 * fields, grouped fields (metadata.group) as one item each, and the
 * container's settings.
 */
export function BlockFieldItems({ id, part, close }: { id: string; part: string | null; close: () => void }) {
  const getPuck = useGetPuck();
  const inToolbar = useInToolbar();
  // Re-render on every change so the items show current values.
  usePuck((s) => s.appState.data);
  const puck = getPuck();
  const item = puck.getItemById(id);
  const selector = puck.getSelectorForId(id);
  if (!item || !selector) return null;

  const fields = Object.entries(puck.config.components[item.type]?.fields ?? {}) as [string, Field][];
  const partOf = (field: Field) => field.metadata?.part as string | undefined;
  const onPart = hasPartFields(puck, item, part);
  const shown = fields
    .filter(([, field]) => (onPart ? partOf(field) === part : !partOf(field)))
    // Text settings first, in Canva's order; the rest as in the config.
    .sort(([nameA, a], [nameB, b]) => textOrder(nameA, a) - textOrder(nameB, b));

  const changeField = (name: string, value: unknown) => {
    const patch: Record<string, unknown> = { [name]: value };
    // Picking Ljus/Mörk etc. should win over a custom hero color.
    if (name === "background" && "backgroundColor" in item.props) patch.backgroundColor = "";
    // A background color replaces the background image (metadata.replaces),
    // which would otherwise cover it. One step, so undo brings both back.
    const replaces = fields.find(([fieldName]) => fieldName === name)?.[1].metadata?.replaces as string | undefined;
    if (replaces && value && item.props[replaces]) patch[replaces] = "";
    updateBlockProps(getPuck(), id, patch);
  };
  const fieldItem = ([name, field]: [string, Field]) => (
    <FieldItem
      key={name}
      name={name}
      field={field}
      value={item.props[name]}
      block={{ id, props: item.props }}
      optionalColor
      onChange={(value) => changeField(name, value)}
      close={close}
    />
  );
  if (onPart) return <>{shown.map(fieldItem)}</>;

  const groupOf = (field: Field) => field.metadata?.group as string | undefined;
  const topFields = shown.filter(([, field]) => !groupOf(field));
  const groups = new Map<string, [string, Field][]>();
  for (const entry of shown) {
    const group = groupOf(entry[1]);
    if (group) groups.set(group, [...(groups.get(group) ?? []), entry]);
  }
  const { zone } = selector;

  // In the toolbar, a group's settings are buttons of their own (no
  // dropdown that opens more dropdowns); in menus, one row per group.
  if (inToolbar) {
    return (
      <>
        {topFields.map(fieldItem)}
        {[...groups].map(([group, entries]) => (
          <Fragment key={group}>
            <MenuDivider />
            {entries.map(fieldItem)}
          </Fragment>
        ))}
        <ContainerItems zone={zone} close={close} />
      </>
    );
  }

  return (
    <>
      {topFields.map(fieldItem)}
      {(groups.size > 0 || puck.getItemById(zone.split(":")[0])) && <MenuDivider />}
      {[...groups].map(([group, entries]) => (
        <MenuItem
          key={group}
          id={`group:${group}`}
          label={GROUP_LABELS[group] ?? group}
          face="label"
          icon={<Icon><rect x="4" y="5" width="16" height="14" rx="3" /><path d="M4 15l4-4 4 4 3-3 5 5" /></Icon>}
          submenu={entries.map(fieldItem)}
        />
      ))}
      <ContainerItems zone={zone} close={close} />
    </>
  );
}

/**
 * The page's own settings (Puck's root fields), as menu rows or toolbar
 * buttons. Not its name: that is edited where it shows, in the top bar.
 */
export function PageFieldItems({ close }: { close: () => void }) {
  const getPuck = useGetPuck();
  const data = usePuck((s) => s.appState.data);
  const fields = (Object.entries(getPuck().config.root?.fields ?? {}) as [string, Field][]).filter(
    ([name]) => name !== "title",
  );
  return fields.map(([name, field]) => (
    <FieldItem
      key={name}
      name={name}
      field={field}
      value={(data.root.props as Record<string, unknown> | undefined)?.[name]}
      onChange={(value) => updateRootProps(getPuck(), { [name]: value })}
      close={close}
    />
  ));
}

function PageMenu({ close }: { close: () => void }) {
  const getPuck = useGetPuck();
  const data = usePuck((s) => s.appState.data);
  const end = data.content.length;
  const run = (action: () => void) => {
    action();
    close();
  };

  return (
    <>
      <MenuHeader>Sida</MenuHeader>
      <PageFieldItems close={close} />
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

/** Names of field groups (metadata.group in lib/page/config.tsx). */
const GROUP_LABELS: Record<string, string> = { background: "Bakgrund", heroBackground: "Bakgrund & höjd" };

// Slot names of Kolumner, in column order.
const COLUMN_SLOTS = ["left", "right", "third", "fourth"];

/**
 * Settings of the container a block is in, so its background can be
 * changed from the block: the Grupp, or the column and the whole
 * Kolumner. One row with a submenu, or nothing on the page itself.
 */
function ContainerItems({ zone, close }: { zone: string; close: () => void }) {
  const getPuck = useGetPuck();
  const inToolbar = useInToolbar();
  usePuck((s) => s.appState.data);
  const puck = getPuck();
  const [parentId, slot] = zone.split(":");
  const parent = parentId === "root" ? undefined : puck.getItemById(parentId);
  if (parent?.type !== "Section" && parent?.type !== "Columns") return null;

  const parentProps = parent.props as Record<string, unknown>;
  const color = (value: unknown) => (typeof value === "string" ? value : "");
  const setParent = (patch: Record<string, unknown>) => updateBlockProps(getPuck(), parentId, patch);
  // A color replaces the Grupp's background image, like on the block itself.
  const setParentColor = (bgColor: string) =>
    setParent(bgColor && parentProps.bgImage ? { bgColor, bgImage: "" } : { bgColor });
  const selectParent = () => {
    const selector = getPuck().getSelectorForId(parentId);
    if (selector) getPuck().dispatch({ type: "setUi", ui: { itemSelector: selector } });
    close();
  };
  const paletteIcon = <Icon><rect x="4" y="5" width="16" height="14" rx="3" /><path d="M4 10h16" /></Icon>;
  const selectIcon = <Icon><path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4" /></Icon>;
  const column = COLUMN_SLOTS.indexOf(slot);
  const columnColors = parentProps.columnColors as string[] | undefined;

  const items =
    parent.type === "Section" ? (
      <>
        <MenuItem
          label="Gruppens bakgrundsfärg"
          icon={paletteIcon}
          hint={<Swatch color={color(parentProps.bgColor)} />}
          face={<FillColorFace color={color(parentProps.bgColor)} />}
          submenu={<ColorPicker value={color(parentProps.bgColor)} optional onChange={setParentColor} />}
        />
        <MenuItem label="Markera gruppen" icon={selectIcon} onSelect={selectParent} />
      </>
    ) : (
      <>
        <MenuItem
          label="Kolumnens bakgrundsfärg"
          icon={paletteIcon}
          hint={<Swatch color={color(columnColors?.[column])} />}
          face={<FillColorFace color={color(columnColors?.[column])} />}
          submenu={
            <ColorPicker
              value={color(columnColors?.[column])}
              optional
              onChange={(value) => setParent({ columnColors: setColumnColor(columnColors, column, value) })}
            />
          }
        />
        <MenuItem
          label="Kolumners bakgrundsfärg"
          icon={paletteIcon}
          hint={<Swatch color={color(parentProps.bgColor)} />}
          face={<FillColorFace color={color(parentProps.bgColor)} />}
          submenu={<ColorPicker value={color(parentProps.bgColor)} optional onChange={setParentColor} />}
        />
        <MenuItem label="Markera Kolumner" icon={selectIcon} onSelect={selectParent} />
      </>
    );

  // In the toolbar, as buttons of their own after a divider.
  if (inToolbar) {
    return (
      <>
        <MenuDivider />
        {items}
      </>
    );
  }

  return (
    <MenuItem
      label={parent.type === "Section" ? "Grupp" : "Kolumner"}
      face="label"
      icon={<Icon><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 9h10M7 13h6" /></Icon>}
      submenu={items}
    />
  );
}

/** Puts a block into a new Grupp (Section) at its place, and selects the Grupp. */
function wrapInSection(getPuck: () => PuckApi, id: string) {
  const selector = getPuck().getSelectorForId(id);
  if (!selector) return;
  const sectionId = `Section-${crypto.randomUUID()}`;
  const { dispatch } = getPuck();
  dispatch({ type: "insert", componentType: "Section", destinationIndex: selector.index, destinationZone: selector.zone, id: sectionId });
  // The new Grupp pushed the block one step down.
  dispatch({
    type: "move",
    sourceIndex: selector.index + 1,
    sourceZone: selector.zone,
    destinationIndex: 0,
    destinationZone: `${sectionId}:content`,
  });
  dispatch({ type: "setUi", ui: { itemSelector: { index: selector.index, zone: selector.zone } } });
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
  const getPuck = useGetPuck();
  const imageEditor = useImageEditor();
  const inToolbar = useInToolbar();
  // "Bakgrundsbild (valfri)" -> "Bakgrundsbild": the menu is narrow. A
  // field can also give a shorter menu label of its own.
  const label = (field.metadata?.menuLabel as string | undefined) ?? (field.label ?? name).replace(/\s*\(.*\)$/, "");
  const kind = field.metadata?.kind as string | undefined;
  if (field.visible === false) return null;
  // Settings that only matter with something else set, e.g. the hero's
  // image settings (metadata.needs: "image") once it has an image.
  const needs = field.metadata?.needs as string | undefined;
  if (needs && block && !block.props[needs]) return null;
  // ...or with other settings at given values (metadata.showWhen), e.g.
  // the color under the hero's image only with "Bilden ovanför texten".
  const showWhen = field.metadata?.showWhen as Record<string, unknown> | undefined;
  if (showWhen && block && Object.entries(showWhen).some(([prop, wanted]) => block.props[prop] !== wanted)) return null;

  switch (field.type) {
    case "number": {
      const number = typeof value === "number" ? value : 0;
      // A sibling prop can hold the unit (e.g. Hero's heroHeightUnit, the
      // Image's widthUnit): one row for the number and its unit.
      const unitProp = field.metadata?.unitProp as string | undefined;
      const units = (field.metadata?.units ?? []) as { value: string; label: string; max: number }[];
      const unit = units.find((u) => u.value === block?.props[unitProp ?? ""]) ?? units[0];
      return (
        <MenuItem
          id={name}
          label={label}
          icon={numberIcon(name)}
          hint={number > 0 ? `${number} ${unit?.label ?? "px"}` : "Auto"}
          submenu={
            unitProp && block && unit ? (
              <NumberUnitInput
                value={number}
                unit={unit.value}
                units={units}
                min={field.min ?? 0}
                hint={field.metadata?.unitHint as string | undefined}
                onSave={(next, unit) => {
                  updateBlockProps(getPuck(), block.id, { [name]: next, [unitProp]: unit });
                  close();
                }}
              />
            ) : (
              <NumberInput
                value={number}
                min={field.min ?? 0}
                max={field.max ?? 2000}
                unit="px"
                hint={field.label?.match(/\((.*)\)$/)?.[1]}
                onSave={(next) => {
                  onChange(next);
                  close();
                }}
              />
            )
          }
        />
      );
    }
    case "select":
    case "radio": {
      const current = field.options.find((option) => option.value === value);
      return (
        <MenuItem
          id={name}
          label={label}
          icon={selectIcon(name, value)}
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
          id={name}
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
            id={name}
            label={label}
            icon={<Icon><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" /></Icon>}
            hint={<Swatch color={text} />}
            // Like Canva: an "A" over the color for text, a dot for fills.
            face={isTextColor(name, field) ? <TextColorFace color={text} /> : <FillColorFace color={text} />}
            submenu={<ColorPicker value={text} onChange={onChange} optional={optionalColor} />}
          />
        );
      }
      if (kind === "image") {
        // The block's image editing for this image (an imageEdit field with
        // metadata.imageProp = this prop) is offered in the same dropdown.
        const editEntry =
          block && imageEditor && text
            ? (Object.entries(getPuck().config.components[getPuck().getItemById(block.id)?.type ?? ""]?.fields ?? {}) as [
                string,
                Field,
              ][]).find(([, f]) => f.metadata?.kind === "imageEdit" && f.metadata?.imageProp === name)
            : undefined;
        const openEditor =
          editEntry && block && imageEditor
            ? () => {
                imageEditor.open({
                  blockId: block.id,
                  imageProp: name,
                  editProp: editEntry[0],
                  background: Boolean(editEntry[1].metadata?.background),
                });
                close();
              }
            : undefined;
        return (
          <MenuItem
            id={name}
            label={label}
            icon={<Icon><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></Icon>}
            hint={text ? "Vald" : "Ingen"}
            submenu={
              <ImageActions
                hasImage={!!text}
                onEdit={openEditor}
                onChange={(url) => {
                  onChange(url);
                  close();
                }}
              />
            }
          />
        );
      }
      // Image editing is in its image's dropdown (see kind "image").
      if (kind === "imageEdit") return null;
      if (kind === "typography") {
        const typography = value as Partial<Typography> | undefined;
        const basePx = resolveBasePx(field.metadata as TypographyMetadata, block?.props);
        if (inToolbar) {
          return <TextSizeStepper name={name} label={label} value={typography} basePx={basePx} onChange={onChange} />;
        }
        return (
          <MenuItem
            id={name}
            label={label}
            icon={<Icon><path d="M4 7V5h10v2M9 5v14M7 19h4M14 13v-1h6v1M17 12v7M15.5 19h3" /></Icon>}
            hint={typographySummary(typography, basePx)}
            submenu={<TypographyControls value={typography} onChange={onChange} basePx={basePx} />}
          />
        );
      }
      if (kind === "box") {
        const box = value as Partial<Box> | undefined;
        return (
          <MenuItem
            id={name}
            label={label}
            icon={<Icon><rect x="4" y="5" width="16" height="14" rx="3" /></Icon>}
            hint={boxSummary(box)}
            submenu={<BoxControls value={box} onChange={onChange} />}
          />
        );
      }
      if (kind === "colorList") {
        const colors = Array.isArray(value) ? (value as string[]) : [];
        const columns = typeof block?.props.count === "number" ? block.props.count : 2;
        return (
          <MenuItem
            id={name}
            label={label}
            icon={<Icon><path d="M4 5v14M12 5v14M20 5v14" /></Icon>}
            scrollable
            submenu={Array.from({ length: columns }, (_, index) => (
              <div key={index} className="mb-1">
                <MenuHeader>{`Kolumn ${index + 1}`}</MenuHeader>
                <ColorPicker
                  value={colors[index] ?? ""}
                  optional
                  onChange={(color) => onChange(setColumnColor(colors, index, color))}
                />
              </div>
            ))}
          />
        );
      }
      if (kind === "columnWidths") {
        const widths = Array.isArray(value) ? (value as number[]) : [];
        return (
          <MenuItem
            id={name}
            label="Gör kolumnerna lika breda"
            disabled={widths.length === 0}
            icon={<Icon><path d="M4 5v14M12 5v14M20 5v14" /></Icon>}
            hint={columnWidthsSummary(widths) ?? undefined}
            onSelect={() => {
              onChange([]);
              close();
            }}
          />
        );
      }
      if (kind === "textStyle") {
        const style = (value ?? {}) as TextStyle;
        // What the text looks like now: a choice, else the element's own look
        // (Rubrik's older "Understruken" setting counts too).
        const active = {
          bold: style.bold ?? Boolean(field.metadata?.defaultBold),
          italic: style.italic ?? false,
          underline: style.underline ?? block?.props.decoration === "underline",
        };
        const toggle = (key: keyof TextStyle) => onChange({ ...style, [key]: !active[key] });
        if (inToolbar) return <TextStyleButtons active={active} onToggle={toggle} />;
        const on = TEXT_STYLE_BUTTONS.filter((b) => active[b.key]).map((b) => b.label.toLowerCase());
        return (
          <MenuItem
            id={name}
            label={label}
            icon={<Icon><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" /></Icon>}
            hint={on.length > 0 ? on.join(", ") : "Normal"}
            submenu={TEXT_STYLE_BUTTONS.map((b) => (
              <OptionRow key={b.key} label={b.label} selected={active[b.key]} onSelect={() => toggle(b.key)} />
            ))}
          />
        );
      }
      if (kind === "font") {
        // "" follows the block or page: show the font that is actually used.
        const inherited = inheritedFont(getPuck(), block?.id, name);
        const shown = text || inherited;
        const shownLabel = shown ? fontLabel(shown) : DEFAULT_FONT_NAME;
        return (
          <MenuItem
            id={name}
            label={label}
            icon={<Icon><path d="M4 20 10 4h1l6 16M6.5 14h8" /></Icon>}
            hint={<span style={{ fontFamily: fontFamily(shown) }}>{shownLabel}</span>}
            face={
              <span className="flex h-7 w-36 items-center justify-between gap-1 rounded-md border border-zinc-300 px-2 font-normal">
                <span className="truncate" style={{ fontFamily: fontFamily(shown) }}>
                  {shownLabel}
                </span>
                <Icon className="shrink-0 text-zinc-500"><path d="m6 9 6 6 6-6" /></Icon>
              </span>
            }
            scrollable
            submenu={
              <FontPicker
                defaultLabel={`${inherited ? fontLabel(inherited) : DEFAULT_FONT_NAME} (standard)`}
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

/** Toolbar face of a text color: an "A" over a bar in the color. */
function TextColorFace({ color }: { color: string }) {
  return (
    <span className="flex flex-col items-center leading-none">
      <span className="text-base font-semibold">A</span>
      <span
        className="mt-0.5 h-1 w-5 rounded-full ring-1 ring-black/10"
        style={{ background: color || "linear-gradient(90deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7)" }}
      />
    </span>
  );
}

/** Toolbar face of a fill color (background, button): a round swatch. */
function FillColorFace({ color }: { color: string }) {
  return (
    <span
      className="block size-6 rounded-full ring-1 ring-black/15"
      style={{
        background: color || "linear-gradient(135deg, #fff 45%, #ef4444 45%, #ef4444 55%, #fff 55%)",
      }}
    />
  );
}

/**
 * Text size like in Canva: "− 48 +" in the toolbar, one pixel per step
 * (or 5 % when the block's normal size isn't known). The number opens the
 * full controls (letter spacing, line height).
 */
function TextSizeStepper({
  name,
  label,
  value,
  basePx,
  onChange,
}: {
  name: string;
  label: string;
  value: Partial<Typography> | undefined;
  basePx?: number;
  onChange: (value: unknown) => void;
}) {
  const typography = withTypographyDefaults(value);
  const { min, max } = TYPOGRAPHY_RANGES.size;
  const toPx = (size: number) => (basePx ? Math.round((basePx * size) / 100) : size);
  const shown = toPx(typography.size);

  function step(direction: 1 | -1) {
    let size = basePx ? Math.round(((shown + direction) / basePx) * 100) : typography.size + 5 * direction;
    // Rounding can land on the same pixel size; go one percent further.
    while (basePx && toPx(size) === shown && size > min && size < max) size += direction;
    onChange({ ...typography, size: Math.min(max, Math.max(min, size)) });
  }

  const stepButton = (direction: 1 | -1) => (
    <button
      type="button"
      title={direction > 0 ? "Större text" : "Mindre text"}
      aria-label={direction > 0 ? "Större text" : "Mindre text"}
      disabled={direction > 0 ? typography.size >= max : typography.size <= min}
      onClick={() => step(direction)}
      className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 disabled:opacity-30"
    >
      <Icon><path d={direction > 0 ? "M12 5v14M5 12h14" : "M5 12h14"} /></Icon>
    </button>
  );

  return (
    <span className="mx-0.5 flex items-center rounded-md border border-zinc-300">
      {stepButton(-1)}
      <MenuItem
        id={name}
        label={label}
        hint={basePx ? `${shown} px` : `${shown} %`}
        face={<span className="min-w-7 text-center tabular-nums">{basePx ? shown : `${shown}%`}</span>}
        submenu={<TypographyControls value={typography} onChange={onChange} basePx={basePx} />}
      />
      {stepButton(1)}
    </span>
  );
}

/** An icon for a number field: arrows for widths and heights, else "#". */
function numberIcon(name: string): ReactNode {
  if (/width/i.test(name)) return <Icon><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" /></Icon>;
  if (/height/i.test(name)) return <Icon><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" /></Icon>;
  return <Icon><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" /></Icon>;
}

/**
 * An icon for a choice field, by its prop name, so toolbar buttons (which
 * have no text) can be told apart. Alignment shows the current value.
 */
function selectIcon(name: string, value: unknown): ReactNode {
  if (name === "align" || name.endsWith("Align")) {
    if (value === "center") return <Icon><path d="M4 6h16M7 12h10M5 18h14" /></Icon>;
    if (value === "right") return <Icon><path d="M4 6h16M10 12h10M6 18h14" /></Icon>;
    return <Icon><path d="M4 6h16M4 12h10M4 18h14" /></Icon>;
  }
  if (name === "effect" || name.endsWith("Effect")) {
    // Sparkles, for Effekter.
    return <Icon><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 3v4M17 5h4M5 17v4M3 19h4" /></Icon>;
  }
  switch (name) {
    case "imageFit":
      return <Icon><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 4v16M16 4v16" /></Icon>;
    case "mobileFit":
      return <Icon><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></Icon>;
    case "heroHeightUnit":
      return <Icon><path d="M4 16 16 4l4 4L8 20zM7.5 12.5l2 2M10.5 9.5l2 2M13.5 6.5l2 2" /></Icon>;
    case "overlay":
      return <Icon><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 16 16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="currentColor" /></Icon>;
    case "background":
      return <Icon><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" /></Icon>;
    case "level":
      return <Icon><path d="M5 5v14M15 5v14M5 12h10M19 19v-6l-2 1.5" /></Icon>;
    case "decoration":
      return <Icon><path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14" /></Icon>;
    case "width":
      return <Icon><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" /></Icon>;
    case "variant":
      return <Icon><rect x="3" y="7" width="18" height="10" rx="5" /></Icon>;
    case "count":
      return <Icon><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></Icon>;
    case "size":
      return <Icon><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" /></Icon>;
    default:
      return <Icon><path d="M4 7h16M4 12h10M4 17h6" /></Icon>;
  }
}

/** The site's own font (app/layout.tsx), used where no font is picked. */
const DEFAULT_FONT_NAME = "Geist";

/**
 * The font text gets when it has none of its own: for a part's font (e.g.
 * the Hero's titleFont) the block's font, then the page font that older
 * pages may still have set (headings for Rubrik), else "" (Geist).
 */
function inheritedFont(puck: PuckApi, blockId: string | undefined, fieldName: string) {
  const root = puck.appState.data.root.props as { headingFont?: string; bodyFont?: string } | undefined;
  const item = blockId ? puck.getItemById(blockId) : undefined;
  const blockFont = fieldName !== "font" && typeof item?.props.font === "string" ? item.props.font : "";
  const isHeading = item?.type === "Heading" || fieldName === "titleFont";
  return blockFont || (isHeading && root?.headingFont) || root?.bodyFont || "";
}

const TEXT_STYLE_BUTTONS = [
  { key: "bold", label: "Fetstil", icon: <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" /> },
  { key: "italic", label: "Kursiv", icon: <path d="M15 4h-5M14 20H9M14 4l-4 16" /> },
  { key: "underline", label: "Understruken", icon: <path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14" /> },
] as const;

/** B / I / U as separate toggle buttons in the toolbar, like Canva. */
function TextStyleButtons({
  active,
  onToggle,
}: {
  active: Record<keyof TextStyle, boolean>;
  onToggle: (key: keyof TextStyle) => void;
}) {
  return TEXT_STYLE_BUTTONS.map(({ key, label, icon }) => (
    <button
      key={key}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active[key]}
      onClick={() => onToggle(key)}
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
        active[key] ? "bg-violet-100 text-violet-900" : "text-zinc-800 hover:bg-zinc-100"
      }`}
    >
      <Icon className="size-4.5">{icon}</Icon>
    </button>
  ));
}

/** Fonts shown in their own typeface, plus uploading a new one. */
function FontPicker({
  value,
  defaultLabel,
  onChange,
}: {
  value: string;
  /** Name for "" (no font of its own), e.g. "Geist (standard)". */
  defaultLabel: string;
  onChange: (value: string) => void;
}) {
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
      label={font ? fontLabel(font) : defaultLabel}
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
