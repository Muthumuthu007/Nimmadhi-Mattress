import React from 'react';

// Types interfaces matching GroupTree structure loosely
export interface SearchableItem {
    name: string;
    item_id?: string;
    quantity?: number;
    cost_per_unit?: number;
    [key: string]: any;
}

export interface SearchableGroup {
    group_name: string;
    items: SearchableItem[];
    subgroups: SearchableGroup[];
    [key: string]: any;
}

/**
 * Calculates a match score for a text against a query.
 * Higher score means better match.
 * 
 * Rules:
 * 1. Exact match (case insensitive) -> High score
 * 2. Starts with -> Medium-High score
 * 3. Contains all query tokens -> Medium score
 * 4. Fuzzy match (approximate) -> Low score (threshold)
 */
export function scoreMatch(text: string, query: string): number {
    if (!text || !query) return 0;

    const normalizedText = text.toLowerCase().trim();
    const normalizedQuery = query.toLowerCase().trim();

    // 1. Exact Match
    if (normalizedText === normalizedQuery) return 100;

    // 2. Starts With
    if (normalizedText.startsWith(normalizedQuery)) return 80;

    // 3. Contains (Substring)
    if (normalizedText.includes(normalizedQuery)) return 60;

    // 4. Token Match (Order independent)
    const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
    if (queryTokens.length === 0) return 0;

    // Check if all tokens match
    const allTokensPresent = queryTokens.every(token => normalizedText.includes(token));
    if (allTokensPresent) return 50;

    // 5. Fuzzy / Partial Token Match
    // If at least one significant token matches heavily
    const tokenMatches = queryTokens.filter(token => normalizedText.includes(token));
    if (tokenMatches.length > 0 && tokenMatches.length === queryTokens.length) {
        return 40;
    }

    // Simple Fuzzy check for typos (Subsequence)
    // e.g. "scrw" matches "screw"
    if (normalizedQuery.length > 2 && isSubsequence(normalizedQuery, normalizedText)) {
        return 30;
    }

    return 0;
}

// Helper for subsequence matching (fuzzy-ish)
function isSubsequence(query: string, text: string): boolean {
    let i = 0;
    let j = 0;
    while (i < query.length && j < text.length) {
        if (query[i] === text[j]) {
            i++;
        }
        j++;
    }
    return i === query.length;
}

/**
 * Filters the Group Tree based on the search query.
 * Returns a new tree containing only paths to matching items or groups.
 */
export function filterInventoryTree<T extends SearchableGroup>(
    tree: T[],
    query: string
): T[] {
    if (!query || !query.trim()) return tree;

    return tree.map(group => {
        // Check if the group name itself matches
        const groupNameScore = scoreMatch(group.group_name, query);
        const isGroupMatch = groupNameScore > 0;

        // Filter Items
        const matchingItems = group.items.filter(item => {
            // Search in Name
            if (scoreMatch(item.name, query) > 0) return true;
            // Search in ID if exists
            if (item.item_id && scoreMatch(item.item_id, query) > 0) return true;
            // Search in Cost (stringified)
            if (item.cost_per_unit && item.cost_per_unit.toString().includes(query)) return true;
            // Search in Quantity (stringified)
            if (item.quantity !== undefined && item.quantity.toString().includes(query)) return true;

            return false;
        });

        // Recursively Filter Subgroups
        const matchingSubgroups = filterInventoryTree(group.subgroups, query);

        // Keep group if it matches, or has matching items/subgroups
        const keepGroup = isGroupMatch || matchingItems.length > 0 || matchingSubgroups.length > 0;

        if (keepGroup) {
            return {
                ...group,
                // If Group matched strongly, show all items (unless user filters specifically? Let's just show all for now to be safe)
                // Actually, if I search "Plumbing", showing "Plumbing -> Wrench" is good.
                // Showing "Plumbing -> [Filtered Items]" is better if I search for "Wrench".
                // Let's stick to filtered items unless the group name matches very highly (80+).
                items: (isGroupMatch && groupNameScore >= 80) ? group.items : matchingItems,
                subgroups: matchingSubgroups
            };
        }

        return null;
    }).filter(Boolean) as T[];
}

/**
 * React Component helper to highlight matching text
 */
// Shared type definition for Fuse matches
export interface SearchMatch {
    indices: ReadonlyArray<[number, number]>;
    key?: string;
    value?: string;
}

interface HighlightTextProps {
    text: string;
    highlight?: string;
    matches?: ReadonlyArray<SearchMatch>;
}

export const HighlightText = ({ text, highlight, matches }: HighlightTextProps) => {
    if (matches && matches.length > 0) {
        // Use Fuse matches
        // Fuse returns integer intervals: [start, end] inclusive.
        // We need to sort and merge overlapping intervals (though Fuse usually returns non-overlapping for a single key)
        // But let's handle simple case: single match or multiple matches on this key matches specific indices.
        // Actually matches is an array of objects: { key, value, indices, ... }
        // We must filter matches for the 'name' key (or whatever key this text represents).
        // For simplicity, we assume the passed `matches` are relevant to `text`.
        // If the caller passes the entire matches array for the object, we need to filter by key?
        // No, usually the caller should pass the indices or we just pass the whole matches array and filter here.
        // Let's assume passed matches are specifically for this field or generic.
        // Fuse matches array contains: { indices: [start, end][], key?: string, value?: string }

        // Find matches for 'name' or generic if key is not checked
        // If we want to be key-agnostic (just highlight whatever matched in this text), we iterate all.
        const indices: [number, number][] = [];

        matches.forEach(match => {
            if (match.value === text) {
                match.indices.forEach(pair => indices.push([...pair]));
            }
        });

        if (indices.length === 0) {
            if (!highlight) return <>{text}</>;
        } else {
            // Sort indices
            indices.sort((a, b) => a[0] - b[0]);

            const parts: React.ReactNode[] = [];
            let lastIndex = 0;

            indices.forEach(([start, end], i) => {
                // start and end are inclusive in Fuse
                if (start > lastIndex) {
                    parts.push(<span key={`text-${i}`}>{text.substring(lastIndex, start)}</span>);
                }
                parts.push(
                    <mark key={`mark-${i}`} className="bg-yellow-200 dark:bg-yellow-900/50 text-gray-900 dark:text-white rounded-sm px-0.5">
                        {text.substring(start, end + 1)}
                    </mark>
                );
                lastIndex = end + 1;
            });

            if (lastIndex < text.length) {
                parts.push(<span key="text-end">{text.substring(lastIndex)}</span>);
            }

            return <span>{parts}</span>;
        }
    }

    if (!highlight || !highlight.trim()) {
        return <>{text}</>;
    }

    // Legacy regex match
    const tokens = highlight.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) return <>{text}</>;

    const escapedTokens = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');

    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-gray-900 dark:text-white rounded-sm px-0.5">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
};
