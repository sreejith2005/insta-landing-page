import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function LeadField({ label, error, id, ...props }: Props) {
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} {...props} />
      <p className="field-error" id={errorId} aria-live="polite">{error ?? "\u00a0"}</p>
    </div>
  );
}
