"use client";

import { createUsePuck, useGetPuck } from "@puckeditor/core";
import { type ReactNode, useEffect, useState } from "react";
import { ImageEditorContext, type ImageEditorTarget } from "@/components/page-blocks/image-editor-context";
import { updateBlockProps } from "@/components/page-blocks/update-block";
import type { PageConfig } from "@/lib/page/config";
import { fontCss, GOOGLE_FONTS } from "@/lib/page/fonts";
import {
  DEFAULT_IMAGE_EDIT,
  IMAGE_ASPECTS,
  IMAGE_FILTERS,
  IMAGE_RADII,
  IMAGE_RANGES,
  type ImageEdit,
  imageEditStyle,
  imageFrameStyle,
  withImageDefaults,
} from "@/lib/page/image-edit";

const usePuck = createUsePuck<PageConfig>();

// Puck `puck` override: wraps the whole editor, inside Puck's context.
// Module-level on purpose: Puck remounts the editor when it changes identity.
export function EditorShell({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ImageEditorTarget | null>(null);
  return (
    <ImageEditorContext.Provider value={{ open: setTarget }}>
      <FontPreviews />
      {children}
      {target && <ImageEditorDialog target={target} onClose={() => setTarget(null)} />}
    </ImageEditorContext.Provider>
  );
}

/** Loads every font in the editor itself, so font menus can preview them. */
function FontPreviews() {
  const customFonts = usePuck((s) => s.appState.data.root.props?.customFonts);
  return (
    <style>{fontCss(GOOGLE_FONTS.map((font) => font.name), Array.isArray(customFonts) ? customFonts : [])}</style>
  );
}

const TABS = { adjust: "Justera", filter: "Filter", crop: "Beskär", shape: "Form" } as const;
type Tab = keyof typeof TABS;

const SLIDERS = [
  { key: "brightness", label: "Ljusstyrka" },
  { key: "contrast", label: "Kontrast" },
  { key: "saturation", label: "Mättnad" },
  { key: "blur", label: "Oskärpa" },
] as const;

function ImageEditorDialog({ target, onClose }: { target: ImageEditorTarget; onClose: () => void }) {
  const getPuck = useGetPuck();
  const item = usePuck((s) => s.getItemById(target.blockId));
  const [tab, setTab] = useState<Tab>("adjust");
  // With its own phone position, the preview can show the image as on a phone.
  const [phonePreview, setPhonePreview] = useState(false);
  const src = item?.props[target.imageProp as keyof typeof item.props];
  const edit = withImageDefaults(item?.props[target.editProp as keyof typeof item.props] as Partial<ImageEdit>);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!item || typeof src !== "string" || !src) return null;

  // Every change goes straight to the page, so the canvas and undo follow.
  const change = (patch: Partial<ImageEdit>) =>
    updateBlockProps(getPuck(), target.blockId, { [target.editProp]: { ...edit, ...patch } });

  const tabs = (Object.keys(TABS) as Tab[]).filter((key) => !(target.background && key === "shape"));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Redigera bild"
      className="fixed inset-0 z-1000 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm"
      onPointerDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:flex-row">
        <div className="flex min-h-64 flex-1 items-center justify-center bg-[repeating-conic-gradient(#f4f4f5_0_25%,#fff_0_50%)] bg-size-[20px_20px] p-6">
          <div className="flex w-full flex-col items-center gap-3">
            {edit.mobileFocus && (
              <div role="tablist" aria-label="Förhandsvisning" className="flex gap-1 rounded-lg bg-white/90 p-1 text-sm shadow-sm">
                {([false, true] as const).map((phone) => (
                  <button
                    key={String(phone)}
                    type="button"
                    role="tab"
                    aria-selected={phonePreview === phone}
                    onClick={() => setPhonePreview(phone)}
                    className={`rounded-md px-3 py-1 font-medium ${
                      phonePreview === phone ? "bg-violet-600 text-white" : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {phone ? "Mobil" : "Dator"}
                  </button>
                ))}
              </div>
            )}
            <Preview
              src={src}
              edit={edit}
              background={target.background}
              phone={edit.mobileFocus && phonePreview ? phoneFrame(item, target.background) : null}
              onFocus={(x, y) =>
                change(edit.mobileFocus && phonePreview ? { mobileFocusX: x, mobileFocusY: y } : { focusX: x, focusY: y })
              }
              showFocus={tab === "crop"}
            />
          </div>
        </div>

        <div className="flex w-full flex-col border-t border-zinc-200 md:w-80 md:border-t-0 md:border-l">
          <div className="flex items-center justify-between px-5 pt-4">
            <h2 className="text-base font-semibold">Redigera bild</h2>
            <button type="button" onClick={onClose} aria-label="Stäng" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div role="tablist" className="mx-5 mt-3 flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm">
            {tabs.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`flex-1 rounded-md px-2 py-1.5 font-medium ${tab === key ? "bg-white text-violet-700 shadow-sm" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                {TABS[key]}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm">
            {tab === "adjust" &&
              SLIDERS.map(({ key, label }) => (
                <Slider
                  key={key}
                  label={label}
                  value={edit[key]}
                  {...IMAGE_RANGES[key]}
                  unit={key === "blur" ? " px" : " %"}
                  onChange={(value) => change({ [key]: value })}
                />
              ))}

            {tab === "filter" && (
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(IMAGE_FILTERS) as ImageEdit["filter"][]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => change({ filter })}
                    className={`overflow-hidden rounded-lg text-xs ring-2 ${edit.filter === filter ? "ring-violet-600" : "ring-transparent hover:ring-zinc-300"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on S3 */}
                    <img src={src} alt="" className="aspect-square w-full object-cover" style={{ filter: IMAGE_FILTERS[filter].css || undefined }} />
                    <span className="block py-1">{IMAGE_FILTERS[filter].label}</span>
                  </button>
                ))}
              </div>
            )}

            {tab === "crop" && (
              <>
                {!target.background && (
                  <Choice
                    label="Format"
                    value={edit.aspect}
                    options={IMAGE_ASPECTS}
                    onChange={(aspect) => change({ aspect })}
                  />
                )}
                <Slider label="Zoom" value={edit.zoom} {...IMAGE_RANGES.zoom} unit=" %" onChange={(zoom) => change({ zoom })} />
                <p className="text-xs text-zinc-500">Klicka i bilden för att välja vad som ska synas i mitten.</p>
                <Slider label="Fokus vågrätt" value={edit.focusX} {...IMAGE_RANGES.focusX} unit=" %" onChange={(focusX) => change({ focusX })} />
                <Slider label="Fokus lodrätt" value={edit.focusY} {...IMAGE_RANGES.focusY} unit=" %" onChange={(focusY) => change({ focusY })} />
                <Toggle
                  label="Egen position på mobil"
                  active={edit.mobileFocus}
                  onClick={() => {
                    // Starts from the current position, so turning it on changes nothing yet.
                    change(
                      edit.mobileFocus
                        ? { mobileFocus: false }
                        : { mobileFocus: true, mobileFocusX: edit.focusX, mobileFocusY: edit.focusY },
                    );
                    setPhonePreview(!edit.mobileFocus);
                  }}
                />
                {edit.mobileFocus && (
                  <>
                    <p className="text-xs text-zinc-500">
                      Gäller bara på mobil. Förhandsvisningen under Mobil visar bilden som på en telefon; klicka i den för
                      att välja mobilens mitt.
                    </p>
                    <Slider
                      label="Mobil: vågrätt"
                      value={edit.mobileFocusX}
                      {...IMAGE_RANGES.mobileFocusX}
                      unit=" %"
                      onChange={(mobileFocusX) => change({ mobileFocusX })}
                    />
                    <Slider
                      label="Mobil: lodrätt"
                      value={edit.mobileFocusY}
                      {...IMAGE_RANGES.mobileFocusY}
                      unit=" %"
                      onChange={(mobileFocusY) => change({ mobileFocusY })}
                    />
                  </>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Toggle label="Spegla vågrätt" active={edit.flipX} onClick={() => change({ flipX: !edit.flipX })} />
                  <Toggle label="Spegla lodrätt" active={edit.flipY} onClick={() => change({ flipY: !edit.flipY })} />
                </div>
              </>
            )}

            {tab === "shape" && (
              <Choice label="Hörn" value={edit.radius} options={IMAGE_RADII} onChange={(radius) => change({ radius })} />
            )}
          </div>

          <div className="flex gap-2 border-t border-zinc-200 px-5 py-4">
            <button
              type="button"
              onClick={() => change(DEFAULT_IMAGE_EDIT)}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
            >
              Återställ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Klar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * How the image is framed on a phone: a tall crop where it fills an area
 * (the Hero with "Samma som på datorn", background boxes), else uncropped
 * (the Hero shows the whole image on phones otherwise; Bild keeps its format).
 */
type PhoneFrame = { aspectRatio?: string };

function phoneFrame(item: { type: string; props: Record<string, unknown> }, background: boolean): PhoneFrame {
  if (item.type === "Hero") return (item.props.mobileFit ?? "whole") === "same" ? { aspectRatio: "9 / 16" } : {};
  return background ? { aspectRatio: "4 / 5" } : {};
}

/** The image as it will look on the page (or a phone); click it to set the focus point. */
function Preview({
  src,
  edit,
  background,
  phone,
  showFocus,
  onFocus,
}: {
  src: string;
  edit: ImageEdit;
  background: boolean;
  /** Show it as on a phone, with the phone focus point. */
  phone: PhoneFrame | null;
  showFocus: boolean;
  onFocus: (x: number, y: number) => void;
}) {
  const phoneCropped = phone ? Boolean(phone.aspectRatio) || (!background && edit.aspect !== "original") : false;
  const frame = phone
    ? { ...(background ? {} : imageFrameStyle(edit)), ...(phone.aspectRatio && { aspectRatio: phone.aspectRatio }) }
    : background
      ? { aspectRatio: "16 / 9" }
      : imageFrameStyle(edit);
  const cropped = phone ? phoneCropped : background || edit.aspect !== "original";
  // On a phone the phone focus point is the one in use.
  const shown = phone ? { ...edit, focusX: edit.mobileFocusX, focusY: edit.mobileFocusY, mobileFocus: false } : edit;
  return (
    <div
      style={frame}
      className={`relative w-full cursor-crosshair overflow-hidden shadow-lg ${
        phone ? "max-w-60 rounded-[1.75rem] ring-8 ring-zinc-900" : "max-w-xl"
      } ${cropped ? "" : "max-h-[60vh]"}`}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onFocus(
          Math.round(((event.clientX - rect.left) / rect.width) * 100),
          Math.round(((event.clientY - rect.top) / rect.height) * 100),
        );
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on S3 */}
      <img src={src} alt="" style={imageEditStyle(shown)} className={`block w-full object-cover ${cropped ? "h-full" : "h-auto"}`} />
      {showFocus && (
        <span
          aria-hidden
          className={`pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.4)] ${
            phone ? "bg-violet-600" : ""
          }`}
          style={{ left: `${shown.focusX}%`, top: `${shown.focusY}%` }}
        />
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex justify-between font-medium">
        {label}
        <span className="font-normal text-zinc-500 tabular-nums">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-violet-600"
      />
    </label>
  );
}

function Choice<K extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: K;
  options: Record<K, { label: string }>;
  onChange: (value: K) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-medium">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(options) as K[]).map((key) => (
          <Toggle key={key} label={options[key].label} active={value === key} onClick={() => onChange(key)} />
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm ${active ? "border-violet-600 bg-violet-50 font-semibold text-violet-800" : "border-zinc-200 hover:bg-zinc-50"}`}
    >
      {label}
    </button>
  );
}
