import { useState } from "react";
import HeroBase from "./HeroBase";
import HeroArrowsLayer from "./HeroArrowsLayer";
import HeroPricingLayer from "./HeroPricingLayer";
import { GALLERY_IMAGES } from "../../../config/gallery";

export default function Hero() {
    const [index, setIndex] = useState(0);

    const hasImages = GALLERY_IMAGES.length > 0;

    const next = () => {
        if (!hasImages) return;
        setIndex((v) => (v + 1) % GALLERY_IMAGES.length);
    };

    const prev = () => {
        if (!hasImages) return;
        setIndex((v) => (v - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length);
    };

    return (
        <div className="relative">
            <HeroBase index={index} onIndexChange={setIndex} />
            <HeroArrowsLayer onPrev={prev} onNext={next} />
            <HeroPricingLayer />
        </div>
    );
}
