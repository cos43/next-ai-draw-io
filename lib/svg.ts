const XML_DECLARATION = /<\?xml.*?\?>/g;

/**
 * Convert an inline SVG markup string to a data URL that can be rendered with an <img /> tag.
 * Using an image element makes it easier to size with object-fit rules inside constrained containers.
 */
export function svgToDataUrl(svg?: string | null): string | null {
    if (!svg) {
        return null;
    }
    const trimmed = svg.trim();
    if (!trimmed) {
        return null;
    }
    const cleaned = trimmed.replace(XML_DECLARATION, "").trim();
    try {
        const encoded = encodeURIComponent(cleaned)
            .replace(/'/g, "%27")
            .replace(/"/g, "%22");
        return `data:image/svg+xml;charset=utf-8,${encoded}`;
    } catch {
        return null;
    }
}
