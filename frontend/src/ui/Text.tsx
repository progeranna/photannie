import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "./cn";

type TextVariant =
    | "brand"
    | "kicker"
    | "h1"
    | "h2"
    | "h3"
    | "body"
    | "small"
    | "tiny";

const VARIANT: Record<TextVariant, string> = {
    brand: cn("text-[22px] font-[650] tracking-[0.9px] italic"),
    kicker: cn("text-[11px] font-[800] tracking-[2.2px]"),
    h1: cn("text-[52px] font-[650] tracking-[-0.2px] leading-[1.05]"),
    h2: cn("text-[18px] font-[850] tracking-[0.2px]"),
    h3: cn("text-[13px] font-[850] tracking-[0.2px]"),
    body: cn("text-[15px] font-[520]"),
    small: cn("text-[12px] font-[650]"),
    tiny: cn("text-[11px] font-[650]"),
};

type Props<T extends ElementType> = {
    as?: T;
    variant?: TextVariant;
    tone?: "ink" | "muted" | "muted2";
} & ComponentPropsWithoutRef<T>;

export default function Text<T extends ElementType = "p">({
                                                              as,
                                                              variant = "body",
                                                              tone = "ink",
                                                              className,
                                                              ...props
                                                          }: Props<T>) {
    const Comp = (as ?? "p") as ElementType;

    const toneClass =
        tone === "ink"
            ? "text-[var(--ink)]"
            : tone === "muted"
                ? "text-[var(--muted)]"
                : "text-[var(--muted2)]";

    return (
        <Comp className={cn("ui", VARIANT[variant], toneClass, className)} {...props} />
    );
}
