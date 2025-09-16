

import { Group, IdolData, FilterOption, FilterSubOption } from '../types';
import { initialIdolGroups, dataTimestamp } from './idolData';

const DATA_KEY = 'kpopSorterData_v1';
const SAVE_KEY = 'kpopSorterState_v2';

interface StoredData {
    timestamp: string;
    groups: Group[];
}

export interface UpdateDiff {
    isLegacyUpdate?: boolean;
    addedGroups: { group: Group }[];
    removedGroups: { group: Group }[];
    changedGroups: { 
        groupName: string;
        addedIdols: IdolData[];
        removedIdols: IdolData[];
        modifiedIdols: { old: IdolData, new: IdolData }[];
    }[];
}

export function getUniqueIdolKey(idol: IdolData, groupName: string): string {
    return `${idol.name}::${groupName}`;
}

export function getUpdateDiff(): UpdateDiff | null {
    const currentDataJSON = localStorage.getItem(DATA_KEY);

    if (!currentDataJSON) {
        // Handle legacy users who have a save file but no data file.
        if (localStorage.getItem(SAVE_KEY)) {
            return {
                isLegacyUpdate: true,
                addedGroups: [],
                removedGroups: [],
                changedGroups: [],
            };
        }
        // New user, no data to diff against.
        return null; 
    }

    try {
        const currentData = JSON.parse(currentDataJSON);

        const oldGroups: Group[] = Array.isArray(currentData) ? currentData : currentData.groups;
        const newGroups: Group[] = initialIdolGroups;

        const oldGroupsMap = new Map(oldGroups.map(g => [g.key, g]));
        const newGroupsMap = new Map(newGroups.map(g => [g.key, g]));

        const diff: UpdateDiff = { addedGroups: [], removedGroups: [], changedGroups: [] };

        // Find added groups
        newGroupsMap.forEach((group, key) => {
            if (!oldGroupsMap.has(key)) {
                diff.addedGroups.push({ group });
            }
        });

        // Find removed groups
        oldGroupsMap.forEach((group, key) => {
            if (!newGroupsMap.has(key)) {
                diff.removedGroups.push({ group });
            }
        });

        // Find changed groups (member additions, removals, or modifications)
        newGroupsMap.forEach((newGroup, key) => {
            if (oldGroupsMap.has(key)) {
                const oldGroup = oldGroupsMap.get(key)!;
                const oldIdolsMap = new Map(oldGroup.idols.map(i => [i.name.toLowerCase(), i]));
                const newIdolsMap = new Map(newGroup.idols.map(i => [i.name.toLowerCase(), i]));
                
                const addedIdols = newGroup.idols.filter(i => !oldIdolsMap.has(i.name.toLowerCase()));
                const removedIdols = oldGroup.idols.filter(i => !newIdolsMap.has(i.name.toLowerCase()));
                const modifiedIdols: { old: IdolData, new: IdolData }[] = [];

                newGroup.idols.forEach(newIdol => {
                    const oldIdol = oldIdolsMap.get(newIdol.name.toLowerCase());
                    if (oldIdol) {
                        const hasChanged = oldIdol.name !== newIdol.name ||
                                         oldIdol.imageUrl !== newIdol.imageUrl ||
                                         oldIdol.gen !== newIdol.gen;

                        if (hasChanged) {
                            modifiedIdols.push({ old: oldIdol, new: newIdol });
                        }
                    }
                });

                if (addedIdols.length > 0 || removedIdols.length > 0 || modifiedIdols.length > 0) {
                    diff.changedGroups.push({
                        groupName: newGroup.name,
                        addedIdols,
                        removedIdols,
                        modifiedIdols,
                    });
                }
            }
        });
        
        const hasChanges = diff.addedGroups.length > 0 || diff.removedGroups.length > 0 || diff.changedGroups.length > 0;
        return hasChanges ? diff : null;

    } catch (e) {
        console.error("Error calculating update diff:", e);
        // Force an update if the diff calculation fails
        return { isLegacyUpdate: true, addedGroups: [], removedGroups: [], changedGroups: [] };
    }
}

export function checkForUpdate(): boolean {
    const storedJSON = localStorage.getItem(DATA_KEY);

    if (!storedJSON) {
        // Legacy case: If there's no master data list, but there is a save file,
        // an update is needed to initialize the data correctly.
        return !!localStorage.getItem(SAVE_KEY);
    }

    try {
        const storedData = JSON.parse(storedJSON);
        // If there's no timestamp or it's older than the new data, update is needed.
        return !storedData.timestamp || storedData.timestamp < dataTimestamp;
    } catch {
        // If data is corrupted and can't be parsed, force an update.
        return true; 
    }
}

