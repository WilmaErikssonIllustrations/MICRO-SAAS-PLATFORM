"use client";

import { createUsePuck, useGetPuck } from "@puckeditor/core";
import { type PointerEvent as ReactPointerEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { columnFractions, type ColumnsRatio } from "@/components/page-blocks/blocks";
import { resolveBasePx, type TypographyMetadata } from "@/components/page-blocks/typography-field";
import { updateBlockProps } from "@/components/page-blocks/update-block";
import { withBoxDefaults } from "@/lib/page/box";
import type { PageConfig } from "@/lib/page/config";
import { TYPOGRAPHY_RANGES, withTypographyDefaults } from "@/lib/page/typography";

const usePuck = createUsePuck<PageConfig>();

// Canva-style resize handles on the selected block, inside the preview
// iframe. What a drag changes depends on the block:
//   width   - Bild: the image width in pixels (left/right edges)
//   height  - Mellanrum: the height in pixels (bottom edge)
//   text    - Hero, Rubrik, Text, Knapp: the text size (corner)
//   columns - Kolumner: the widths of two neighboring columns (dividers)
//   box     - Sektion: only its background box (below)
// Blocks mark the element to put handles on with `data-resize-box`.
// Blocks with a background box (BlockBackground, `data-box`) also get
// filled handles for the box's width and height, and an element marked
// `data-resize-height="<prop>"` (Hero) gets one for its height in pixels.

type Mode = "width" | "height" | "text" | "columns" | "box";

const MODES: Partial<Record<string, Mode>> = {
  Image: "width",
  Spacer: "height",
  Hero: "text",
  Heading: "text",
  Text: "text",
  Button: "text",
  Columns: "columns",
  Section: "box",
};

/** A rectangle in document coordinates, and the width available to it. */
type Rect = { left: number; top: number; width: number; height: number; room: number };

/** The content's handle box, its background box (if any) and column dividers (x positions). */
type Box = Rect & { id: string; frame: Rect | null; section: (Rect & { prop: string }) | null; dividers: number[] };

type Handle =
  | { kind: "left" | "right" | "bottom" | "corner" | "boxHeight" }
  | { kind: "boxWidth"; side: "left" | "right" }
  | { kind: "sectionHeight"; prop: string }
  | { kind: "divider"; index: number };

const MIN_COLUMN_PERCENT = 10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function ResizeHandles({ doc }: { doc?: Document }) {
  const getPuck = useGetPuck();
  const selected = usePuck((s) => s.selectedItem);
  const id = selected?.props.id;
  const mode = selected ? MODES[selected.type] : undefined;
  const [box, setBox] = useState<Box | null>(null);
  const [readout, setReadout] = useState<string | null>(null);

  // Follow the block on every frame: it moves with scrolling, edits and
  // layout changes, and this is cheap for one element.
  useEffect(() => {
    const win = doc?.defaultView;
    if (!doc || !win || !id || !mode) return;
    let frame = 0;
    const tick = () => {
      const next = measure(doc, id, mode);
      setBox((prev) => (sameBox(prev, next) ? prev : next));
      frame = win.requestAnimationFrame(tick);
    };
    frame = win.requestAnimationFrame(tick);
    return () => win.cancelAnimationFrame(frame);
  }, [doc, id, mode]);

  if (!doc) return null;
  const visible = box && mode && box.id === id;

  function startDrag(event: ReactPointerEvent<HTMLElement>, handle: Handle) {
    const win = doc?.defaultView;
    const item = id ? getPuck().getItemById(id) : undefined;
    if (!win || !box || !id || !item) return;
    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const props = item.props as Record<string, unknown>;
    const field = getPuck().config.components[item.type]?.fields?.typography;
    const basePx = resolveBasePx(field?.metadata as TypographyMetadata | undefined, props);
    const start = box;
    const startX = event.clientX;
    const startY = event.clientY;
    let patch: Record<string, unknown> | null = null;
    let frame = 0;

    // In-between steps skip the undo history; the last one is recorded.
    const onMove = (move: PointerEvent) => {
      const result = dragResult(handle, move.clientX - startX, move.clientY - startY, start, props, basePx);
      patch = result.patch;
      setReadout(result.readout);
      frame ||= win.requestAnimationFrame(() => {
        frame = 0;
        if (patch) updateBlockProps(getPuck(), id, patch, false);
      });
    };
    const onUp = () => {
      win.cancelAnimationFrame(frame);
      if (patch) updateBlockProps(getPuck(), id, patch, true);
      setReadout(null);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
    };
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);
  }

  const handleProps = (handle: Handle, title: string) => ({
    title,
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => startDrag(event, handle),
    onClick: (event: React.MouseEvent) => event.stopPropagation(),
  });

  return createPortal(
    // Outside the blocks, so Puck's block dragging doesn't see these
    // pointer events; startDrag stops them from going further.
    <div style={{ position: "absolute", left: 0, top: 0, zIndex: 2147483000 }}>
      {visible && (
        <>
          {mode !== "columns" && mode !== "box" && (
            <div
              aria-hidden
              className="pointer-events-none absolute border border-dashed border-violet-500/70"
              style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            />
          )}
          {mode === "width" &&
            (["left", "right"] as const).map((side) => (
              <Grip
                key={side}
                x={side === "left" ? box.left : box.left + box.width}
                y={box.top + box.height / 2}
                shape="vertical"
                {...handleProps({ kind: side }, "Dra för att ändra bredden")}
              />
            ))}
          {mode === "height" && (
            <Grip
              x={box.left + box.width / 2}
              y={box.top + box.height}
              shape="horizontal"
              {...handleProps({ kind: "bottom" }, "Dra för att ändra höjden")}
            />
          )}
          {mode === "text" && (
            <Grip
              x={box.left + box.width}
              y={box.top + box.height}
              shape="corner"
              {...handleProps({ kind: "corner" }, "Dra för att ändra textstorleken")}
            />
          )}
          {mode === "columns" &&
            box.dividers.map((x, index) => (
              <Grip
                key={index}
                x={x}
                y={box.top + box.height / 2}
                shape="divider"
                {...handleProps({ kind: "divider", index }, "Dra för att ändra kolumnernas bredd")}
              />
            ))}
          {box.frame && (
            <BoxGrips
              frame={box.frame}
              position={withBoxDefaults((selected?.props as { bgBox?: object } | undefined)?.bgBox).position}
              // Keep clear of the content's own handles where they could overlap.
              avoidMiddle={mode === "width"}
              avoidCenter={mode === "height"}
              handleProps={handleProps}
            />
          )}
          {box.section && (
            <Grip
              x={box.section.left + box.section.width / 2}
              y={box.section.top + box.section.height}
              shape="horizontal"
              filled
              {...handleProps({ kind: "sectionHeight", prop: box.section.prop }, "Dra för att ändra höjden")}
            />
          )}
          {readout && (
            <span
              className="pointer-events-none absolute -translate-x-1/2 rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold whitespace-nowrap text-white shadow"
              style={{ left: box.left + box.width / 2, top: Math.max(0, box.top - 30) }}
            >
              {readout}
            </span>
          )}
        </>
      )}
    </div>,
    doc.body,
  );
}

