import { format } from 'date-fns';

/**
 * Cross-browser parsing of date strings returned by the backend.
 *
 * Why this exists:
 * V8 (Chrome/Brave/Edge) is very lenient about date strings, while Safari's
 * JavaScriptCore follows the ECMA-262 Date Time String Format strictly. Values
 * such as "2026-08-02 12:41:38" (space instead of "T") or
 * "2026-08-02T12:41:38.336122" (6 fractional digits instead of 3) parse fine in
 * Chrome but yield an Invalid Date in Safari.
 *
 * `date-fns`' `format()` throws `RangeError: Invalid time value` on an Invalid
 * Date. Thrown during render, that unmounts the React tree and produces a blank
 * page — which is why the app worked in Brave but not in Safari.
 *
 * Returns `null` instead of an Invalid Date so callers must handle the failure.
 */
export function parseApiDate(value: unknown): Date | null {
    if (value === null || value === undefined || value === '') return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'number') {
        const fromNumber = new Date(value);
        return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
    }

    if (typeof value !== 'string') return null;

    const raw = value.trim();
    if (!raw) return null;

    // 1. Try the value as-is. Succeeds on standards-compliant strings in every
    //    browser, and on lenient formats in V8.
    const asIs = new Date(raw);
    if (!Number.isNaN(asIs.getTime())) return asIs;

    // 2. Normalise the two shapes Safari rejects:
    //    - replace the space separator with "T"
    //    - truncate fractional seconds to the 3 digits the spec allows
    const normalised = raw
        .replace(' ', 'T')
        .replace(/(\.\d{3})\d+/, '$1');

    const fromNormalised = new Date(normalised);
    if (!Number.isNaN(fromNormalised.getTime())) return fromNormalised;

    // 3. Last resort: build the date from explicit components, which bypasses
    //    string parsing entirely. Interpreted as local time, matching how
    //    browsers treat timezone-less strings.
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(raw);
    if (match) {
        const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = match;
        const fromParts = new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hours),
            Number(minutes),
            Number(seconds)
        );
        if (!Number.isNaN(fromParts.getTime())) return fromParts;
    }

    return null;
}

/**
 * Safe replacement for `format(new Date(value), pattern)`.
 *
 * Never throws: unparseable values render the `fallback` instead of crashing
 * the page.
 */
export function formatApiDate(value: unknown, pattern: string, fallback = 'N/A'): string {
    const parsed = parseApiDate(value);
    if (!parsed) return fallback;

    try {
        return format(parsed, pattern);
    } catch {
        return fallback;
    }
}

/**
 * Safe replacement for `new Date(value).getTime()`, used when sorting.
 * Returns 0 for unparseable values so comparators stay stable instead of
 * producing NaN.
 */
export function toTimestamp(value: unknown): number {
    const parsed = parseApiDate(value);
    return parsed ? parsed.getTime() : 0;
}
