"use client";

import { AutoField, createUsePuck, type Field, FieldLabel, useGetPuck } from "@puckeditor/core";
import { type ReactNode, useEffect, useState } from "react";
import { updateBlockProps } from "@/components/page-blocks/update-block";
import type { PageConfig } from "@/lib/page/config";
import { PART_LABELS, partAt, setActivePart, useActivePart } from "./active-part";
import { layerLabel } from "./layers-panel";

const usePuck = createUsePuck<PageConfig>();

// Puck `fields` override: after a click on a part of a block (e.g. the
// Hero's title), the side panel shows only that part's settings
// (fields with metadata.part), with the whole block's settings behind a
// button. Otherwise Puck's normal fields. Module-level so Puck doesn't
// remount it.
export function PartFields({ children }: { children: ReactNode; isLoading: boolean }) {
  const selectedId = usePuck((s) => s.selectedItem?.props.id);
  const active = useActivePart();
  if (!selectedId || active?.id !== selectedId) return <>{children}</>;
  // Keyed so "show all" starts closed for every part.
  return (
    <PartPanel key={`${active.id}:${active.part}`} id={active.id} part={active.part}>
      {children}
    </PartPanel>
  );
}

function PartPanel({ id, part, children }: { id: string; part: string; children: ReactNode }) {
  const getPuck = useGetPuck();
  const item = usePuck((s) => s.selectedItem);
  const [showAll, setShowAll] = useState(false);
  if (!item) return <>{children}</>;

  const puck = getPuck();
  const component = puck.config.components[item.type];
  const fields = (Object.entries(component?.fields ?? {}) as [string, Field][]).filter(
    ([, field]) => field.metadata?.part === part,
  );
  if (fields.length === 0) return <>{children}</>;
  const blockName = layerLabel(puck, item);

  return (
    <div>
      <p className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-500">
        {blockName} › <span className="font-semibold text-zinc-900">{PART_LABELS[part] ?? part}</span>
      </p>
      {fields.map(([name, field]) => (
        <div key={name} className="border-b border-zinc-200 px-4 py-4">
          <PartField
            field={field}
            value={(item.props as Record<string, unknown>)[name]}
            onChange={(value) => updateBlockProps(getPuck(), id, { [name]: value })}
          />
        </div>
      ))}
      <div className="px-4 py-4">
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          {showAll ? "Dölj" : "Visa"} alla inställningar för {blockName}
        </button>
      </div>
      {showAll && children}
    </div>
  );
}

/** Notes which part of a block each click in the preview lands on. */
export function PartTracker({ doc }: { doc?: Document }) {
  useEffect(() => {
    if (!doc) return;
    const onClick = (event: Event) => {
      const { id, part } = partAt(event.target as Element | null);
      setActivePart(id && part ? { id, part } : null);
    };
    // Capture phase: inline text editing stops clicks from bubbling.
    doc.addEventListener("click", onClick, true);
    return () => doc.removeEventListener("click", onClick, true);
  }, [doc]);
  return null;
}

/** One field as Puck draws it; custom fields draw their own label. */
function PartField({ field, value, onChange }: { field: Field; value: unknown; onChange: (value: unknown) => void }) {
  if (field.type === "custom") return <AutoField field={field} value={value} onChange={onChange} />;
  const { label, ...rest } = field;
  return (
    <FieldLabel label={label ?? ""} el="div">
      <AutoField field={rest as Field} value={value} onChange={onChange} />
    </FieldLabel>
  );
}
