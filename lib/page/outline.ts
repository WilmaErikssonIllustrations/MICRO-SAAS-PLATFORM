import { pageConfig } from "@/lib/page/config";

// A page's blocks as a flat list, for picking a block on another page in
// the editor's link picker (the page being edited uses Puck's own data).

export type BlockOutline = { id: string; label: string; depth: number };

type Item = { type: string; props: Record<string, unknown> };

const isItem = (value: unknown): value is Item =>
  !!value &&
  typeof value === "object" &&
  typeof (value as Item).type === "string" &&
  !!(value as Item).props &&
  typeof (value as Item).props === "object";

/** Every block in order, nested ones (in slots) after their container, like the layers panel. */
export function pageOutline(data: unknown): BlockOutline[] {
  const result: BlockOutline[] = [];
  const walk = (items: unknown, depth: number) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!isItem(item) || typeof item.props.id !== "string") continue;
      const name = typeof item.props.layerName === "string" ? item.props.layerName.trim() : "";
      const type = pageConfig.components[item.type as keyof typeof pageConfig.components];
      result.push({ id: item.props.id, label: name || (type?.label ?? item.type), depth });
      for (const value of Object.values(item.props)) {
        if (Array.isArray(value) && value.some(isItem)) walk(value, depth + 1);
      }
    }
  };
  walk(data && typeof data === "object" ? (data as { content?: unknown }).content : null, 0);
  return result;
}
