import crypto from 'node:crypto';
import path from 'node:path';

const RESERVED_PACKAGE_ROOTS = ['index.html', 'rendered.html', 'manifest.json'];

const stableAssetAlias = (identity, extension) => {
    const digest = crypto.createHash('sha256').update(identity).digest('hex').slice(0, 16);
    return `assets/captured/${digest}${extension || '.bin'}`;
};

export const safePackageRelativePath = (relativePath, identity = relativePath) => {
    const decoded = decodeURIComponent(String(relativePath)).replace(/^\/+/, '');
    const normalized = path.posix.normalize(decoded);
    if (!normalized || normalized === '..' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
        throw new Error(`Asset path escapes the clone package: ${relativePath}`);
    }
    const extension = path.posix.extname(normalized);
    const collidesWithPage = RESERVED_PACKAGE_ROOTS.some((reserved) =>
        normalized === reserved || normalized.startsWith(`${reserved}/`));
    if (collidesWithPage || !extension) return stableAssetAlias(identity, extension);
    return normalized;
};

export const safePackageUrlPath = (url) => {
    let decoded;
    try { decoded = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'; }
    catch { decoded = url.pathname.replace(/^\/+/, '') || 'index.html'; }
    const relative = url.pathname.endsWith('/') ? path.posix.join(decoded, 'index.html') : decoded;
    return safePackageRelativePath(relative, url.href);
};
