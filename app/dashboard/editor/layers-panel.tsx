"use client";

import { ActionBar, type ComponentData, createUsePuck, type Field, useGetPuck } from "@puckeditor/core";
import { type DragEvent, type ReactNode, useState } from "react";
import { type PuckApi, ROOT_ZONE, updateBlockProps } from "@/components/page-blocks/update-block";
import type { PageConfig } from "@/lib/page/config";
import { setActivePart } from "./active-part";
import { BlockIcon } from "./block-tile";

const usePuck = createUsePuck<PageConfig>();

// The "Lager" panel, replacing Puck's outline so blocks can be renamed:
// a block's `layerName` prop, or its type's name when empty. Also selects
// on click and moves blocks by drag and drop, like Puck's outline did.

/** A block's name in the editor: its own name or the block type's. */
export function layerLabel(puck: PuckApi, item: ComponentData) {
  const name = typeof item.props.layerName === "string" ? item.props.layerName.trim() : "";
  return name || (puck.config.components[item.type]?.label ?? item.type);
}

export function renameLayer(puck: PuckApi, id: string, name: string) {
  updateBlockProps(puck, id, { layerName: name.trim().slice(0, 60) });
}

/** Every block on the page in order, nested ones after their container, with their depth. */
export function allBlocks(puck: PuckApi) {
  const result: { id: string; label: string; depth: number }[] = [];
  const walk = (items: ComponentData[], depth: number) => {
    for (const item of items) {
      result.push({ id: String(item.props.id), label: layerLabel(puck, item), depth });
      for (const slot of slotsOf(puck, item)) walk(slot.items, depth + 1);
    }
  };
  walk(puck.appState.data.content as ComponentData[], 0);
  return result;
}

type DragSource = { id: string; zone: string; index: number };
type DropTarget = { zone: string; index: number };

export function LayersPanel() {
  const content = usePuck((s) => s.appState.data.content);
  const [dragging, setDragging] = useState<DragSource | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const getPuck = useGetPuck();

  function drop(target: DropTarget) {
    const source = dragging;
    setDragging(null);
    setDropTarget(null);
    if (!source || containsZone(getPuck(), source.id, target.zone)) return;

    const { dispatch } = getPuck();
    let index = target.index;
    if (source.zone === target.zone) {
      // Removing the block first shifts the ones after it up by one.
      if (source.index < index) index -= 1;
      if (index === source.index) return;
      dispatch({ type: "reorder", sourceIndex: source.index, destinationIndex: index, destinationZone: target.zone });
    } else {
      dispatch({
        type: "move",
        sourceIndex: source.index,
        sourceZone: source.zone,
        destinationIndex: index,
        destinationZone: target.zone,
      });
    }
    dispatch({ type: "setUi", ui: { itemSelector: { index, zone: target.zone } } });
  }

  const dnd = { dragging, dropTarget, setDragging, setDropTarget, drop };

  return (
    <div className="flex h-full flex-col text-sm text-zinc-800">
      <h2 className="border-b border-zinc-200 px-4 py-3.5 text-base font-semibold">Lager</h2>
      <div className="flex-1 overflow-y-auto p-2">
        {content.length === 0 ? (
          <p className="px-2 py-3 text-zinc-500">Inga block än. Lägg till med plusknappen.</p>
        ) : (
          <LayerList items={content} zone={ROOT_ZONE} depth={0} dnd={dnd} />
        )}
        <p className="px-2 pt-3 text-xs text-zinc-400">Dubbelklicka på ett lager för att byta namn. Dra för att flytta.</p>
      </div>
    </div>
  );
}

type Dnd = {
  dragging: DragSource | null;
  dropTarget: DropTarget | null;
  setDragging: (source: DragSource | null) => void;
  setDropTarget: (target: DropTarget | null) => void;
  drop: (target: DropTarget) => void;
};

