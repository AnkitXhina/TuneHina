import type { LyricLine, WordTiming } from '../../../types/lyrics';

/**
 * Parse TTML (Timed Text Markup Language) lyrics into structured LyricLine array.
 *
 * Expected format:
 * ```xml
 * <tt>
 *   <body>
 *     <div>
 *       <p begin="00:00:18.234" end="00:00:21.891">
 *         <span begin="00:00:18.234" end="00:00:18.567">The </span>
 *         <span begin="00:00:18.567" end="00:00:19.123">quick </span>
 *       </p>
 *     </div>
 *   </body>
 * </tt>
 * ```
 *
 * Falls back to DOMParser-free regex parsing to work in all environments.
 */

const TTML_TIMESTAMP_REGEX = /(\d{2,}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/;

function parseTtmlTimestamp(value: string): number {
  const match = value.match(TTML_TIMESTAMP_REGEX);
  if (!match) return 0;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  let ms = 0;

  if (match[4]) {
    const frac = match[4];
    if (frac.length === 1) ms = parseInt(frac, 10) * 100;
    else if (frac.length === 2) ms = parseInt(frac, 10) * 10;
    else ms = parseInt(frac, 10);
  }

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + ms;
}

function getAttr(element: string, attrName: string): string | null {
  // Match attribute with double or single quotes
  const regex = new RegExp(`${attrName}\\s*=\\s*["']([^"']*)["']`);
  const match = element.match(regex);
  return match ? match[1] : null;
}

function extractSpans(pContent: string): WordTiming[] {
  const words: WordTiming[] = [];
  const spanRegex = /<span[^>]*>([\s\S]*?)<\/span>/gi;
  let spanMatch: RegExpExecArray | null;

  while ((spanMatch = spanRegex.exec(pContent)) !== null) {
    const spanTag = spanMatch[0];
    const beginStr = getAttr(spanTag, 'begin');
    const endStr = getAttr(spanTag, 'end');

    if (!beginStr || !endStr) continue;

    // Get the text content, stripping any nested tags
    const textContent = spanMatch[1].replace(/<[^>]*>/g, '').trim();
    if (!textContent) continue;

    words.push({
      startMs: parseTtmlTimestamp(beginStr),
      endMs: parseTtmlTimestamp(endStr),
      word: textContent,
    });
  }

  return words;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export function parseTtml(ttmlContent: string): LyricLine[] {
  if (!ttmlContent || typeof ttmlContent !== 'string') {
    return [];
  }

  const lyricLines: LyricLine[] = [];

  // Try DOM parser first (browser environment)
  if (typeof DOMParser !== 'undefined') {
    try {
      return parseTtmlWithDom(ttmlContent);
    } catch {
      // Fall through to regex parsing
    }
  }

  // Regex-based parsing fallback
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(ttmlContent)) !== null) {
    const pTag = pMatch[0];
    const pContent = pMatch[1];
    const beginStr = getAttr(pTag, 'begin');
    const endStr = getAttr(pTag, 'end');

    if (!beginStr) continue;

    const timeMs = parseTtmlTimestamp(beginStr);
    const endTimeMs = endStr ? parseTtmlTimestamp(endStr) : undefined;

    // Try to extract word-level spans
    const words = extractSpans(pContent);

    // Get the full text
    const text = words.length > 0
      ? words.map((w) => w.word).join(' ')
      : stripTags(pContent);

    if (!text) continue;

    const line: LyricLine = {
      timeMs,
      text,
      endTimeMs,
    };

    if (words.length > 0) {
      line.words = words;
    }

    lyricLines.push(line);
  }

  // Sort by timestamp
  lyricLines.sort((a, b) => a.timeMs - b.timeMs);

  // Fill in missing end times
  for (let i = 0; i < lyricLines.length; i++) {
    if (!lyricLines[i].endTimeMs && i < lyricLines.length - 1) {
      lyricLines[i].endTimeMs = lyricLines[i + 1].timeMs;
    }
  }

  if (lyricLines.length > 0 && !lyricLines[lyricLines.length - 1].endTimeMs) {
    const last = lyricLines[lyricLines.length - 1];
    last.endTimeMs = last.timeMs + 5000;
  }

  return lyricLines;
}

function parseTtmlWithDom(ttmlContent: string): LyricLine[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(ttmlContent, 'text/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('TTML parse error');
  }

  const lyricLines: LyricLine[] = [];
  const pElements = doc.querySelectorAll('p');

  for (const p of pElements) {
    const beginStr = p.getAttribute('begin');
    const endStr = p.getAttribute('end');

    if (!beginStr) continue;

    const timeMs = parseTtmlTimestamp(beginStr);
    const endTimeMs = endStr ? parseTtmlTimestamp(endStr) : undefined;

    // Extract word-level spans
    const spanElements = p.querySelectorAll('span');
    const words: WordTiming[] = [];

    for (const span of spanElements) {
      const spanBegin = span.getAttribute('begin');
      const spanEnd = span.getAttribute('end');
      const word = (span.textContent ?? '').trim();

      if (spanBegin && spanEnd && word) {
        words.push({
          startMs: parseTtmlTimestamp(spanBegin),
          endMs: parseTtmlTimestamp(spanEnd),
          word,
        });
      }
    }

    const text = words.length > 0
      ? words.map((w) => w.word).join(' ')
      : (p.textContent ?? '').trim();

    if (!text) continue;

    const line: LyricLine = {
      timeMs,
      text,
      endTimeMs,
    };

    if (words.length > 0) {
      line.words = words;
    }

    lyricLines.push(line);
  }

  // Sort and fill end times
  lyricLines.sort((a, b) => a.timeMs - b.timeMs);

  for (let i = 0; i < lyricLines.length; i++) {
    if (!lyricLines[i].endTimeMs && i < lyricLines.length - 1) {
      lyricLines[i].endTimeMs = lyricLines[i + 1].timeMs;
    }
  }

  if (lyricLines.length > 0 && !lyricLines[lyricLines.length - 1].endTimeMs) {
    const last = lyricLines[lyricLines.length - 1];
    last.endTimeMs = last.timeMs + 5000;
  }

  return lyricLines;
}
