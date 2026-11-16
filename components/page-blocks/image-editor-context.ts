"use client";

import { createContext, useContext } from "react";

/** What the image editor edits: a block, its image prop and its edit prop. */
export type ImageEditorTarget = { blockId: string; imageProp: string; editProp: string; background: boolean };

// Provided by the editor (app/dashboard/editor/image-editor.tsx), so the
// side panel and the right-click menu can open the same dialog.
export const ImageEditorContext = createContext<{ open: (target: ImageEditorTarget) => void } | null>(null);

export function useImageEditor() {
  return useContext(ImageEditorContext);
}
