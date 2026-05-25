const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const UNSAFE_LINK_PROTOCOLS = new Set(["javascript:", "data:", "vbscript:", "file:", "blob:"]);

const hasControlCharacter = (value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
};

export const normalizeSafeLinkUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim();
  if (!trimmed || hasControlCharacter(trimmed)) return null;

  try {
    const parsed = new URL(trimmed);
    if (UNSAFE_LINK_PROTOCOLS.has(parsed.protocol) || !SAFE_LINK_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};
