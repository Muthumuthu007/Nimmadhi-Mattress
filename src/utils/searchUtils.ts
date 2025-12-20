/**
 * Normalizes a string for search comparison by:
 * - Converting to lowercase
 * - Trimming leading/trailing spaces
 * - Collapsing multiple spaces into one
 * 
 * This ensures consistent search behavior across the application,
 * handling special characters and multiple spaces in pasted text.
 * 
 * @param str - String to normalize
 * @returns Normalized string for comparison
 * 
 * @example
 * normalizeSearchString("60X90  1+2  BED SPREADS  ")
 * // Returns: "60x90 1+2 bed spreads"
 */
export function normalizeSearchString(str: string): string {
    return str
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' '); // Collapse multiple spaces into one
}

/**
 * Checks if a text contains a search query after normalization.
 * 
 * @param text - Text to search in
 * @param query - Search query
 * @returns true if normalized text contains normalized query
 * 
 * @example
 * searchIncludes("60X90 1+2 BED SPREADS", "60x90  1+2")
 * // Returns: true
 */
export function searchIncludes(text: string, query: string): boolean {
    if (!text || !query) return false;
    return normalizeSearchString(text).includes(normalizeSearchString(query));
}