function LayerList({ items, zone, depth, dnd }: { items: ComponentData[]; zone: string; depth: number; dnd: Dnd }) {
  return (
    <ul>
      {items.map((item, index) => (
        <LayerRow key={item.props.id} item={item} zone={zone} index={index} depth={depth} dnd={dnd} />
      ))}
      {/* A slot to drop into after the last block (or into an empty slot). */}
      <DropLine zone={zone} index={items.length} depth={depth} dnd={dnd} empty={items.length === 0} />
    </ul>
  );
}

function LayerRow({
  item,
  zone,
  index,
  depth,
  dnd,
}: {
  item: ComponentData;
  zone: string;
  index: number;
  depth: number;
  dnd: Dnd;
}) {
  const getPuck = useGetPuck();
  const id = item.props.id;
  const selected = usePuck((s) => s.selectedItem?.props.id === id);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const puck = getPuck();
  const label = layerLabel(puck, item);
  const slots = slotsOf(puck, item);
  const isTarget = dnd.dropTarget?.zone === zone && dnd.dropTarget.index === index;

  const select = () => {
    // A whole block, not a part of it (see part-fields.tsx).
    setActivePart(null);
    getPuck().dispatch({ type: "setUi", ui: { itemSelector: { index, zone } } });
  };

  function onDragOver(event: DragEvent) {
    if (!dnd.dragging) return;
    event.preventDefault();
    // Upper half: before this block, lower half: after it.
    const rect = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    dnd.setDropTarget({ zone, index: index + (after ? 1 : 0) });
  }

  return (
    <li>
      {isTarget && <Indicator depth={depth} />}
      <div
        draggable={!editing}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", label);
          dnd.setDragging({ id, zone, index });
        }}
        onDragEnd={() => {
          dnd.setDragging(null);
          dnd.setDropTarget(null);
        }}
        onDragOver={onDragOver}
        onDrop={(event) => {
          event.preventDefault();
          if (dnd.dropTarget) dnd.drop(dnd.dropTarget);
        }}
        onClick={select}
        onDoubleClick={() => setEditing(true)}
        style={{ paddingLeft: 8 + depth * 16 }}
        className={`group flex h-9 cursor-pointer items-center gap-2 rounded-lg pr-1 ${
          selected ? "bg-violet-100 text-violet-900" : "hover:bg-zinc-100"
        } ${dnd.dragging?.id === id ? "opacity-40" : ""}`}
      >
        {slots.length > 0 ? (
          <button
            type="button"
            aria-label={expanded ? "Fäll ihop" : "Fäll ut"}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex size-4 shrink-0 items-center justify-center text-zinc-500"
          >
            <SmallIcon>{expanded ? <path d="m6 9 6 6 6-6" /> : <path d="m9 6 6 6-6 6" />}</SmallIcon>
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <span className={`shrink-0 ${selected ? "text-violet-700" : "text-zinc-500"}`}>
          <BlockIcon name={item.type} size={16} />
        </span>
        {editing ? (
          <NameInput
            initial={typeof item.props.layerName === "string" ? item.props.layerName : ""}
            placeholder={puck.config.components[item.type]?.label ?? item.type}
            onDone={(name) => {
              setEditing(false);
              if (name !== null) renameLayer(getPuck(), id, name);
            }}
          />
        ) : (
          <span className="flex-1 truncate">{label}</span>
        )}
        {!editing && (
          <span className="hidden shrink-0 items-center group-hover:flex">
            <RowButton
              title="Byt namn"
              onClick={() => {
                select();
                setEditing(true);
              }}
            >
              <path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" />
            </RowButton>
            <RowButton
              title="Duplicera"
              onClick={() => getPuck().dispatch({ type: "duplicate", sourceIndex: index, sourceZone: zone })}
            >
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M4 16V6a2 2 0 0 1 2-2h10" />
            </RowButton>
            <RowButton
              title="Ta bort"
              onClick={() => {
                getPuck().dispatch({ type: "setUi", ui: { itemSelector: null } });
                getPuck().dispatch({ type: "remove", index, zone });
              }}
            >
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </RowButton>
          </span>
        )}
      </div>
      {expanded &&
        slots.map((slot) => (
          <div key={slot.zone}>
            <p style={{ paddingLeft: 8 + (depth + 1) * 16 + 24 }} className="pt-1 text-xs font-medium text-zinc-400">
              {slot.label}
            </p>
            <LayerList items={slot.items} zone={slot.zone} depth={depth + 1} dnd={dnd} />
          </div>
        ))}
    </li>
  );
}

