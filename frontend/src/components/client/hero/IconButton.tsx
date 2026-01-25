import { cn } from "../../../ui/cn";

export default function IconButton({
                                       children,
                                       className,
                                       ariaLabel,
                                       onClick,
                                   }: {
    children: React.ReactNode;
    className?: string;
    ariaLabel: string;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "h-[36px] w-[36px] rounded-full border-[1.4px] border-[var(--field-border)] bg-white",
                "grid place-items-center",
                className,
            )}
            aria-label={ariaLabel}
        >
            {children}
        </button>
    );
}
