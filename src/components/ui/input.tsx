import { type InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-sm border border-ink/20 bg-white/80 px-3 py-2.5 text-ink placeholder:text-ink/40 focus:border-stamp focus:outline-none ${className}`}
      {...props}
    />
  );
}

export function TextArea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-sm border border-ink/20 bg-white/80 px-3 py-2.5 text-ink placeholder:text-ink/40 focus:border-stamp focus:outline-none ${className}`}
      {...props}
    />
  );
}

export function Label({
  className = "",
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1.5 block text-sm font-medium text-ink/80 ${className}`}
      {...props}
    />
  );
}