function NameInput({
  initial,
  placeholder,
  onDone,
}: {
  initial: string;
  placeholder: string;
  /** The new name, or null when cancelled. */
  onDone: (name: string | null) => void;
}) {
  const [name, setName] = useState(initial);
  return (
    <input
      autoFocus
      value={name}
      maxLength={60}
      placeholder={placeholder}
      aria-label="Lagrets namn"
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setName(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") onDone(name);
        if (event.key === "Escape") onDone(null);
      }}
      onBlur={() => onDone(name)}
      className="h-7 min-w-0 flex-1 rounded-md border border-violet-400 bg-(--editor-surface) px-1.5 text-sm text-zinc-900 outline-none"
    />
  );
}

function DropLine({ zone, index, depth, dnd, empty }: { zone: string; index: number; depth: number; dnd: Dnd; empty: boolean }) {
  const active = dnd.dropTarget?.zone === zone && dnd.dropTarget.index === index;
  if (!dnd.dragging && !empty) return null;
  return (
    <li
      onDragOver={(event) => {
        if (!dnd.dragging) return;
        event.preventDefault();
        dnd.setDropTarget({ zone, index });
      }}
      onDrop={(event) => {
        event.preventDefault();
        dnd.drop({ zone, index });
      }}
      style={{ paddingLeft: 8 + depth * 16 + 24 }}
      className={empty ? "py-1 text-xs text-zinc-400 italic" : "h-2"}
    >
      {active ? <Indicator depth={0} /> : empty && "Tom"}
    </li>
  );
}

function Indicator({ depth }: { depth: number }) {
  return <div aria-hidden style={{ marginLeft: depth * 16 }} className="my-0.5 h-0.5 rounded-full bg-violet-600" />;
}

function RowButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-(--editor-surface) hover:text-zinc-900"
    >
      <SmallIcon>{children}</SmallIcon>
    </button>
  );
}

function SmallIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

/** The block's slots (e.g. the columns of Kolumner) that are in use. */
function slotsOf(puck: PuckApi, item: ComponentData) {
  const fields = Object.entries(puck.config.components[item.type]?.fields ?? {}) as [string, Field][];
  const slotFields = fields.filter(([, field]) => field.type === "slot");
  // Kolumner shows only its first `count` slots.
  const count = typeof item.props.count === "number" ? item.props.count : slotFields.length;
  return slotFields.slice(0, count).map(([name, field]) => ({
    zone: `${item.props.id}:${name}`,
    label: field.label ?? name,
    items: Array.isArray(item.props[name]) ? (item.props[name] as ComponentData[]) : [],
  }));
}

/** True if `zone` is inside the block `id` (a block can't go into itself). */
function containsZone(puck: PuckApi, id: string, zone: string) {
  let parentId = zone.split(":")[0];
  while (parentId && parentId !== "root") {
    if (parentId === id) return true;
    parentId = puck.getSelectorForId(parentId)?.zone.split(":")[0] ?? "";
  }
  return false;
}

// Puck action bar override: the label above the selected block shows the
// block's own name. Module-level so Puck doesn't remount it.
export function NamedActionBar({
  label,
  children,
  parentAction,
}: {
  label?: string;
  children: ReactNode;
  parentAction: ReactNode;
}) {
  const getPuck = useGetPuck();
  const selected = usePuck((s) => s.selectedItem);
  const name = selected ? layerLabel(getPuck(), selected) : label;
  return (
    <ActionBar>
      <ActionBar.Group>
        {parentAction}
        {name && <ActionBar.Label label={name} />}
      </ActionBar.Group>
      <ActionBar.Group>{children}</ActionBar.Group>
    </ActionBar>
  );
}
