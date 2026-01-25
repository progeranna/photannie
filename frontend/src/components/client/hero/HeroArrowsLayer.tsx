import IconButton from "./IconButton";
import { ChevronLeft, ChevronRight } from "./icons";
import { IMAGE_W } from "./HeroBase";

export default function HeroArrowsLayer({
                                            onPrev,
                                            onNext,
                                        }: {
    onPrev: () => void;
    onNext: () => void;
}) {
    return (
        <div
            className="absolute left-0 top-0 h-full"
            style={{ width: IMAGE_W }}
        >
            <div className="absolute left-[22px] top-1/2 -translate-y-1/2">
                <IconButton ariaLabel="Previous photo" onClick={onPrev}>
                    <ChevronLeft />
                </IconButton>
            </div>

            <div className="absolute right-[22px] top-1/2 -translate-y-1/2">
                <IconButton ariaLabel="Next photo" onClick={onNext}>
                    <ChevronRight />
                </IconButton>
            </div>
        </div>
    );
}