function BoxGrips({
  frame,
  position,
  avoidMiddle,
  avoidCenter,
  handleProps,
}: {
  frame: Rect;
  position: "left" | "center" | "right";
  avoidMiddle: boolean;
  avoidCenter: boolean;
  handleProps: (handle: Handle, title: string) => Omit<GripProps, "x" | "y" | "shape" | "filled">;
}) {
  // A box on the right grows to the left; otherwise to the right.
  const side = position === "right" ? "left" : "right";
  return (
    <>
      <Grip
        x={side === "right" ? frame.left + frame.width : frame.left}
        y={frame.top + frame.height * (avoidMiddle ? 0.25 : 0.5)}
        shape="vertical"
        filled
        {...handleProps({ kind: "boxWidth", side }, "Dra för att ändra rutans bredd")}
      />
      <Grip
        x={frame.left + frame.width * (avoidCenter ? 0.25 : 0.5)}
        y={frame.top + frame.height}
        shape="horizontal"
        filled
        {...handleProps({ kind: "boxHeight" }, "Dra för att ändra rutans höjd")}
      />
    </>
  );
}

const gripShapes = {
  vertical: "h-9 w-2.5 cursor-ew-resize rounded-full",
  horizontal: "h-2.5 w-9 cursor-ns-resize rounded-full",
  corner: "size-3.5 cursor-nwse-resize rounded-sm",
  divider: "h-12 w-2.5 cursor-col-resize rounded-full",
} as const;

type GripProps = {
  x: number;
  y: number;
  shape: keyof typeof gripShapes;
  /** Filled grips resize the background box, white ones the content. */
  filled?: boolean;
  title: string;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onClick: (event: React.MouseEvent) => void;
};

