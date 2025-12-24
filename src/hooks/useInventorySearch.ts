import { useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
import { SearchMatch } from '../utils/searchUtils';

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

interface FlattenedDoc {
    id: string;
    type: 'group' | 'item';
    name: string;
    data: InventoryItem | InventoryGroup;
    path: string[]; // store IDs of ancestors
}

const FUSE_OPTIONS = {
    includeScore: true,
    includeMatches: true,
    threshold: 0.4, // 0.0 = perfect match, 1.0 = match anything
    ignoreLocation: true,
    useExtendedSearch: true,
    keys: [
        { name: 'name', weight: 0.7 },
        { name: 'item_id', weight: 0.3 },
    ]
};

export function useInventorySearch(initialData: InventoryGroup[]) {
    const [query, setQuery] = useState('');
    const [filteredData, setFilteredData] = useState<InventoryGroup[]>(initialData);

    // Flatten the data for Fuse
    const flattenedData = useMemo(() => {
        const docs: FlattenedDoc[] = [];

        const traverse = (groups: InventoryGroup[], path: string[]) => {
            groups.forEach(group => {
                const groupId = group.group_id || group.group_name;
                const currentPath = [...path, groupId];

                // Add group itself
                docs.push({
                    id: `group-${groupId}`,
                    type: 'group',
                    name: group.group_name,
                    data: group,
                    path: path
                });

                // Add Items
                if (group.items) {
                    group.items.forEach(item => {
                        docs.push({
                            id: `item-${item.item_id}`,
                            type: 'item',
                            name: item.name,
                            data: item,
                            path: currentPath
                        });
                    });
                }

                // Recurse
                if (group.subgroups) {
                    traverse(group.subgroups, currentPath);
                }
            });
        };

        traverse(initialData, []);
        return docs;
    }, [initialData]);

    const fuse = useMemo(() => {
        return new Fuse(flattenedData, FUSE_OPTIONS);
    }, [flattenedData]);

    useEffect(() => {
        if (!query || !query.trim()) {
            setFilteredData(initialData);
            return;
        }

        const searchResults = fuse.search(query);
        const matchedIds = new Set<string>();
        const matchMetadata = new Map<string, ReadonlyArray<SearchMatch>>();

        searchResults.forEach(result => {
            matchedIds.add(result.item.id);
            if (result.matches) {
                // Cast Fuse matches to our local type
                matchMetadata.set(result.item.id, result.matches as unknown as ReadonlyArray<SearchMatch>);
            }
        });

        // Function to reconstruct the tree with filtered items
        const filterTree = (groups: InventoryGroup[]): InventoryGroup[] => {
            return groups.map(group => {
                const groupId = group.group_id || group.group_name;
                const groupDocId = `group-${groupId}`;

                const groupMatches = matchMetadata.get(groupDocId);
                const isGroupMatch = matchedIds.has(groupDocId);

                // Filter Items
                const filteredItems = (group.items || []).filter(item => {
                    const itemDocId = `item-${item.item_id}`;
                    // Keep item if it matches OR if group matches (optional strategy)
                    // Here we stick to: keep if match
                    return matchedIds.has(itemDocId) || isGroupMatch;
                }).map(item => {
                    const itemDocId = `item-${item.item_id}`;
                    return {
                        ...item,
                        matches: matchMetadata.get(itemDocId)
                    } as InventoryItem;
                });

                // Filter Subgroups
                const filteredSubgroups = filterTree(group.subgroups || []);

                // Logic: Keep group if:
                // 1. It matches itself
                // 2. It has matching items
                // 3. It has matching subgroups

                if (isGroupMatch || filteredItems.length > 0 || filteredSubgroups.length > 0) {
                    return {
                        ...group,
                        items: filteredItems,
                        subgroups: filteredSubgroups,
                        matches: groupMatches
                    } as InventoryGroup;
                }

                return null;
            }).filter((g): g is InventoryGroup => g !== null);
        };

        setFilteredData(filterTree(initialData));

    }, [query, initialData, fuse]);

    return {
        query,
        setQuery,
        filteredData
    };
}
