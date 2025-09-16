import { Group, FilterOption, IdolData } from '../types';
import { loadGroups, getFilterOptions as d_getFilterOptions, checkForUpdate as d_checkForUpdate, applyUpdate as d_applyUpdate, getUpdateDiff as d_getUpdateDiff, getUniqueIdolKey as d_getUniqueIdolKey } from './dataService';
import { UpdateDiff } from './dataService';

export function getGroups(): Group[] {
    return loadGroups();
}

export function getFilterOptions(): FilterOption[] {
    return d_getFilterOptions();
}

export function checkForUpdate(): boolean {
    return d_checkForUpdate();
}

export function applyUpdate(): void {
    d_applyUpdate();
}

export function getUpdateDiff(): UpdateDiff | null {
    return d_getUpdateDiff();
}

export function getUniqueIdolKey(idol: IdolData, groupName: string): string {
    return d_getUniqueIdolKey(idol, groupName);
}
