import type { useGetPuck } from "@puckeditor/core";

export type PuckApi = ReturnType<ReturnType<typeof useGetPuck>>;

/** Merges `patch` into the props of the block with this id. */
export function updateBlockProps(puck: PuckApi, id: string, patch: Record<string, unknown>) {
  const item = puck.getItemById(id);
  const selector = puck.getSelectorForId(id);
  if (!item || !selector) return;
  puck.dispatch({
    type: "replace",
    destinationIndex: selector.index,
    destinationZone: selector.zone,
    data: { ...item, props: { ...item.props, ...patch } },
  });
}

/** Merges `patch` into the page-level (root) props. */
export function updateRootProps(puck: PuckApi, patch: Record<string, unknown>) {
  const root = puck.appState.data.root;
  puck.dispatch({ type: "replaceRoot", root: { ...root, props: { ...root.props, ...patch } } });
}

/** Puck's id for the page's top-level list of blocks. */
export const ROOT_ZONE = "root:default-zone";