function Grip({ x, y, shape, filled, ...rest }: GripProps) {
  return (
    <span
      aria-label={rest.title}
      {...rest}
      style={{ left: x, top: y, touchAction: "none" }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 border-2 border-violet-600 shadow-md transition-transform hover:scale-125 ${
        filled ? "bg-violet-600 ring-2 ring-white" : "bg-white"
      } ${gripShapes[shape]}`}
    />
  );
}

function measure(doc: Document, id: string, mode: Mode): Box | null {
  const win = doc.defaultView;
  const wrapper = doc.querySelector(`[data-puck-component="${CSS.escape(id)}"]`);
  const target = wrapper?.querySelector<HTMLElement>("[data-resize-box]");
  if (!win || !target) return null;

  const rect = target.getBoundingClientRect();
  const boxElement = wrapper?.querySelector<HTMLElement>("[data-box]");
  const boxRect = boxElement?.getBoundingClientRect();
  const frame = boxElement && boxRect
    ? {
        left: boxRect.left + win.scrollX,
        top: boxRect.top + win.scrollY,
        width: boxRect.width,
        height: boxRect.height,
        room: contentWidth(boxElement.parentElement) ?? boxRect.width,
      }
    : null;
  const heightElement = wrapper?.querySelector<HTMLElement>("[data-resize-height]");
  const heightRect = heightElement?.getBoundingClientRect();
  const section = heightElement && heightRect
    ? {
        left: heightRect.left + win.scrollX,
        top: heightRect.top + win.scrollY,
        width: heightRect.width,
        height: heightRect.height,
        room: heightRect.width,
        prop: heightElement.dataset.resizeHeight ?? "",
      }
    : null;
  const dividers: number[] = [];
  if (mode === "columns") {
    const columns = Array.from(target.children).map((child) => child.getBoundingClientRect());
    // Side by side only; on narrow screens the columns are stacked.
    if (columns.every((column, i) => i === 0 || column.left >= columns[i - 1].right - 1)) {
      for (let i = 0; i < columns.length - 1; i++) {
        dividers.push((columns[i].right + columns[i + 1].left) / 2 + win.scrollX);
      }
    }
  }
  return {
    id,
    left: rect.left + win.scrollX,
    top: rect.top + win.scrollY,
    width: rect.width,
    height: rect.height,
    room: contentWidth(target.parentElement) ?? rect.width,
    frame,
    section,
    dividers,
  };
}

/** Width available inside an element (without its padding). */
function contentWidth(element: HTMLElement | null) {
  if (!element) return null;
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (!style) return null;
  return element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

function sameBox(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b;
  return (
    a.id === b.id &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5 &&
    a.room === b.room &&
    JSON.stringify(a.frame) === JSON.stringify(b.frame) &&
    JSON.stringify(a.section) === JSON.stringify(b.section) &&
    a.dividers.join() === b.dividers.join()
  );
}

/** The props a drag by (dx, dy) leads to, and a label to show meanwhile. */
function dragResult(
  handle: Handle,
  dx: number,
  dy: number,
  start: Box,
  props: Record<string, unknown>,
  basePx: number | undefined,
): { patch: Record<string, unknown>; readout: string } {
  switch (handle.kind) {
    case "left":
    case "right": {
      // Images are centered, so both edges move: twice the pointer distance.
      const direction = handle.kind === "right" ? 1 : -1;
      const width = Math.round(clamp(start.width + 2 * direction * dx, 40, start.room));
      const fills = width >= start.room - 2;
      return { patch: { widthPx: fills ? 0 : width }, readout: fills ? "Fyller bredden" : `${width} px` };
    }
    case "boxWidth": {
      if (!start.frame) return { patch: {}, readout: "" };
      const box = withBoxDefaults(props.bgBox as object | undefined);
      // A centered box grows on both sides, so twice the pointer distance.
      const factor = box.position === "center" ? 2 : 1;
      const direction = handle.side === "right" ? 1 : -1;
      const room = start.frame.room;
      const width = Math.round(clamp(start.frame.width + factor * direction * dx, 60, room));
      const fills = width >= room - 2;
      return { patch: { bgBox: { ...box, width: fills ? 0 : width } }, readout: fills ? "Hela bredden" : `${width} px` };
    }
    case "sectionHeight": {
      if (!start.section) return { patch: {}, readout: "" };
      const height = Math.round(clamp(start.section.height + dy, 120, 2000));
      return { patch: { [handle.prop]: height }, readout: `${height} px` };
    }
    case "boxHeight": {
      if (!start.frame) return { patch: {}, readout: "" };
      const box = withBoxDefaults(props.bgBox as object | undefined);
      const height = Math.round(clamp(start.frame.height + dy, 0, 1200));
      return { patch: { bgBox: { ...box, height } }, readout: `${height} px` };
    }
    case "bottom": {
      const height = Math.round(clamp(start.height + dy, 4, 800));
      return { patch: { height }, readout: `${height} px` };
    }
    case "corner": {
      // Scale along the diagonal, like resizing a text box in Canva.
      const typography = withTypographyDefaults(props.typography as object | undefined);
      const factor = 1 + (dx / start.width + dy / start.height) / 2;
      const { min, max } = TYPOGRAPHY_RANGES.size;
      const size = Math.round(clamp(typography.size * factor, min, max));
      return {
        patch: { typography: { ...typography, size } },
        readout: basePx ? `${Math.round((basePx * size) / 100)} px` : `${size} %`,
      };
    }
    case "divider": {
      const fractions = columnFractions(
        props.count as number,
        props.ratio as ColumnsRatio | undefined,
        props.widths as number[] | undefined,
      );
      const total = fractions.reduce((sum, f) => sum + f, 0);
      const percents = fractions.map((f) => (f / total) * 100);
      const i = handle.index;
      const pair = percents[i] + percents[i + 1];
      const left = clamp(percents[i] + (dx / start.width) * 100, MIN_COLUMN_PERCENT, pair - MIN_COLUMN_PERCENT);
      percents[i] = left;
      percents[i + 1] = pair - left;
      const widths = percents.map((p) => Math.round(p * 10) / 10);
      return { patch: { widths }, readout: widths.map((w) => `${Math.round(w)} %`).join(" / ") };
    }
  }
}
