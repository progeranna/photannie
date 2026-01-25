import { getPricing } from "../../../config/pricing";
import { IMAGE_W, PRICING_W } from "./HeroBase";

export default function HeroPricingLayer() {
    const pricing = getPricing();

    return (
        <div
            className="absolute top-0 h-full"
            style={{ left: IMAGE_W, width: PRICING_W }}
        >
            <div className="pt-[64px] text-center">
                <div className="text-[11px] font-[900] tracking-[1.8px] text-[var(--ink)]">
                    PRICING
                </div>

                <div
                    className="pricing-scroll mt-[18px] space-y-[8px] overflow-y-auto px-[18px]"
                    style={{
                        maxHeight: 170,
                    }}
                >
                    {pricing.items.map((line, idx) => (
                        <div key={idx} className="text-[13px] font-[650] text-[var(--ink)]">
                            {line}
                        </div>
                    ))}
                </div>

                {pricing.note ? (
                    <div className="px-[18px] pt-[12px] text-[12px] font-[650] text-[var(--muted)]">
                        {pricing.note}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
