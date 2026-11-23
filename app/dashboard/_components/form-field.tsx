import type { ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

const inputClassName =
  "block w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white shadow-sm placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 aria-[invalid=true]:border-red-400";

export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-200">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

// Props that wire an input to its label and error message.
export function fieldProps(id: string, error?: string) {
  return {
    id,
    name: id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
    className: inputClassName,
  };
}
