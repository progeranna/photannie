type Pricing = {
    items: string[];
    note?: string;
};

const fallback: Pricing = {
    items: [
        "Studio session — 4 900 ₽",
        "Retouch — 400 ₽ / photo",
        "Lookbook — 9 900 ₽",
    ],
    note: "Details arranged personally",
};

function splitEscaped(input: string): string[] {
    const out: string[] = [];
    let buf = "";
    let i = 0;

    while (i < input.length) {
        const ch = input[i];

        if (ch === "\\") {
            const next = input[i + 1];
            if (next === "|" || next === "\\") {
                buf += next;
                i += 2;
                continue;
            }
            buf += ch;
            i += 1;
            continue;
        }

        if (ch === "|") {
            out.push(buf);
            buf = "";
            i += 1;
            continue;
        }

        buf += ch;
        i += 1;
    }

    out.push(buf);
    return out;
}

export function getPricing(): Pricing {
    const raw = (import.meta.env.VITE_PRICING as string | undefined)?.trim();

    if (!raw) return fallback;

    const parts = splitEscaped(raw)
        .map((s) => s.trim())
        .filter(Boolean);

    const items: string[] = [];
    let note: string | undefined;

    for (const p of parts) {
        const lower = p.toLowerCase();
        if (lower.startsWith("note:")) {
            const v = p.slice(5).trim();
            if (v) note = v;
            continue;
        }
        items.push(p);
    }

    if (items.length === 0) return fallback;

    return {
        items,
        note,
    };
}
