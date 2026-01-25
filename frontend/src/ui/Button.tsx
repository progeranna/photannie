import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "ghost" | "dangerOutline";
type Size = "lg" | "md" | "sm";

const VARIANT: Record<Variant, string> = {
    primary: "bg-[var(--ink)] text-white",
    ghost: "bg-white border-[1.4px] border-[#d7cfc5] text-[var(--ink)]",
    dangerOutline: "bg-white border-[1.4px] border-[#e8bcbc] text-[#7a1f1f]",
};

const SIZE: Record<Size, string> = {
    lg: "h-[52px] rounded-[16px] px-4 text-[13px] font-[800] tracking-[0.3px]",
    md: "h-[44px] rounded-[14px] px-4 text-[13px] font-[800] tracking-[0.3px]",
    sm: "h-[34px] rounded-[12px] px-3 text-[12px] font-[900] tracking-[0.6px]",
};

export default function Button({
                                   className,
                                   variant = "primary",
                                   size = "lg",
                                   ...props
                               }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
    const isDanger = variant === "dangerOutline";

    return (
        <button
            className={cn(
                "inline-flex items-center justify-center select-none",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                VARIANT[variant],
                SIZE[size],
                isDanger ? "uppercase" : "",
                className,
            )}
            {...props}
        />
    );
}
