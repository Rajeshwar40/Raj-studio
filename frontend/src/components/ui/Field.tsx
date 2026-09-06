import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface LabelBase {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  id?: string;
  htmlFor?: string;
  children?: ReactNode;
  className?: string;
  trailing?: ReactNode;
}

export function FieldWrap({ label, hint, error, htmlFor, children, className, trailing }: LabelBase) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || trailing) && (
        <div className="flex items-center justify-between gap-2">
          {label ? (
            <label htmlFor={htmlFor} className="label">
              {label}
            </label>
          ) : (
            <span />
          )}
          {trailing}
        </div>
      )}
      {children}
      {(hint || error) && (
        <div className={cn("text-xs", error ? "text-rose-300" : "text-ink-400")}>
          {error || hint}
        </div>
      )}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & Omit<LabelBase, "children">;
export function TextField({ label, hint, error, className, trailing, ...rest }: TextFieldProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={rest.id} trailing={trailing}>
      <input {...rest} className={cn("input", className)} />
    </FieldWrap>
  );
}

type NumberFieldProps = InputHTMLAttributes<HTMLInputElement> & Omit<LabelBase, "children">;
export function NumberField({ label, hint, error, className, trailing, ...rest }: NumberFieldProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={rest.id} trailing={trailing}>
      <input type="number" inputMode="decimal" {...rest} className={cn("input", className)} />
    </FieldWrap>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & Omit<LabelBase, "children">;
export function TextArea({ label, hint, error, className, trailing, ...rest }: TextAreaProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={rest.id} trailing={trailing}>
      <textarea {...rest} className={cn("input min-h-[6rem] resize-y", className)} />
    </FieldWrap>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> &
  Omit<LabelBase, "children"> & {
    options: { value: string; label: string }[];
  };
export function SelectField({
  label,
  hint,
  error,
  className,
  options,
  trailing,
  ...rest
}: SelectFieldProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={rest.id} trailing={trailing}>
      <select {...rest} className={cn("input appearance-none pr-8", className)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  id?: string;
  disabled?: boolean;
}
export function Switch({ checked, onChange, label, hint, id, disabled }: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start justify-between gap-3 cursor-pointer select-none",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium text-ink-100">{label}</span>
        {hint && <span className="text-xs text-ink-400 mt-0.5">{hint}</span>}
      </span>
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            if (!disabled) onChange(!checked);
          }
        }}
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border border-white/5 transition-colors",
          checked ? "bg-brand-gradient" : "bg-ink-700",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </label>
  );
}
