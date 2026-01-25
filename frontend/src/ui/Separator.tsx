import { cn } from "./cn";

export default function Separator({ className }: { className?: string }) {
    return <div className={cn("h-[1.2px] w-full bg-[var(--hair)]", className)} />;
}
