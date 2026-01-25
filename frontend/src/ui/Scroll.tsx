import { cn } from "./cn";

export function ScrollbarMock({
                                  className,
                                  trackHeight = 130,
                                  thumbTop = 30,
                                  thumbHeight = 44,
                              }: {
    className?: string;
    trackHeight?: number;
    thumbTop?: number;
    thumbHeight?: number;
}) {
    return (
        <div className={cn("relative w-[8px]", className)} style={{ height: trackHeight }}>
            <div className="absolute inset-0 rounded-[6px] bg-[var(--scroll-track)] border border-[var(--field-border)]" />
            <div
                className="absolute left-[0.8px] w-[6.4px] rounded-[6px] bg-[var(--scroll-thumb)]"
                style={{ top: thumbTop, height: thumbHeight }}
            />
        </div>
    );
}