export function applyUpdate(): void {
    // The diff is calculated and shown *before* this function is called.
    // All we need to do is clear the old state and reload the page.
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(DATA_KEY);
    window.location.reload();
}


// --- Dynamic Group Filter Options ---
const groupSubOptions: FilterSubOption[] = initialIdolGroups
    .map(group => ({ name: group.name, key: group.key }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

// --- Dynamic Generation Filter Options ---
const getUniqueGens = (): Set<string> => {
    const gens = new Set<string>();
    initialIdolGroups.forEach(group => {
        group.idols.forEach(idol => {
            if (idol.gen) {
                gens.add(idol.gen);
            }
        });
    });
    return gens;
};

const formatGenName = (genKey: string): string => {
    const match = genKey.match(/^gen(\d+)$/);
    if (!match) return genKey;
    const num = parseInt(match[1], 10);

    if (num % 100 >= 11 && num % 100 <= 13) {
        return `${num}th Gen`;
    }

    switch (num % 10) {
        case 1: return `${num}st Gen`;
        case 2: return `${num}nd Gen`;
        case 3: return `${num}rd Gen`;
        default: return `${num}th Gen`;
    }
};

const genSubOptions: FilterSubOption[] = Array.from(getUniqueGens())
    .sort((a, b) => parseInt(a.slice(3)) - parseInt(b.slice(3))) // Sort numerically by generation
    .map(genKey => ({
        name: formatGenName(genKey),
        key: genKey,
    }));

// --- Dynamic Idol Filter Options ---
const idolSubOptions: FilterSubOption[] = initialIdolGroups
    .flatMap(group => 
        group.idols.map(idol => ({
            name: `${idol.name} (${group.name})`, // Display name for disambiguation
            key: getUniqueIdolKey(idol, group.name), // Unique key
        }))
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));


// --- Main Filter Options Array ---
const filterOptions: FilterOption[] = [
  {
    name: "Filter by Group",
    key: "group",
    tooltip: "Restrict to idols from specific groups.",
    checked: true,
    sub: groupSubOptions,
  },
  {
    name: "Filter by Generation",
    key: "gen",
    tooltip: "Restrict to idols from specific debut generations.",
    checked: false,
    sub: genSubOptions,
  },
  {
    name: "Filter by Idol",
    key: "idol",
    tooltip: "Search for and select individual idols.",
    checked: false,
    sub: idolSubOptions,
  },
];

export function getFilterOptions(): FilterOption[] {
    return filterOptions;
}

// Internal function to save data without any special logic.
// Used for initializing the data on first load.
function _internalSaveData(groups: Group[]) {
  try {
      const dataToStore: StoredData = {
          timestamp: dataTimestamp,
          groups: groups,
      };
      localStorage.setItem(DATA_KEY, JSON.stringify(dataToStore));
  } catch (e) {
      console.error("Failed to save initial data to localStorage", e);
  }
}

export function loadGroups(): Group[] {
    const storedDataJSON = localStorage.getItem(DATA_KEY);

    // Case 1: No data found at all. This is a new user. Initialize.
    if (!storedDataJSON) {
        _internalSaveData(initialIdolGroups);
        return initialIdolGroups;
    }

    // Case 2: Data exists. Try to parse and return it.
    try {
        const parsedData = JSON.parse(storedDataJSON);
        const storedGroups = Array.isArray(parsedData) ? parsedData : parsedData.groups;

        // Basic validation
        if (Array.isArray(storedGroups)) {
             const validGroups = storedGroups.filter(g => 
                 g && typeof g.name === 'string' && typeof g.key === 'string' && Array.isArray(g.idols)
             );
             
              validGroups.forEach(g => {
                if (g.idols) { // Ensure idols array exists
                    g.idols = g.idols.filter(i => i && typeof i.name === 'string' && typeof i.imageUrl === 'string');
                }
              });

              // Return the stored data, even if validation filters it to an empty array.
              // This prevents overwriting the data before the user can click "Update".
              return validGroups;
        }
    } catch (e) {
        console.error("Failed to load or parse groups from localStorage. Data might be corrupt.", e);
    }

    // Case 3: Data exists but is corrupt or malformed.
    // Return an empty array to prevent the app from crashing and to avoid
    // overwriting DATA_KEY with new data before the user updates.
    return [];
}


// This function is used by the Admin Page. The logic is simplified as snapshotting is no longer needed.
export function saveGroups(groups: Group[]): void {
    try {
        const dataToStore: StoredData = {
            timestamp: dataTimestamp, // This uses the timestamp from the currently loaded JS file
            groups: groups,
        };
        localStorage.setItem(DATA_KEY, JSON.stringify(dataToStore));
    } catch (e) {
        console.error("Failed to save groups to localStorage", e);
    }
}