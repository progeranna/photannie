import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";

const base =
    "w-full rounded-[var(--r-14)] border-[1.4px] border-[var(--field-border)] bg-white px-3 " +
    "text-[12px] font-[650] text-[var(--ink)] placeholder:text-[var(--muted)] " +
    "focus:outline-none focus:ring-0 focus:border-[var(--ink)]";

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
    return <input className={cn(base, "h-[44px]", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
    return <textarea className={cn(base, "min-h-[74px] py-3", className)} {...props} />;
}
