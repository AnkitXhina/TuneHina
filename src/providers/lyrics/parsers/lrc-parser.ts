import type { LyricLine, WordTiming } from '../../../types/lyrics';

/**
 * Parse LRC format lyrics into structured LyricLine array.
 *
 * Handles:
 * - Standard timestamps: [mm:ss.xx]
 * - Extended timestamps: [mm:ss.xxx]
 * - Multiple timestamps per line: [00:01.00][00:15.00]Repeated line
 * - Metadata tags: [ti:], [ar:], [al:], [offset:]
 * - Empty lines and malformed input
 */

interface LrcMetadata {
  title?: string;
  artist?: string;
  album?: string;
  offset: number; // ms offset to apply to all timestamps
}

const TIMESTAMP_REGEX = /\[(\d{1,3}):(\d{2})(?:[.:](\d{2,3}))?\]/g;
const METADATA_TAG_REGEX = /^\[([a-zA-Z#]+):([^\]]*)\]$/;

function parseTimestampToMs(minutes: string, seconds: string, fraction?: string): number {
  const min = parseInt(minutes, 10);
  const sec = parseInt(seconds, 10);
  let ms = 0;

  if (fraction) {
    // Handle both .xx (centiseconds) and .xxx (milliseconds)
    if (fraction.length === 2) {
      ms = parseInt(fraction, 10) * 10;
    } else {
      ms = parseInt(fraction, 10);
    }
  }

  return min * 60 * 1000 + sec * 1000 + ms;
}

function extractMetadata(lines: string[]): LrcMetadata {
  const metadata: LrcMetadata = { offset: 0 };

  for (const line of lines) {
    const match = line.trim().match(METADATA_TAG_REGEX);
    if (!match) continue;

    const [, tag, value] = match;
    const trimmedValue = value.trim();

    switch (tag.toLowerCase()) {
      case 'ti':
        metadata.title = trimmedValue;
        break;
      case 'ar':
        metadata.artist = trimmedValue;
        break;
      case 'al':
        metadata.album = trimmedValue;
        break;
      case 'offset':
        metadata.offset = parseInt(trimmedValue, 10) || 0;
        break;
    }
  }

  return metadata;
}

export function parseLrc(lrcContent: string): LyricLine[] {
  if (!lrcContent || typeof lrcContent !== 'string') {
    return [];
  }

  const rawLines = lrcContent.split('\n');
  const metadata = extractMetadata(rawLines);
  const lyricLines: LyricLine[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip pure metadata tags
    if (METADATA_TAG_REGEX.test(trimmed)) continue;

    // Extract all timestamps from this line
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(TIMESTAMP_REGEX.source, 'g');

    while ((match = regex.exec(trimmed)) !== null) {
      const timeMs = parseTimestampToMs(match[1], match[2], match[3]);
      timestamps.push(timeMs + metadata.offset);
    }

    if (timestamps.length === 0) continue;

    // Extract the text portion (everything after the last timestamp bracket)
    const text = trimmed.replace(/\[\d{1,3}:\d{2}(?:[.:]\d{2,3})?\]/g, '').trim();

    // Create a LyricLine for each timestamp (handles repeated timestamps)
    for (const timeMs of timestamps) {
      lyricLines.push({
        timeMs,
        text,
      });
    }
  }

  // Sort by timestamp
  lyricLines.sort((a, b) => a.timeMs - b.timeMs);

  // Calculate endTimeMs based on next line's startTime
  for (let i = 0; i < lyricLines.length - 1; i++) {
    lyricLines[i].endTimeMs = lyricLines[i + 1].timeMs;
  }

  // Last line: estimate 5 seconds duration
  if (lyricLines.length > 0) {
    const last = lyricLines[lyricLines.length - 1];
    last.endTimeMs = last.timeMs + 5000;
  }

  return lyricLines;
}

/**
 * Parse enhanced LRC with word-level timing.
 * Format: [mm:ss.xx]<mm:ss.xx>word1 <mm:ss.xx>word2
 */
export function parseLrcEnhanced(lrcContent: string): LyricLine[] {
  if (!lrcContent || typeof lrcContent !== 'string') {
    return [];
  }

  const lines = parseLrc(lrcContent);
  const enhancedWordRegex = /<(\d{1,3}):(\d{2})(?:[.:](\d{2,3}))?>([^<]*)/g;

  for (const line of lines) {
    const words: WordTiming[] = [];
    let wordMatch: RegExpExecArray | null;
    const wordRegex = new RegExp(enhancedWordRegex.source, 'g');

    // Check the original raw text for word timestamps
    while ((wordMatch = wordRegex.exec(line.text)) !== null) {
      const startMs = parseTimestampToMs(wordMatch[1], wordMatch[2], wordMatch[3]);
      const word = wordMatch[4].trim();

      if (word) {
        words.push({
          startMs,
          endMs: startMs, // Will be set below
          word,
        });
      }
    }

    // Set end times for words
    if (words.length > 0) {
      for (let i = 0; i < words.length - 1; i++) {
        words[i].endMs = words[i + 1].startMs;
      }
      words[words.length - 1].endMs = line.endTimeMs ?? words[words.length - 1].startMs + 1000;

      line.words = words;
      // Clean the text of word timestamps
      line.text = words.map((w) => w.word).join(' ');
    }
  }

  return lines;
}

/**
 * Convert LyricLine[] back to LRC format string.
 */
export function toLrc(lines: LyricLine[]): string {
  return lines
    .map((line) => {
      const totalMs = line.timeMs;
      const minutes = Math.floor(totalMs / 60000);
      const seconds = Math.floor((totalMs % 60000) / 1000);
      const centiseconds = Math.floor((totalMs % 1000) / 10);

      const mm = String(minutes).padStart(2, '0');
      const ss = String(seconds).padStart(2, '0');
      const xx = String(centiseconds).padStart(2, '0');

      return `[${mm}:${ss}.${xx}] ${line.text}`;
    })
    .join('\n');
}
