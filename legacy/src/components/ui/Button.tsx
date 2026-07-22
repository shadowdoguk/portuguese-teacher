import type { ComponentPropsWithoutRef } from "react";

type Variant = "primary" | "ghost";

type Props = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
};

export function Button({ variant = "primary", className, ...rest }: Props) {
  const base = variant === "primary" ? "btn-primary" : "btn-ghost";
  return <button className={`${base} ${className ?? ""}`.trim()} {...rest} />;
}