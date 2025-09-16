
import React, { useEffect, useState, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import useIdolSorter from './hooks/useIdolSorter';
import { getGroups, getFilterOptions, checkForUpdate, applyUpdate, getUpdateDiff, getUniqueIdolKey } from './services/geminiService';
import { GamePhase, Group, FilterOption, IdolData, FilterSummary, FilterSubOption } from './types';
import { PastSortResult, getHistory, addSortToHistory } from './services/historyService';
import { UpdateDiff } from './services/dataService';
import Loader from './components/Loader';
import IdolCard, { MousePos } from './components/IdolCard';
import FinalRankings from './components/FinalRankings';
import ProgressBar from './components/ProgressBar';
import UndoIcon from './components/icons/UndoIcon';
import TieIcon from './components/icons/TieIcon';
import ControlsTooltip from './components/ControlsTooltip';
import AdminPage from './components/AdminPage';
import InfoIcon from './components/icons/InfoIcon';
import SimpleRankingsList from './components/SimpleRankingsList';
import ListIcon from './components/icons/ListIcon';
import PictureIcon from './components/icons/PictureIcon';
import RestartButton from './components/RestartButton';
import RestartIcon from './components/icons/RestartIcon';
import HistoryIcon from './components/icons/HistoryIcon';
import HistoryPage from './components/HistoryPage';
import PastRankingPage from './components/PastRankingPage';


// --- Helper components for rendering update diff ---
const renderIdolChangeList = (idols: IdolData[], prefix: 'add' | 'remove') => (
  <div className="pl-5 mt-1 space-y-0.5">
    {idols.map(idol => (
      <div key={idol.name} className="flex items-center gap-2 text-sm">
        {prefix === 'add' ? (
          <span className="text-green-500 font-bold">+</span>
        ) : (
          <span className="text-red-500 font-bold">-</span>
        )}
        <span className="text-slate-600">{idol.name}</span>
      </div>
    ))}
  </div>
);

const renderModifiedIdolList = (modifiedIdols: { old: IdolData, new: IdolData }[]) => {
    const changesByDescription: Record<string, string[]> = {};

    modifiedIdols.forEach(({ old, new: newIdol }) => {
        const idolNameForDisplay = newIdol.name;

        // Handle name changes separately as they are always unique and don't need a list of names.
        if (old.name !== newIdol.name) {
            const key = `Name for '${old.name}' updated to '${idolNameForDisplay}'`;
            if (!changesByDescription[key]) {
                changesByDescription[key] = [];
            }
        }
        // Group image updates
        if (old.imageUrl !== newIdol.imageUrl) {
            const key = 'Image updated';
            if (!changesByDescription[key]) {
                changesByDescription[key] = [];
            }
            changesByDescription[key].push(idolNameForDisplay);
        }
        // Group generation updates
        if (old.gen !== newIdol.gen) {
            const key = `Generation updated to ${newIdol.gen}`;
            if (!changesByDescription[key]) {
                changesByDescription[key] = [];
            }
            changesByDescription[key].push(idolNameForDisplay);
        }
    });

    if (Object.keys(changesByDescription).length === 0) {
        return null;
    }

    return (
        <div className="mt-1">
            <ul className="pl-5 mt-1 list-disc text-slate-500 space-y-1.5 text-sm">
                {Object.entries(changesByDescription).map(([description, names]) => (
                    <li key={description}>
                        <span className="text-slate-700">{description}</span>
                        {names.length > 0 && (
                            <span className="text-slate-600 font-medium">: {names.sort().join(', ')}</span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const renderGroupMemberList = (idols: IdolData[]) => (
    <ul className="pl-5 mt-1 list-disc space-y-0.5">
        {idols.map(idol => (
            <li key={idol.name} className="text-base text-slate-700">
                {idol.name}
            </li>
        ))}
    </ul>
);

const getSlateColor = (progress: number) => {
  const p = Math.max(0, Math.min(1, progress));

  // slate-600: hsl(222, 22%, 35%)
  // slate-900: hsl(222, 47%, 11%)
  const start = { h: 222, s: 22, l: 35 };
  const end = { h: 222, s: 47, l: 11 };

  const h = start.h + (end.h - start.h) * p;
  const s = start.s + (end.s - start.s) * p;
  const l = start.l + (end.l - start.l) * p;

  // UNSELECTED: Darker background for better contrast
  const l_bg = l + (95 - l) * 0.85; // ~slate-200/300
  const s_bg = s * 0.5;

  // HOVER on UNSELECTED: Darker background, darker text
  const l_bg_hover = l_bg * 0.93;

  // HOVER on SELECTED: Lighter background
  const l_dark_hover = l * 1.6;

  return {
    background: `hsl(${h}, ${s_bg}%, ${l_bg}%)`,
    backgroundHover: `hsl(${h}, ${s_bg * 1.5}%, ${l_bg_hover}%)`,
    darkBackground: `hsl(${h}, ${s}%, ${l}%)`,
    darkBackgroundHover: `hsl(${h}, ${s}%, ${l_dark_hover}%)`,
    textColor: 'white',
    border: `hsl(${h}, ${s}%, ${l}%)`,
    tag: `hsl(${h}, ${s}%, ${l}%)`,
    lightTextColor: `hsl(222, 15%, 50%)`, // Darker text for unselected buttons (~slate-500)
    // On hover for an unselected button, use the main dark color for the text for high contrast.
    lightTextColorHover: `hsl(${h}, ${s}%, ${l}%)`,
  };
};

// --- Idol Filter Rendering Components ---
interface IdolButtonProps {
    idol: FilterSubOption;
    isSelected: boolean;
    onClick: () => void;
    colors: ReturnType<typeof getSlateColor>;
}

const IdolButton: React.FC<IdolButtonProps> = ({ idol, isSelected, onClick, colors }) => {
    const [isHovered, setIsHovered] = useState(false);

    const style = {
        backgroundColor: isSelected
            ? (isHovered ? colors.darkBackgroundHover : colors.darkBackground)
            : (isHovered ? colors.backgroundHover : colors.background),
        color: isSelected 
            ? colors.textColor 
            : (isHovered ? colors.lightTextColorHover : colors.lightTextColor),
    };

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`px-3 py-1.5 rounded-md cursor-pointer transition-colors duration-200 font-medium text-base`}
            style={style}
        >
            <span className="whitespace-nowrap">{idol.name}</span>
        </div>
    );
};


interface IdolListProps {
    idols: FilterSubOption[];
    selectedSubOptions: Set<string>;
    onToggle: (key: string) => void;
    colors: ReturnType<typeof getSlateColor>;
}

const IdolList: React.FC<IdolListProps> = ({ idols, selectedSubOptions, onToggle, colors }) => {
    const isLargeGroup = idols.length > 12;

    const renderIdol = (idol: FilterSubOption) => (
        <IdolButton
            key={idol.key}
            idol={idol}
            isSelected={selectedSubOptions.has(idol.key)}
            onClick={() => onToggle(idol.key)}
            colors={colors}
        />
    );

    if (isLargeGroup) {
        const row1Count = Math.ceil(idols.length / 2);
        const row1Idols = idols.slice(0, row1Count);
        const row2Idols = idols.slice(row1Count);

        return (
            <div className="flex flex-col gap-2 items-center">
                <div className="flex justify-center gap-2 flex-wrap">
                    {row1Idols.map(renderIdol)}
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                    {row2Idols.map(renderIdol)}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap justify-center gap-2">
            {idols.map(renderIdol)}
        </div>
    );
};

// Button component for Group and Generation filters
interface GroupGenButtonProps {
    isSelected: boolean;
    onClick: () => void;
    colors: ReturnType<typeof getSlateColor>;
    children: React.ReactNode;
    'data-group-key'?: string;
}

const GroupGenButton: React.FC<GroupGenButtonProps> = ({ isSelected, onClick, colors, children, ...rest }) => {
    const [isHovered, setIsHovered] = useState(false);
    const style = {
        backgroundColor: isSelected
            ? (isHovered ? colors.darkBackgroundHover : colors.darkBackground)
            : (isHovered ? colors.backgroundHover : colors.background),
        color: isSelected 
            ? colors.textColor 
            : (isHovered ? colors.lightTextColorHover : colors.lightTextColor),
    };

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 shadow-sm font-medium whitespace-nowrap text-base`}
            style={style}
            {...rest}
        >
            {children}
        </div>
    );
};

// --- LandingPage Component ---
interface LandingPageProps {
  groups: Group[];
  filterOptions: FilterOption[];
  onStart: (selectedGroupsData: Group[], filterSummary: FilterSummary) => void;
  onNavigate: (path: string) => void;
  isUpdateAvailable: boolean;
  onUpdate: () => void;
  updateDiff: UpdateDiff | null;
}

const LandingPage: React.FC<LandingPageProps> = ({ groups, filterOptions, onStart, onNavigate, isUpdateAvailable, onUpdate, updateDiff }) => {
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  const [activeFilter, setActiveFilter] = useState<string>('group');
  const [idolSearchTerm, setIdolSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<PastSortResult[]>([]);
  
  const groupFilterContainerRef = useRef<HTMLDivElement>(null);
  const [groupColors, setGroupColors] = useState<Record<string, ReturnType<typeof getSlateColor>>>({});
  
  const [updateView, setUpdateView] = useState<'added' | 'fixed' | 'removed'>('added');
  const updateContentRef = useRef<HTMLDivElement>(null);
  const [showScrollGradient, setShowScrollGradient] = useState(false);


  useEffect(() => {
    setHistory(getHistory());
  }, []);
  
  useEffect(() => {
    if (filterOptions.length === 0) return;

    const initialSelections: Record<string, Set<string>> = {};

    filterOptions.forEach(option => {
      // Start with idol filter empty, others full
      if (option.key === 'idol') {
          initialSelections[option.key] = new Set();
      } else {
          const valueKey = option.key === 'group' ? 'name' : 'key';
          initialSelections[option.key] = new Set(option.sub.map(subOption => subOption[valueKey]));
      }
    });

    setSelections(initialSelections);
    setActiveFilter('group');
  }, [filterOptions]);

  useEffect(() => {
    // This effect runs when the component mounts and when updateDiff changes.
    // It determines the best initial tab to show.
    if (updateDiff && !updateDiff.isLegacyUpdate) {
        const { addedGroups, changedGroups } = updateDiff;
        const hasAdditions = addedGroups.length > 0 || changedGroups.some(g => g.addedIdols.length > 0);
        const hasFixes = changedGroups.some(g => g.modifiedIdols.length > 0);
        
        if (hasAdditions) {
            setUpdateView('added');
        } else if (hasFixes) {
            setUpdateView('fixed');
        } else {
            setUpdateView('removed');
        }
    }
  }, [updateDiff]);

  useEffect(() => {
    // This effect manages the visibility of the scroll-to-bottom gradient.
    const contentElement = updateContentRef.current;
    if (!contentElement) return;

    const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = contentElement;
        // Show gradient if not scrolled to the bottom. A 5px buffer is used for safety.
        setShowScrollGradient(scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 5);
    };

    // Check initially and whenever the content might change (e.g., tab switch)
    handleScroll(); 

    contentElement.addEventListener('scroll', handleScroll);
    
    // A ResizeObserver ensures the gradient visibility is correct if the container size changes.
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(contentElement);

    return () => {
        contentElement.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
    };
  }, [updateView]); // Dependency on updateView ensures this re-runs when the tab changes.

  const handleToggleActiveFilter = (filterKey: string) => {
    setActiveFilter(filterKey);
     if (error) setError('');
  };
  
  const handleToggleSubOption = (filterKey: string, value: string) => {
    setSelections(prev => {
        const newSet = new Set(prev[filterKey]);
        if (newSet.has(value)) {
            newSet.delete(value);
        } else {
            newSet.add(value);
        }
        return { ...prev, [filterKey]: newSet };
    });
    if (error) setError('');
  };

  const handleToggleAllSubOptions = (filterKey: string, displayedKeys: string[]) => {
      const currentSelection = selections[filterKey] || new Set();
      const allDisplayedAreSelected = displayedKeys.length > 0 && displayedKeys.every(key => currentSelection.has(key));

      if (allDisplayedAreSelected) {
          // Deselect all displayed
          setSelections(prev => {
              const newSet = new Set(prev[filterKey]);
              displayedKeys.forEach(key => newSet.delete(key));
              return { ...prev, [filterKey]: newSet };
          });
      } else {
          // Select all displayed
          setSelections(prev => {
              const newSet = new Set(prev[filterKey]);
              displayedKeys.forEach(key => newSet.add(key));
              return { ...prev, [filterKey]: newSet };
          });
      }
  };
  
  const getSelectedIdolCount = useCallback(() => {
    if (!groups.length || !activeFilter || Object.keys(selections).length === 0) return 0;

    switch(activeFilter) {
        case 'group': {
            const selectedGroupNames = selections['group'] || new Set();
            if (selectedGroupNames.size === 0) return 0;
            return groups
              .filter(g => selectedGroupNames.has(g.name))
              .reduce((acc, g) => acc + g.idols.length, 0);
        }
        case 'gen': {
            const selectedGenKeys = selections['gen'] || new Set();
            if (selectedGenKeys.size === 0) return 0;
            return groups
              .reduce((acc, g) => acc + g.idols.filter(i => selectedGenKeys.has(i.gen)).length, 0);
        }
        case 'idol': {
            return selections['idol']?.size || 0;
        }
        default:
            return 0;
    }
  }, [groups, activeFilter, selections]);


  const idolCount = getSelectedIdolCount();

  const handleStartClick = () => {
    if (idolCount < 2) {
        setError('Please select options that result in at least 2 idols.');
        return;
    }
    
    let idolsToStartWith: IdolData[] = [];
    
    // Create a map from each idol object to its parent group object for efficient lookup
    const idolToGroupMap = new Map<IdolData, Group>();
    groups.forEach(group => {
        group.idols.forEach(idol => {
            idolToGroupMap.set(idol, group);
        });
    });

    switch(activeFilter) {
        case 'group': {
            const selectedGroupNames = selections['group'] || new Set();
            idolsToStartWith = groups
                .filter(g => selectedGroupNames.has(g.name))
                .flatMap(g => g.idols);
            break;
        }
        case 'gen': {
            const selectedGenKeys = selections['gen'] || new Set();
            idolsToStartWith = groups.flatMap(g => g.idols.filter(i => selectedGenKeys.has(i.gen)));
            break;
        }
        case 'idol': {
            const allIdolsMap = new Map<string, IdolData>();
            groups.forEach(group => {
                group.idols.forEach(idol => {
                    allIdolsMap.set(getUniqueIdolKey(idol, group.name), idol);
                });
            });

            const selectedIdolKeys = selections['idol'] || new Set();
            selectedIdolKeys.forEach(key => {
                if (allIdolsMap.has(key)) {
                    idolsToStartWith.push(allIdolsMap.get(key)!);
                }
            });
            break;
        }
    }

    // Reconstruct the `Group[]` structure expected by the sorter hook
    const selectedGroupsDataMap = new Map<string, Group>();
    idolsToStartWith.forEach(idol => {
        const group = idolToGroupMap.get(idol);
        if (group) {
            if (!selectedGroupsDataMap.has(group.key)) {
                selectedGroupsDataMap.set(group.key, { ...group, idols: [] });
            }
            selectedGroupsDataMap.get(group.key)!.idols.push(idol);
        }
    });
    
    const finalGroupsData = Array.from(selectedGroupsDataMap.values());
    
    // Build FilterSummary for the results page
    let summaryGroups: string[] = ['All Groups'];
    let summaryGens: string[] = ['All Gens'];

    if (activeFilter === 'group') {
        const groupOption = filterOptions.find(o => o.key === 'group')!;
        const selectedGroupNames = Array.from(selections['group']);
        summaryGroups = groupOption.sub.filter(s => selectedGroupNames.includes(s.name)).map(s => s.name);
    } else if (activeFilter === 'gen') {
        const genOption = filterOptions.find(o => o.key === 'gen')!;
        const selectedGenKeys = Array.from(selections['gen']);
        summaryGens = genOption.sub.filter(s => selectedGenKeys.includes(s.key)).map(s => s.name);
    } else if (activeFilter === 'idol') {
        summaryGroups = ['Custom Selection'];
        summaryGens = ['Custom Selection'];
    }

    const filterSummary: FilterSummary = {
        groups: summaryGroups,
        gens: summaryGens,
        idolCount,
        groupCount: finalGroupsData.length,
    };

    setError('');
    onStart(finalGroupsData, filterSummary);
  };
  
  const renderUpdateDetails = () => {
    if (!updateDiff) {
        return null;
    }
    
    const { addedGroups, removedGroups, changedGroups, isLegacyUpdate } = updateDiff;

    if (isLegacyUpdate) {
      return (
        <div className="w-full max-w-xl bg-slate-100 border border-slate-200 rounded-lg p-6 text-center max-h-[50vh] overflow-y-auto shadow-inner">
          <h3 className="text-xl font-bold text-slate-800 text-center mb-4">Update Required</h3>
          <p className="text-slate-700">The application data needs to be updated to the latest format to continue.</p>
        </div>
      );
    }
    
    const hasAdditions = addedGroups.length > 0 || changedGroups.some(g => g.addedIdols.length > 0);
    const hasFixes = changedGroups.some(g => g.modifiedIdols.length > 0);
    const hasRemovals = removedGroups.length > 0 || changedGroups.some(g => g.removedIdols.length > 0);
    
    const renderContent = () => {
      switch(updateView) {
        case 'added':
          return (
            <div className="space-y-4">
              {addedGroups.map(({ group }) => (
                <div key={group.key}>
                  <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-500 font-bold text-lg">+</span>
                      <span className="font-bold text-lg text-slate-800">{group.name}</span>
                      <span className="text-xs font-semibold text-white bg-green-500 px-2 py-0.5 rounded-full">NEW GROUP</span>
                  </div>
                  {renderGroupMemberList(group.idols)}
                </div>
              ))}
              {changedGroups.filter(g => g.addedIdols.length > 0).map(({ groupName, addedIdols }) => (
                <div key={`${groupName}-added`}>
                  <p className="font-bold text-lg text-slate-800">{groupName}</p>
                  {renderIdolChangeList(addedIdols, 'add')}
                </div>
              ))}
            </div>
          );
        case 'fixed':
          return (
            <div className="space-y-3">
              {changedGroups.filter(g => g.modifiedIdols.length > 0).map(({ groupName, modifiedIdols }) => (
                <div key={`${groupName}-modified`}>
                  <p className="font-bold text-lg text-slate-800">{groupName}</p>
                  {renderModifiedIdolList(modifiedIdols)}
                </div>
              ))}
            </div>
          );
        case 'removed':
           return (
            <div className="space-y-4">
              {removedGroups.map(({ group }) => (
                <div key={group.key}>
                  <div className="flex items-center gap-2 mb-1">
                      <span className="text-red-500 font-bold text-lg">-</span>
                      <span className="font-bold text-lg text-slate-800">{group.name}</span>
                      <span className="text-xs font-semibold text-white bg-red-500 px-2 py-0.5 rounded-full">REMOVED GROUP</span>
                  </div>
                  {renderGroupMemberList(group.idols)}
                </div>
              ))}
              {changedGroups.filter(g => g.removedIdols.length > 0).map(({ groupName, removedIdols }) => (
                <div key={`${groupName}-removed`}>
                  <p className="font-bold text-lg text-slate-800">{groupName}</p>
                  {renderIdolChangeList(removedIdols, 'remove')}
                </div>
              ))}
            </div>
          );
        default: return null;
      }
    };
    
    const noContentForView = 
      (updateView === 'added' && !hasAdditions) ||
      (updateView === 'fixed' && !hasFixes) ||
      (updateView === 'removed' && !hasRemovals);

    const getButtonClass = (view: typeof updateView) => {
      const base = 'px-4 py-1.5 font-semibold rounded-md transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed';
      const colors = {
        added: 'bg-green-100 text-green-800 hover:bg-green-200 disabled:hover:bg-green-100',
        activeAdded: 'bg-green-600 text-white ring-2 ring-offset-1 ring-green-600',
        fixed: 'bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:hover:bg-blue-100',
        activeFixed: 'bg-blue-600 text-white ring-2 ring-offset-1 ring-blue-600',
        removed: 'bg-red-100 text-red-800 hover:bg-red-200 disabled:hover:bg-red-100',
        activeRemoved: 'bg-red-600 text-white ring-2 ring-offset-1 ring-red-600',
      };
      const key = updateView === view ? `active${view.charAt(0).toUpperCase() + view.slice(1)}` : view;
      return `${base} ${colors[key]}`;
    };

    return (
      <div className="w-full max-w-xl bg-slate-100 border border-slate-200 rounded-lg shadow-inner flex flex-col">
        <div className="p-4 border-b border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 text-center mb-4">Update Summary</h3>
            <div className="flex justify-center gap-2">
                <button onClick={() => setUpdateView('added')} disabled={!hasAdditions} className={getButtonClass('added')}>Added</button>
                <button onClick={() => setUpdateView('fixed')} disabled={!hasFixes} className={getButtonClass('fixed')}>Fixed</button>
                <button onClick={() => setUpdateView('removed')} disabled={!hasRemovals} className={getButtonClass('removed')}>Removed</button>
            </div>
        </div>
        <div className="relative">
            <div
                ref={updateContentRef}
                className="p-6 text-left max-h-[40vh] overflow-y-auto hide-scrollbar"
            >
                {noContentForView ? (
                    <p className="text-center text-slate-500">No changes in this category.</p>
                ) : (
                    renderContent()
                )}
            </div>
            <div 
                className={`absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none transition-opacity duration-300 ${showScrollGradient ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden="true"
            />
        </div>
      </div>
    );
  };
  
    // Memoized data for the Idol Filter
    const groupedIdolsForFilter = useMemo(() => {
        const result: Record<string, { name: string, idols: FilterSubOption[] }> = {};
        if (!groups) return result;

        groups.forEach(group => {
            const groupSubOptions = group.idols.map(idol => ({
                name: idol.name,
                key: getUniqueIdolKey(idol, group.name),
            })).sort((a,b) => a.name.localeCompare(b.name));
            result[group.key] = { name: group.name, idols: groupSubOptions };
        });
        return result;
    }, [groups]);

    const filteredIdolGroups = useMemo(() => {
        if (!idolSearchTerm) return groupedIdolsForFilter;
        
        const lowercasedFilter = idolSearchTerm.toLowerCase();
        const result: Record<string, { name: string, idols: FilterSubOption[] }> = {};

        Object.entries(groupedIdolsForFilter).forEach(([groupKey, groupData]) => {
            // If the group name itself is a partial or full match, show the entire group.
            if (groupData.name.toLowerCase().includes(lowercasedFilter)) {
                result[groupKey] = groupData;
            } else {
                // Otherwise, filter for idols whose names match.
                const filteredIdols = groupData.idols.filter(idol => 
                    idol.name.toLowerCase().includes(lowercasedFilter)
                );
                // Only include the group if it has matching idols.
                if (filteredIdols.length > 0) {
                    result[groupKey] = { ...groupData, idols: filteredIdols };
                }
            }
        });
        return result;
    }, [idolSearchTerm, groupedIdolsForFilter]);

  
  // Diagonal color calculation for "Filter by Group"
  const calculateGroupColors = useCallback(() => {
    const container = groupFilterContainerRef.current;
    if (!container || container.children.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Array.from(container.children).forEach(child => {
        if (!child.hasAttribute('data-group-key')) return;
        const rect = child.getBoundingClientRect();
        minX = Math.min(minX, rect.left);
        minY = Math.min(minY, rect.top);
        maxX = Math.max(maxX, rect.right);
        maxY = Math.max(maxY, rect.bottom);
    });

    const diagonalWidth = maxX - minX;
    const diagonalHeight = maxY - minY;

    if (diagonalWidth <= 0 || diagonalHeight <= 0) return;

    const newColors: Record<string, ReturnType<typeof getSlateColor>> = {};
    Array.from(container.children).forEach(child => {
        const key = child.getAttribute('data-group-key');
        if (!key) return;
        
        const rect = child.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const normX = (centerX - minX) / diagonalWidth;
        const normY = (centerY - minY) / diagonalHeight;

        const diagonalProgress = (normX + normY) / 2;
        
        newColors[key] = getSlateColor(diagonalProgress);
    });
    
    setGroupColors(newColors);
  }, []);

  useLayoutEffect(() => {
    const container = groupFilterContainerRef.current;
    if (!container) return;

    calculateGroupColors();
    const observer = new ResizeObserver(calculateGroupColors);
    observer.observe(container);
    return () => observer.disconnect();
  }, [calculateGroupColors, filterOptions, selections, activeFilter]); // Re-calc when options change

  if (filterOptions.length === 0) {
    return <Loader message="Loading options..." />;
  }

  return (
    <div className="w-full max-w-10xl mx-auto px-4 animate-card-enter relative">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-800">Female K-Pop Idol Sorter</h1>
        <p className="mt-4 text-lg text-slate-600">Select your filter type, then choose which idols to include.</p>
      </div>

      {isUpdateAvailable && (
        <div className="w-full max-w-4xl mx-auto mb-12 flex flex-col items-center gap-6">
            <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 w-full rounded-md shadow" role="alert">
              <p className="font-bold">Update Required</p>
              <p>A new version of the idol data is available. Please update to continue.</p>
            </div>
            {renderUpdateDetails()}
        </div>
      )}

      <div className="mt-10 text-center">
        <div className="flex flex-col items-center gap-4">
          {isUpdateAvailable ? (
              <button
                  onClick={onUpdate}
                  className="bg-orange-500 text-white font-bold py-4 px-10 rounded-lg text-xl hover:bg-orange-400 transition-colors shadow-lg"
              >
                  Update and Refresh
              </button>
          ) : (
              <button
                onClick={handleStartClick}
                className="bg-slate-700 text-white font-bold py-4 px-10 rounded-lg text-xl hover:bg-slate-600 shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed"
                disabled={idolCount < 2}
              >
                Start Sorting ({idolCount} idols)
              </button>
          )}

          <button
            onClick={() => history.length > 0 && onNavigate('/history')}
            disabled={history.length === 0}
            className="inline-flex items-center gap-3 text-lg font-semibold text-white bg-slate-600 hover:bg-slate-500 transition-all py-3 px-6 rounded-lg shadow-sm disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
            title={history.length === 0 ? "No history available yet" : "View past rankings"}
          >
            <HistoryIcon className="w-6 h-6" />
            View History ({history.length})
          </button>
        </div>
      </div>

      <div className={`transition-opacity duration-300 ${isUpdateAvailable ? 'opacity-50 pointer-events-none' : ''}`}>
        {filterOptions.map((option) => {
            const isFilterActive = activeFilter === option.key;
            const selectedSubOptions = selections[option.key] || new Set();

            let subOptionsToDisplay, displayedKeys: string[], allDisplayedAreSelected: boolean;
            const groupEntriesForIdolFilter = Object.entries(filteredIdolGroups).sort(([, a], [, b]) => a.name.localeCompare(b.name));

            if (option.key === 'idol') {
                const soloistGroup = groupEntriesForIdolFilter.find(([key]) => key === 'soloist');
                const otherGroups = groupEntriesForIdolFilter.filter(([key]) => key !== 'soloist');
                displayedKeys = (soloistGroup ? soloistGroup[1].idols : []).concat(otherGroups.flatMap(([, groupData]) => groupData.idols)).map(i => i.key);
                allDisplayedAreSelected = displayedKeys.length > 0 && displayedKeys.every(key => selectedSubOptions.has(key));
            } else {
                subOptionsToDisplay = option.sub;
                const valueKey = option.key === 'group' ? 'name' : 'key';
                displayedKeys = subOptionsToDisplay.map(s => s[valueKey]);
                allDisplayedAreSelected = displayedKeys.length > 0 && displayedKeys.every(key => selectedSubOptions.has(key));
            }
            
            return (
              <div 
                key={option.key} 
                className={`group mt-12 relative border-2 rounded-xl p-6 pt-10 shadow-sm transition-colors duration-300 bg-slate-100 ${isFilterActive ? 'border-slate-600' : 'border-slate-300 cursor-pointer hover:border-slate-400'}`}
                onClick={() => !isFilterActive && handleToggleActiveFilter(option.key)}
              >
                  <div
                      className={`absolute -top-5 left-4 bg-slate-300 text-white font-bold px-4 py-1.5 rounded-full text-xl shadow flex items-center gap-2 transition-colors cursor-help ${isFilterActive ? 'bg-slate-700' : 'group-hover:bg-slate-400'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActiveFilter(option.key);
                      }}
                      title={option.tooltip}
                  >
                      {option.name}
                      <InfoIcon className="w-5 h-5" />
                  </div>
                  
                  <div 
                    className={`transition-opacity duration-300 ${!isFilterActive ? 'opacity-50 pointer-events-none' : ''}`}
                    style={!isFilterActive ? { cursor: 'pointer' } : {}}
                  >
                    <div className={`transition-opacity duration-300 ${!isFilterActive ? 'group-hover:opacity-100' : ''}`}>
                      {option.key === 'idol' && (
                        <div className="my-4 flex justify-center">
                            <input 
                              type="text"
                              placeholder="Search for an idol or group..."
                              value={idolSearchTerm}
                              onChange={(e) => setIdolSearchTerm(e.target.value)}
                              className="w-full max-w-md p-3 border border-slate-300 rounded-lg shadow-sm focus:ring-slate-500 focus:border-slate-500 bg-white"
                              onClick={e => e.stopPropagation()}
                            />
                        </div>
                      )}
                      <div className="mb-6 flex justify-end">
                          <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAllSubOptions(option.key, displayedKeys);
                            }}
                            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                          >
                              {allDisplayedAreSelected ? `Deselect All Shown` : 'Select All Shown'} ({displayedKeys.length})
                          </button>
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      {option.key === 'idol' ? (
                        (() => {
                            const soloistGroupEntry = groupEntriesForIdolFilter.find(([key]) => key === 'soloist');
                            const otherGroupEntries = groupEntriesForIdolFilter.filter(([key]) => key !== 'soloist');

                            const renderIdolGroup = ([groupKey, groupData], colors, extraClass = "") => {
                                if (groupData.idols.length === 0) return null;
                                const sortedIdols = groupData.idols;
                                return (
                                    <div
                                        key={groupKey}
                                        className={`relative border-2 rounded-xl p-4 pt-8 mb-4 shadow-sm inline-block align-top ${extraClass}`}
                                        style={{ borderColor: colors.border, backgroundColor: 'white' }}
                                    >
                                        <div
                                            className="absolute -top-4 left-4 min-w-max text-white font-bold px-4 py-1.5 rounded-full text-sm shadow"
                                            style={{ backgroundColor: colors.tag }}
                                        >
                                            {groupData.name}
                                        </div>
                                        <div className="flex flex-col items-center">
                                          <div className="invisible" style={{ height: 0, overflow: 'hidden' }}>
                                                <span className="font-bold text-sm px-4 py-1.5">{groupData.name}</span>
                                            </div>
                                            <IdolList
                                                idols={sortedIdols}
                                                selectedSubOptions={selectedSubOptions}
                                                onToggle={(key) => handleToggleSubOption('idol', key)}
                                                colors={colors}
                                            />
                                        </div>
                                    </div>
                                );
                            };
                            
                            return (
                                <div className="flex flex-wrap justify-center items-start gap-4 w-full mt-4">
                                    {/* Render other groups with a gradient based on their visual order */}
                                    {otherGroupEntries.map(([groupKey, groupData], index) => {
                                        const progress = otherGroupEntries.length > 1 ? index / (otherGroupEntries.length - 1) : 0;
                                        const colors = getSlateColor(progress);
                                        return renderIdolGroup([groupKey, groupData], colors);
                                    })}
                                    
                                    {/* Render separator if soloist exists and there are other groups */}
                                    {soloistGroupEntry && otherGroupEntries.length > 0 && (
                                        <div className="basis-full h-0 my-4">
                                            <div className="w-4/5 mx-auto border-t-2 border-slate-300"></div>
                                        </div>
                                    )}
                                    
                                    {/* Render Soloist card, now as a regular flex item */}
                                    {soloistGroupEntry && renderIdolGroup(soloistGroupEntry, getSlateColor(1))}
                                </div>
                            );
                        })()
                      ) : option.key === 'group' ? (
                        (() => {
                            const soloistOption = subOptionsToDisplay.find(o => o.key === 'soloist');
                            const otherOptions = subOptionsToDisplay.filter(o => o.key !== 'soloist');
                            
                            return (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="flex flex-wrap justify-center gap-3" ref={groupFilterContainerRef}>
                                        {otherOptions.map((subOption, subIndex) => {
                                            const isSelected = selectedSubOptions?.has(subOption.name) ?? false;
                                            const colors = groupColors[subOption.key] || getSlateColor(otherOptions.length > 1 ? subIndex / (otherOptions.length - 1) : 0);
                                            return (
                                                <GroupGenButton
                                                    key={subOption.key}
                                                    data-group-key={subOption.key}
                                                    onClick={() => handleToggleSubOption('group', subOption.name)}
                                                    isSelected={isSelected}
                                                    colors={colors}
                                                >
                                                    {subOption.name}
                                                </GroupGenButton>
                                            );
                                        })}
                                    </div>

                                    {soloistOption && (
                                        <>
                                            <div className="w-full max-w-lg border-t border-slate-300 my-2"></div>
                                            {(() => {
                                                const isSelected = selectedSubOptions?.has(soloistOption.name) ?? false;
                                                const colors = getSlateColor(1); // Soloist is visually last, so give it the last color.
                                                return (
                                                    <GroupGenButton
                                                        key={soloistOption.key}
                                                        data-group-key={soloistOption.key}
                                                        onClick={() => handleToggleSubOption('group', soloistOption.name)}
                                                        isSelected={isSelected}
                                                        colors={colors}
                                                    >
                                                        {soloistOption.name}
                                                    </GroupGenButton>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            )
                        })()
                      ) : (
                        <div className="flex flex-wrap justify-center gap-3">
                            {subOptionsToDisplay.map((subOption, subIndex) => {
                                const valueKey = 'key'; // For 'gen'
                                const isSelected = selectedSubOptions?.has(subOption[valueKey]) ?? false;
                                const progress = subOptionsToDisplay.length > 1 ? subIndex / (subOptionsToDisplay.length - 1) : 0;
                                const colors = getSlateColor(progress);
                                
                                return (
                                    <GroupGenButton
                                        key={subOption.key}
                                        onClick={() => handleToggleSubOption(option.key, subOption[valueKey])}
                                        isSelected={isSelected}
                                        colors={colors}
                                    >
                                        {subOption.name}
                                    </GroupGenButton>
                                );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            );
        })}
      </div>


      {error && <p className="text-center text-red-500 mt-6 font-semibold">{error}</p>}
    </div>
  );
};


// --- Main App Component ---
const App: React.FC = () => {
  const getRoute = useCallback(() => window.location.hash.substring(1) || '/', []);
  const [route, setRoute] = useState(getRoute());
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [updateDiff, setUpdateDiff] = useState<UpdateDiff | null>(null);

  // Disable browser's automatic scroll restoration to handle scrolling manually.
  useEffect(() => {
    if (history.scrollRestoration) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [getRoute]);

  // Scroll to the top of the page whenever the route changes.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const navigate = useCallback((path: string) => {
    // If path does not start with #, add it.
    const finalPath = path.startsWith('/') ? path : `/${path}`;
    if (getRoute() === finalPath) return;
    window.location.hash = finalPath;
  }, [getRoute]);


  useEffect(() => {
    if (route !== '/admin') {
      const updateIsNeeded = checkForUpdate();
      setIsUpdateAvailable(updateIsNeeded);

      if (updateIsNeeded) {
        const diff = getUpdateDiff();
        setUpdateDiff(diff);
      } else {
        setUpdateDiff(null);
      }

      setAllGroups(getGroups());
      setFilterOptions(getFilterOptions());
    }
  }, [route]);
  
  const {
    phase,
    matchup,
    progress,
    rankedList,
    loadingMessage,
    startSorter,
    handleSelect,
    handleTie,
    handleUndo,
    canUndo,
    handleRestart,
    comparisonNumber,
    comparisonsMade,
    filterSummary,
  } = useIdolSorter();

  const [hasSavedCurrentSort, setHasSavedCurrentSort] = useState(true);

  // Effect to save a sort result to history when it's finished.
  useEffect(() => {
    if (phase === GamePhase.FINISHED && rankedList && !hasSavedCurrentSort && filterSummary) {
      const result: PastSortResult = {
        id: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        rankedList,
        comparisonsMade,
        filterSummary,
      };
      addSortToHistory(result);
      setHasSavedCurrentSort(true);
    }
  }, [phase, rankedList, comparisonsMade, filterSummary, hasSavedCurrentSort]);

  // Add beforeunload listener to inform user their progress is saved when playing.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // The Admin page has its own separate check for *unsaved* changes.
      // This message is only for the sorting game itself.
      if (phase === GamePhase.PLAYING) {
        const message = "Your progress is automatically saved, so you can pick up right where you left off. Are you sure you want to exit?";
        event.preventDefault();
        event.returnValue = message; // Required for modern browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [phase]);

  const [animateChoice, setAnimateChoice] = useState<'left' | 'right' | 'tie' | null>(null);
  const [undoTrigger, setUndoTrigger] = useState(false);
  const [mousePos, setMousePos] = useState<MousePos>({ x: 0, y: 0 });
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  
  const [displayComparisonNumber, setDisplayComparisonNumber] = useState(comparisonNumber);
  const [numberAnimationClass, setNumberAnimationClass] = useState('animate-card-enter');
  
  // State for hold-to-restart
  const [isHoldingRestart, setIsHoldingRestart] = useState(false);
  const [restartProgress, setRestartProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const HOLD_DURATION = 2000; // 2 seconds

  useEffect(() => {
    // This effect handles the "enter" animation for the comparison number.
    // It triggers when a new matchup is ready (i.e., not during an exit animation).
    if (!animateChoice && !undoTrigger) {
      setDisplayComparisonNumber(comparisonNumber);
      setNumberAnimationClass('animate-number-enter');
    }
  }, [comparisonNumber, animateChoice, undoTrigger]);


  const handleStart = useCallback((selectedGroupsData: Group[], filterSummary: FilterSummary) => {
    if (startSorter) {
      setHasSavedCurrentSort(false);
      startSorter(selectedGroupsData, filterSummary);
    }
  }, [startSorter]);
  
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    const handleMouseLeave = () => {
      setMousePos({ x: -1, y: -1 });
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const localHandleSelect = useCallback((winnerId: number) => {
    if (animateChoice || undoTrigger || !matchup) return;
    setNumberAnimationClass('animate-number-exit');
    setAnimateChoice(winnerId === matchup[0].id ? 'left' : 'right');
  }, [animateChoice, undoTrigger, matchup]);

  const localHandleTie = useCallback(() => {
    if (animateChoice || undoTrigger || !matchup) return;
    setNumberAnimationClass('animate-number-exit');
    setAnimateChoice('tie');
  }, [animateChoice, undoTrigger, matchup]);

  useEffect(() => {
    if (animateChoice && matchup) {
      const DURATION = 500; // Match the longest animation (winner)
      const timer = setTimeout(() => {
        if (animateChoice === 'left') {
          handleSelect(matchup[0].id);
        } else if (animateChoice === 'right') {
          handleSelect(matchup[1].id);
        } else if (animateChoice === 'tie') {
          handleTie();
        }
        setAnimateChoice(null);
      }, DURATION); // Must match CSS animation duration

      return () => clearTimeout(timer);
    }
  }, [animateChoice, matchup, handleSelect, handleTie]);

  const localHandleUndo = useCallback(() => {
    if (!canUndo || !!animateChoice || undoTrigger) return;
    setNumberAnimationClass('animate-number-exit');
    setUndoTrigger(true);
  }, [canUndo, animateChoice, undoTrigger]);

  useEffect(() => {
    if (undoTrigger) {
      const timer = setTimeout(() => {
        handleUndo();
        setUndoTrigger(false);
      }, 300); // Must match CSS animation duration
      return () => clearTimeout(timer);
    }
  }, [undoTrigger, handleUndo]);

  const triggerRestart = useCallback(() => {
    if (isRestarting || !!animateChoice || undoTrigger) return;
    setIsHoldingRestart(false);
    setRestartProgress(0);
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    setIsRestarting(true);
}, [isRestarting, animateChoice, undoTrigger]);

  const startHoldRestart = useCallback((e?: React.MouseEvent<HTMLDivElement>) => {
      if (isRestarting || !!animateChoice || undoTrigger) return;
      setIsHoldingRestart(true);
  }, [isRestarting, animateChoice, undoTrigger]);

  const cancelHoldRestart = useCallback((e?: React.MouseEvent<HTMLDivElement>) => {
      // If the event comes from a mouse action, blur the button.
      // This prevents the focus outline from sticking after a click.
      if (e?.currentTarget && (e.type === 'mouseup' || e.type === 'mouseleave')) {
        e.currentTarget.blur();
      }
      setIsHoldingRestart(false);
  }, []);
  
  useEffect(() => {
    // If we're not holding and progress is zero, there's nothing to do.
    if (!isHoldingRestart && restartProgress === 0) {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        return;
    }

    let lastFrameTime = performance.now();

    const tick = () => {
        const now = performance.now();
        const delta = now - lastFrameTime;
        lastFrameTime = now;
        
        setRestartProgress(prevProgress => {
            let newProgress = prevProgress;

            if (isHoldingRestart) {
                // Fill up the progress bar
                newProgress = prevProgress + (delta / HOLD_DURATION);
            } else {
                // Decay progress. Slower at high percents, faster at low percents (ease-in).
                const decayConstant = 4; // Controls overall speed.
                // The (1.1 - prevProgress) term makes it slow when prevProgress is near 1.
                newProgress = prevProgress - ((1.1 - prevProgress) * decayConstant * (delta / 1000));
            }

            // Clamp progress and handle end conditions
            if (newProgress >= 1) {
                triggerRestart();
                return 0; // Reset after triggering
            }

            if (newProgress < 0.001) {
                return 0; // Snap to zero when very small
            }

            return newProgress;
        });

        // Continue the loop if there's still work to do
        animationFrameRef.current = requestAnimationFrame(tick);
    };

    // Start the animation loop, making sure to cancel any previous one
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(tick);

    // Cleanup function: cancel the animation frame when the effect re-runs or component unmounts
    return () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    };
  }, [isHoldingRestart, triggerRestart]);


  useEffect(() => {
    if (isRestarting) {
      const timer = setTimeout(() => {
        handleRestart();
        setIsRestarting(false);
        setRestartKey(prev => prev + 1);
        setViewMode('cards'); // Reset to card view on restart
      }, 400); // Duration of the restart-exit animation
      return () => clearTimeout(timer);
    }
  }, [isRestarting, handleRestart]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (route.startsWith('/admin') || route.startsWith('/history')) return;

        if (e.key === 'Tab') {
          // Prevent default browser behavior (cycling through elements) and stop the event from bubbling.
          e.preventDefault();
          e.stopPropagation();
          if (e.repeat) return;

          if (phase === GamePhase.FINISHED) {
            triggerRestart();
          } else {
            startHoldRestart();
          }
          return;
        }
        
        if (e.repeat) return;
        const key = e.key.toLowerCase();
  
        if (key === 'arrowup' || key === 'w') {
          localHandleUndo();
          return;
        }
  
        if (phase === GamePhase.PLAYING && matchup) {
          switch (key) {
            case 'arrowleft':
            case 'a':
              localHandleSelect(matchup[0].id);
              break;
            case 'arrowright':
            case 'd':
              localHandleSelect(matchup[1].id);
              break;
            case 'arrowdown':
            case 's':
              localHandleTie();
              break;
          }
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (route.startsWith('/admin') || route.startsWith('/history')) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            if (phase !== GamePhase.FINISHED) {
              cancelHoldRestart();
            }
        }
    };
    
      const handleBlur = () => {
        if (route.startsWith('/admin') || route.startsWith('/history')) return;

        // If the window loses focus, cancel any hold action.
        cancelHoldRestart();
      };
  
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('blur', handleBlur);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('blur', handleBlur);
      };
    }, [phase, matchup, localHandleSelect, localHandleTie, localHandleUndo, startHoldRestart, cancelHoldRestart, triggerRestart, route]);

  const renderPageContent = () => {
    if (route === '/history') {
      return <HistoryPage navigate={navigate} />;
    }
  
    if (route.startsWith('/history/')) {
      const id = route.split('/')[2];
      return <PastRankingPage id={id} navigate={navigate} mousePos={mousePos} />;
    }

    switch (phase) {
      case GamePhase.SETUP:
        return <LandingPage
          groups={allGroups}
          filterOptions={filterOptions}
          onStart={handleStart}
          onNavigate={navigate}
          isUpdateAvailable={isUpdateAvailable}
          onUpdate={() => {
            applyUpdate();
            navigate('/');
          }}
          updateDiff={updateDiff}
        />;

      case GamePhase.LOADING:
        return <Loader message={loadingMessage} />;
      
      case GamePhase.PLAYING:
        if (!matchup) return <Loader message="Creating matchup..." />;
        
        const getAnimationClass = (side: 'left' | 'right') => {
          if (undoTrigger) return 'animate-card-exit-undo';
          if (!animateChoice) return 'animate-card-enter';
          if (animateChoice === 'tie') return 'animate-card-exit-tie';
          if (animateChoice === side) return 'animate-card-exit-winner';
          return 'animate-card-exit-loser';
        };

        return (
          <div key={restartKey} className={`flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 xl:gap-24 w-full h-full ${isRestarting ? 'animate-restart-exit' : ''}`}>
            <div className="w-full max-w-2xl">
                <IdolCard
                  idol={matchup[0]}
                  onChoose={() => localHandleSelect(matchup[0].id)}
                  mousePos={mousePos}
                  isInteractive={!animateChoice && !undoTrigger}
                  containerClassName={getAnimationClass('left')}
                  animationStagger={0}
                />
            </div>

            <div className="flex flex-col items-center gap-4 my-4 md:my-0">
                <div className="mb-24 p-3 md:p-4 rounded-full text-slate-500 transition-colors">
                  <span className={`text-3xl tabular-nums inline-block ${numberAnimationClass}`}>
                    {(displayComparisonNumber)}
                  </span>
                </div>                 
                <button
                    onClick={localHandleUndo}
                    disabled={!canUndo || !!animateChoice || undoTrigger}
                    className="w-[3.25rem] h-[3.25rem] md:w-[4.25rem] md:h-[4.25rem] flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed transition-colors"
                    aria-label="Undo last choice (Up Arrow / W)"
                >
                    <UndoIcon className="w-6 h-6 md:w-8 md:h-8" />
                </button>
                <button
                    onClick={localHandleTie}
                    disabled={!!animateChoice || undoTrigger}
                    className="w-[3.25rem] h-[3.25rem] md:w-[4.25rem] md:h-[4.25rem] flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed transition-colors"
                    aria-label="Tie (Down Arrow / S)"
                >
                    <TieIcon className="w-7 h-7 md:w-9 md:h-9" />
                </button>
                <div className="mt-24">
                  <ControlsTooltip />
                </div>
                <RestartButton
                  progress={restartProgress}
                  isHolding={isHoldingRestart}
                  onMouseDown={startHoldRestart}
                  onMouseUp={cancelHoldRestart}
                  onMouseLeave={cancelHoldRestart}
                  disabled={isRestarting || !!animateChoice || undoTrigger}
                  ariaLabel="Restart Sorter (Hold Tab or Click)"
                  iconClassName="w-5 h-5 md:w-7 md:h-7"
                />
            </div>
            
             <div className="w-full max-w-2xl">
                <IdolCard
                  idol={matchup[1]}
                  onChoose={() => localHandleSelect(matchup[1].id)}
                  mousePos={mousePos}
                  isInteractive={!animateChoice && !undoTrigger}
                  containerClassName={getAnimationClass('right')}
                  animationStagger={0.3}
                />
            </div>
          </div>
        );

      case GamePhase.FINISHED:
        if (!rankedList) return null;
        return (
          <div className={`w-full ${isRestarting ? 'animate-restart-exit' : ''}`}>
             {viewMode === 'cards' ? (
                <FinalRankings key={restartKey} rankedIdols={rankedList} mousePos={mousePos} />
             ) : (
                <SimpleRankingsList rankedIdols={rankedList} />
             )}

            <div className="text-center mt-12 pb-8">
              <p className="text-lg text-slate-600 mb-4">
                These rankings took <span className="font-bold text-slate-800">{comparisonsMade}</span> comparisons.
              </p>
              <div className="flex flex-wrap justify-center items-center gap-6">
                <button
                  onClick={triggerRestart}
                  disabled={isRestarting}
                  className="inline-flex items-center gap-3 text-lg font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-all py-3 px-6 rounded-lg shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  <RestartIcon className="w-6 h-6" />
                  Back to Home
                </button>
                <button
                  onClick={() => setViewMode(prev => prev === 'cards' ? 'list' : 'cards')}
                  className="inline-flex items-center gap-3 text-lg font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-all py-3 px-6 rounded-lg shadow-sm"
                >
                  {viewMode === 'cards' ? (
                    <>
                      <ListIcon className="w-6 h-6" />
                      Display Simple List
                    </>
                  ) : (
                    <>
                      <PictureIcon className="w-6 h-6" />
                      Display Card View
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (route === '/admin') {
    return <AdminPage navigate={navigate} />;
  }
  
  const isCenteredLayout = (phase === GamePhase.PLAYING || phase === GamePhase.LOADING) && !route.startsWith('/history');

  return (
    <div className="min-h-screen w-full flex flex-col items-center relative p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-screen-2xl mx-auto flex-1 flex flex-col">
        {phase === GamePhase.PLAYING && (
          <div className={`w-full mx-auto mb-6 md:mb-8 ${isRestarting ? 'animate-restart-exit' : ''}`}>
            <ProgressBar progress={progress} />
          </div>
        )}
        
        <main className={`flex-1 flex flex-col items-center w-full ${isCenteredLayout ? 'justify-center' : 'justify-start pt-8 sm:pt-12'}`}>
          {renderPageContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
