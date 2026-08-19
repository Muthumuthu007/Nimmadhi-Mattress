import { useState, useMemo } from 'react';
import { SearchMatch, normalizeSearchString } from '../utils/searchUtils';

// Define types compatible with the inventory structure
export interface InventoryItem {
    item_id: string;
    name: string;
    quantity: number;
    defective: number;
    cost_per_unit: number;
    stock_limit: number;
    unit: string;
    total_cost: number;
    total_cost_without_gst: number;
    matches?: ReadonlyArray<SearchMatch>;
    /** Relevance score for the active query; used as the primary sort key. */
    _relevance?: number;
    [key: string]: any;
}

export interface InventoryGroup {
    group_id: string | null;
    group_name: string;
    items: InventoryItem[];
    subgroups: InventoryGroup[];
    // For search highlighting
    matches?: ReadonlyArray<SearchMatch>;
}

/**
 * Relevance tiers, highest first. Exported so consumers can reason about
 * ranking without duplicating the numbers.
 */
export const RELEVANCE = {
    EXACT_NAME: 100,      // whole name equals the query
    EXACT_WORD: 90,       // a whole word in the name equals the query
    STARTS_WITH: 80,      // name begins with the query
    ALL_WORDS: 70,        // every query word matches a whole word in the name
    WORD_PREFIX: 60,      // every query word is a prefix of some name word
    SUBSTRING: 40,        // query appears somewhere in the name
    NONE: 0,
} as const;

/**
 * Scores how well `text` matches `query`, word-aware rather than a raw
 * substring test.
 *
 * Deliberately NOT `text.includes(query)` — that ranks a fragment buried in an
 * unrelated name equally with a real match, which is what made the previous
 * Fuse.js-based search return noise.
 */
export function scoreInventoryMatch(text: string, query: string): number {
    if (!text || !query) return RELEVANCE.NONE;

    const name = normalizeSearchString(text);
    const q = normalizeSearchString(query);
    if (!name || !q) return RELEVANCE.NONE;

    // 1. Whole name is exactly the query
    if (name === q) return RELEVANCE.EXACT_NAME;

    const nameWords = name.split(' ').filter(Boolean);
    const queryWords = q.split(' ').filter(Boolean);
    if (queryWords.length === 0) return RELEVANCE.NONE;

    // 2. Single-word query that exactly equals one of the name's words
    if (queryWords.length === 1 && nameWords.includes(q)) {
        return RELEVANCE.EXACT_WORD;
    }

    // 3. Name begins with the query
    if (name.startsWith(q)) return RELEVANCE.STARTS_WITH;

    // 4. Every query word matches a whole word in the name (order independent)
    const everyWordExact = queryWords.every(word => nameWords.includes(word));
    if (everyWordExact) return RELEVANCE.ALL_WORDS;

    // 5. Every query word is at least a prefix of some name word
    //    (e.g. "side lab" -> "LATEX SIDE LABEL")
    const everyWordPrefix = queryWords.every(word =>
        nameWords.some(nameWord => nameWord.startsWith(word))
    );
    if (everyWordPrefix) return RELEVANCE.WORD_PREFIX;

    // 6. Weakest accepted signal: the full query appears somewhere in the name
    if (name.includes(q)) return RELEVANCE.SUBSTRING;

    return RELEVANCE.NONE;
}

/**
 * Finds contiguous, case-insensitive occurrences of `term` in `text`.
 * Returns inclusive [start, end] pairs in the format HighlightText expects.
 *
 * Uses indexOf rather than a RegExp so characters the user types (+, *, (, etc.)
 * are treated literally and can never throw.
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
        ranges.push([index, index + needle.length - 1]);
        from = index + needle.length;
    }

    return ranges;
}

/** Sorts and merges overlapping/adjacent ranges so highlighting can't double-wrap. */
function mergeRanges(ranges: [number, number][]): [number, number][] {
    if (ranges.length <= 1) return ranges;

    const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        const current = sorted[i];
        if (current[0] <= last[1] + 1) {
            last[1] = Math.max(last[1], current[1]);
        } else {
            merged.push(current);
        }
    }

    return merged;
}

/**
 * Builds highlight ranges for a matched name: the full query where present,
 * otherwise each query word. Only contiguous real occurrences are highlighted,
 * so single letters scattered through an unrelated word are never marked.
 */
function buildMatches(name: string, query: string): SearchMatch[] {
    const q = normalizeSearchString(query);
    if (!q) return [];

    let ranges = findOccurrences(name, q);

    if (ranges.length === 0) {
        const queryWords = q.split(' ').filter(Boolean);
        ranges = queryWords.flatMap(word => findOccurrences(name, word));
    }

    if (ranges.length === 0) return [];

    return [{ indices: mergeRanges(ranges), key: 'name', value: name }];
}

export function useInventorySearch(initialData: InventoryGroup[]) {
    const [query, setQuery] = useState('');

    const filteredData = useMemo<InventoryGroup[]>(() => {
        const q = normalizeSearchString(query);
        if (!q) return initialData;

        const filterTree = (groups: InventoryGroup[]): InventoryGroup[] => {
            return groups
                .map(group => {
                    // A group can match on its own name; when it does we keep all
                    // of its items so the user can browse the group they searched for.
                    const groupScore = scoreInventoryMatch(group.group_name, q);
                    const isGroupMatch = groupScore > RELEVANCE.NONE;

                    const scoredItems = (group.items || [])
                        .map(item => {
                            const nameScore = scoreInventoryMatch(item.name, q);
                            // item_id is still searchable but ranks just below an
                            // equivalent name match.
                            const idScore = item.item_id
                                ? Math.max(scoreInventoryMatch(item.item_id, q) - 5, RELEVANCE.NONE)
                                : RELEVANCE.NONE;
                            const relevance = Math.max(nameScore, idScore);

                            return { item, relevance };
                        })
                        .filter(({ relevance }) => relevance > RELEVANCE.NONE || isGroupMatch)
                        .map(({ item, relevance }) => ({
                            ...item,
                            _relevance: relevance,
                            matches: buildMatches(item.name, q),
                        }) as InventoryItem);

                    const filteredSubgroups = filterTree(group.subgroups || []);

                    // Keep this group if it matched itself, has matching items, or
                    // has a descendant that does — so the path to a match stays visible.
                    if (isGroupMatch || scoredItems.length > 0 || filteredSubgroups.length > 0) {
                        return {
                            ...group,
                            items: scoredItems,
                            subgroups: filteredSubgroups,
                            matches: isGroupMatch ? buildMatches(group.group_name, q) : undefined,
                        } as InventoryGroup;
                    }

                    return null;
                })
                .filter((g): g is InventoryGroup => g !== null);
        };

        return filterTree(initialData);
    }, [query, initialData]);

    return {
        query,
        setQuery,
        filteredData
    };
}
