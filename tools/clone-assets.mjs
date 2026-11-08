export const extractAssetReferences = (html, pageUrl) => {
    const values = [];
    // Resource URLs only: anchor hrefs are navigation, not files to mirror.
    const resourceTags = new Set(['script', 'img', 'source', 'video', 'audio', 'iframe', 'embed', 'track', 'input', 'image', 'use']);
    const resourceLinkRels = new Set(['stylesheet', 'icon', 'shortcut', 'apple-touch-icon', 'preload', 'modulepreload', 'prefetch', 'manifest', 'mask-icon']);
    const attribute = (tag, name) => {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = tag.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
        return match ? (match[1] ?? match[2] ?? match[3] ?? '') : '';
    };
    for (const match of html.matchAll(/<(script|img|source|video|audio|iframe|embed|track|input|image|use|link)\b[^>]*>/gi)) {
        const tag = match[0];
        const tagName = match[1].toLowerCase();
        if (resourceTags.has(tagName)) {
            for (const name of ['src', 'poster', 'data-src', 'href', 'xlink:href']) {
                const value = attribute(tag, name);
                if (value) values.push(value);
            }
        }
        if (tagName === 'link' && attribute(tag, 'rel').toLowerCase().split(/\s+/).some((rel) => resourceLinkRels.has(rel))) {
            const href = attribute(tag, 'href');
            if (href) values.push(href);
        }
        for (const name of ['srcset', 'imagesrcset']) {
            const srcset = attribute(tag, name);
            if (srcset) for (const candidate of srcset.split(',')) values.push(candidate.trim().split(/\s+/)[0]);
        }
    }
    for (const match of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) values.push(match[1]);
    const page = new URL(pageUrl);
    const seen = new Set();
    return values.map((value) => {
        const raw = value.trim();
        try { return { raw, url: new URL(raw, page) }; } catch { return { raw, url: null }; }
    }).filter(({ raw, url }) => {
        if (!url || !['http:', 'https:'].includes(url.protocol) || url.href === page.href) return false;
        const key = `${url.href}\n${raw}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};
