import Text from "../../../ui/Text";
import HeroCarousel from "./HeroCarousel";

const IMAGE_W = 456;
const PRICING_W = 248;

export default function HeroBase({
                                     index,
                                     onIndexChange,
                                 }: {
    index: number;
    onIndexChange: (i: number) => void;
}) {
    return (
        <div
            className="relative h-[400px] w-[704px] overflow-hidden rounded-[var(--r-hero)] border-[1.4px] border-[var(--hair)] bg-[var(--soft)]"
        >
            <div className="absolute left-0 top-0 h-[170px] w-full bg-[var(--hero-top)]" />
            <div className="absolute right-0 top-0 h-full w-[248px] bg-[var(--hero-side)]" />

            <div
                className="absolute top-0 h-full bg-[var(--hair)]"
                style={{ left: IMAGE_W, width: "1.2px" }}
            />

            <div
                className="absolute left-0 top-0 h-full overflow-hidden"
                style={{ width: IMAGE_W }}
            >
                <HeroCarousel index={index} onIndexChange={onIndexChange} />
            </div>

            <Text variant="tiny" tone="muted2" className="absolute bottom-[14px] left-[22px]">
                Hero image (static gallery 8–10)
            </Text>

        </div>
    );
}

export { IMAGE_W, PRICING_W };
