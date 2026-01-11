import { useMemo, useState } from "react";
import { cn } from "../../../ui/cn";
import { GALLERY_IMAGES } from "../../../config/gallery";

type Props = {
    className?: string;
    images?: string[];
    index: number;
    onIndexChange: (index: number) => void;
};

export default function HeroCarousel({ className, images, index, onIndexChange }: Props) {
    const imgs = useMemo(() => (images && images.length > 0 ? images : GALLERY_IMAGES), [images]);

    const [broken, setBroken] = useState<Record<string, boolean>>({});

    const setSafe = (next: number) => {
        if (imgs.length === 0) return;
        const wrapped = (next + imgs.length) % imgs.length;
        onIndexChange(wrapped);
    };

    if (imgs.length === 0) {
        return (
            <div
                className={cn(
                    "h-full w-full bg-[var(--chip-busy-bg)]",
                    className,
                )}
            />
        );
    }

    const src = imgs[index % imgs.length];
    const isBroken = !!broken[src];

    return (
        <div className={cn("relative h-full w-full", className)}>
            {!isBroken ? (
                <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                    onLoad={(e) => {
                        e.currentTarget.style.opacity = "1";
                    }}
                    onError={() => setBroken((m) => ({ ...m, [src]: true }))}
                />
            ) : (
                <div className="h-full w-full bg-[var(--chip-busy-bg)]" />
            )}

            <div className="pointer-events-none absolute inset-0 bg-black/[0.02]" />

            <div className="pointer-events-none absolute bottom-[18px] left-1/2 -translate-x-1/2 flex gap-[10px]">
                {imgs.slice(0, 6).map((_, i) => {
                    const active = i === (index % imgs.length);
                    return (
                        <div
                            key={i}
                            className={cn(
                                "h-[8px] w-[8px] rounded-full border border-[var(--field-border)]",
                                active ? "bg-[var(--ink)] border-[var(--ink)]" : "bg-white",
                            )}
                        />
                    );
                })}
            </div>

            <button type="button" className="sr-only" onClick={() => setSafe(index - 1)}>
                Previous
            </button>
            <button type="button" className="sr-only" onClick={() => setSafe(index + 1)}>
                Next
            </button>
        </div>
    );
}
