import type { ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

const inputClassName =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 aria-[invalid=true]:border-red-500";

export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-800">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-zinc-500">{hint}</p>
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
