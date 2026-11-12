/**
 * Safe HTML-entity decoding for stored clinical text.
 *
 * Templates imported from CharmHealth carry entity-encoded text such as
 * "needs lifestyle &amp; dose adjustment", which must display as
 * "needs lifestyle & dose adjustment".
 *
 * This decodes to a PLAIN STRING which React then renders as a text node, so
 * markup can never execute — no `dangerouslySetInnerHTML` anywhere in the
 * viewer. Decoding runs exactly once: a double-encoded "&amp;amp;" becomes
 * "&amp;" rather than "&", which is the correct, non-exploitable result.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  deg: '°',
  plusmn: '±',
  times: '×',
  divide: '÷',
  middot: '·',
  bull: '•',
  ge: '≥',
  le: '≤',
  ne: '≠',
  rarr: '→',
  larr: '←',
  trade: '™',
  reg: '®',
  copy: '©',
  micro: 'µ',
  sup2: '²',
  sup3: '³',
  frac12: '½'
};

/** Reject control characters and lone surrogates from numeric references. */
function safeCodePoint(code: number): string | null {
  if (!Number.isFinite(code)) return null;
  if (code < 0x20 && code !== 0x09 && code !== 0x0a) return null;
  if (code === 0x7f) return null;
  if (code >= 0xd800 && code <= 0xdfff) return null;
  if (code > 0x10ffff) return null;
  try {
    return String.fromCodePoint(code);
  } catch {
    return null;
  }
}

/**
 * Decode named and numeric HTML entities in `input`.
 * Unrecognised entities are left verbatim so clinical text like
 * "Na&K balance" is never silently mangled.
 */
export function decodeEntities(input: string | null | undefined): string {
  if (!input) return '';
  if (!input.includes('&')) return input;

  return input.replace(/&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{1,31});/g, (match, body: string) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const digits = isHex ? body.slice(2) : body.slice(1);
      const code = parseInt(digits, isHex ? 16 : 10);
      return safeCodePoint(code) ?? match;
    }
    const named = NAMED_ENTITIES[body] ?? NAMED_ENTITIES[body.toLowerCase()];
    return named ?? match;
  });
}

/** Convenience alias used throughout the viewer for readability. */
export const txt = decodeEntities;
