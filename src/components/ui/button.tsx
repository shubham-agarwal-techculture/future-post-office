import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-stamp text-parchment hover:bg-stamp-deep shadow-[0_2px_0_#9a2e1a]",
  secondary:
    "bg-ink text-parchment hover:bg-ink-soft shadow-[0_2px_0_#06141c]",
  ghost:
    "bg-transparent text-ink border border-ink/20 hover:bg-parchment-deep",
  danger: "bg-danger text-parchment hover:opacity-90",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-sm px-5 py-2.5 text-sm font-medium tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
