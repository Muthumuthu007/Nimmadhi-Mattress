import { useState, useMemo, useEffect } from 'react';
import Fuse, { IFuseOptions } from 'fuse.js';
import { SearchMatch } from '../utils/searchUtils';

export type WithMatches<T> = T & { matches?: ReadonlyArray<SearchMatch> };

export function useFuzzySearch<T extends object>(
    initialData: T[],
    keys: string[],
    options?: IFuseOptions<T>
) {
    const [query, setQuery] = useState('');
    const [filteredData, setFilteredData] = useState<WithMatches<T>[]>(initialData);

    const fuse = useMemo(() => {
        return new Fuse(initialData, {
            keys,
            includeMatches: true,
            threshold: 0.3, // Good balance for fuzzy matching
            ignoreLocation: true, // Search anywhere in the string
            useExtendedSearch: true, // Allow spaces to act as AND
            ...options,
        });
    }, [initialData, keys, options]);

    useEffect(() => {
        if (!query || !query.trim()) {
            setFilteredData(initialData);
            return;
        }

        // Normalize the query:
        // 1. Trim leading/trailing spaces
        // 2. Collapse multiple spaces into one
        // 3. Escape special regex characters that might break Fuse.js
        const normalizedQuery = query
            .trim()
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .replace(/[+\-*?^${}()|[\]\\]/g, '\\$&'); // Escape special chars

        const fuseResults = fuse.search(normalizedQuery);
        const results = fuseResults.map(result => ({
            ...result.item,
            matches: result.matches as ReadonlyArray<SearchMatch>
        }));

        setFilteredData(results);
    }, [query, initialData, fuse]);

    return { query, setQuery, filteredData };
}
