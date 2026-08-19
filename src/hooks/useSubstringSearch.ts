import { useMemo, useState } from 'react';
import { SearchMatch } from '../utils/searchUtils';
import { WithMatches } from './useFuzzySearch';

/**
 * Finds every case-insensitive occurrence of `term` inside `text`.
 *
 * Returns inclusive [start, end] index pairs, matching the format the
 * existing `HighlightText` component already expects for `matches.indices`.
 *
 * Uses indexOf rather than a RegExp, so any special characters the user types
 * (+, *, ?, (, ), [, ], \, etc.) are treated as literal text and can never
 * alter the matching behaviour or throw.
 */
function findOccurrences(text: string, term: string): [number, number][] {
    const ranges: [number, number][] = [];
    if (!text || !term) return ranges;

    const haystack = text.toLowerCase();
    const needle = term.toLowerCase();

    let from = 0;
    while (from <= haystack.length - needle.length) {
        const index = haystack.indexOf(needle, from);
        if (index === -1) break;
        // end is inclusive, consistent with Fuse's indices format
        ranges.push([index, index + needle.length - 1]);
        from = index + needle.length;
    }

    return ranges;
}

/**
 * Case-insensitive, contiguous substring search.
 *
 * Unlike `useFuzzySearch` (Fuse.js), this only keeps items where the whole
 * search term appears as an unbroken substring of one of the given keys.
 * Scattered single characters never match, so "nim" matches "NIM" but not
 * the "N" in "ANBU".
 *
 * Each returned item carries `matches` describing the exact matched ranges,
 * which `HighlightText` uses to highlight only those substrings.
 *
 * Pass a module-level constant for `keys` so the memo isn't invalidated on
 * every render.
 */
export function useSubstringSearch<T extends object>(
    initialData: T[],
    keys: string[]
) {
    const [query, setQuery] = useState('');

    const filteredData = useMemo<WithMatches<T>[]>(() => {
        const term = query.trim();
        if (!term) return initialData;

        const results: WithMatches<T>[] = [];

        for (const item of initialData) {
            const record = item as unknown as Record<string, unknown>;
            const matches: SearchMatch[] = [];

            for (const key of keys) {
                const value = record[key];
                if (typeof value !== 'string') continue;

                const indices = findOccurrences(value, term);
                if (indices.length > 0) {
                    matches.push({ indices, key, value });
                }
            }

            if (matches.length > 0) {
                results.push({ ...item, matches });
            }
        }

        return results;
    }, [initialData, keys, query]);

    return { query, setQuery, filteredData };
}
