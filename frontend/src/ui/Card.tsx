import type { PropsWithChildren } from "react";
import { cn } from "./cn";

type ShadowStrength = "soft" | "strong" | "none";

export default function Card({
                                 children,
                                 className,
                                 shadow = "soft",
                                 radius = "var(--r-card)",
                             }: PropsWithChildren<{
    className?: string;
    shadow?: ShadowStrength;
    radius?: string;
}>) {
    const shadowClass =
        shadow === "none"
            ? ""
            : shadow === "soft"
                ? "bg-black/[0.055]"
                : "bg-black/[0.075]";

    return (
        <div className={cn("relative", className)}>
            {shadow !== "none" && (
                <div
                    className={cn("absolute inset-0 translate-x-2 translate-y-3", shadowClass)}
                    style={{ borderRadius: `calc(${radius})` }}
                />
            )}
            <div
                className={cn("relative border-[1.4px] border-[var(--hair)] bg-white")}
                style={{ borderRadius: `calc(${radius})` }}
            >
                {children}
            </div>
        </div>
    );
}
