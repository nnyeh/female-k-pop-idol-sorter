


import React, { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { Group, IdolData } from '../types';
import { loadGroups, saveGroups, checkForUpdate } from '../services/dataService';
import ImageCropperModal from './ImageCropperModal';

// The state for an idol being added or edited, without image file data.
type IdolState = Partial<IdolData>;

type CroppingState = {
    src: string;
    groupKey: string;
} & ({
    target: 'new';
} | {
    target: 'edit';
    idolName: string;
});


const AdminPage: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [initialGroups, setInitialGroups] = useState<Group[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupKey, setNewGroupKey] = useState('');
    const [newIdols, setNewIdols] = useState<{ [key: string]: IdolState }>({});
    
    // States for editing
    const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
    const [editedGroupData, setEditedGroupData] = useState({ name: '', key: '' });
    const [editingIdol, setEditingIdol] = useState<{ groupKey: string; idolName: string } | null>(null);
    const [editedIdolData, setEditedIdolData] = useState<IdolState>({});
    const [addingIdolToGroupKey, setAddingIdolToGroupKey] = useState<string | null>(null);

    // States for cropping
    const [croppingState, setCroppingState] = useState<CroppingState | null>(null);
    
    // States for export modal
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportData, setExportData] = useState('');
    const [copySuccess, setCopySuccess] = useState('');
    const [exportTimestamp, setExportTimestamp] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const updateIsNeeded = checkForUpdate();
        if (updateIsNeeded) {
            if (window.confirm("The source data has been updated. Loading the new data will discard any unsaved changes you have stored locally. Do you want to proceed?")) {
                localStorage.removeItem('kpopSorterData_v1');
                localStorage.removeItem('kpopSorterState_v2');
            }
        }
        const loadedGroups = loadGroups();
        setGroups(loadedGroups);
        setInitialGroups(JSON.parse(JSON.stringify(loadedGroups))); // Deep copy
    }, []);

    // Check for unsaved changes
    useEffect(() => {
        if (initialGroups.length === 0 && groups.length === 0) {
            return; // Avoid flagging as dirty on initial load if data is empty
        }
        const currentGroupsString = JSON.stringify(groups);
        const initialGroupsString = JSON.stringify(initialGroups);
        setIsDirty(currentGroupsString !== initialGroupsString);
    }, [groups, initialGroups]);

    // Add beforeunload listener for tab/browser close
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isDirty) {
                event.preventDefault();
                event.returnValue = ''; // Required for modern browsers
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);
    
    const handleNavigateBack = () => {
        if (isDirty) {
            if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
                navigate('/');
            }
        } else {
            navigate('/');
        }
    };

    const handleSave = useCallback(() => {
        // Cancel any pending edits before saving
        if (editingGroupKey || editingIdol) {
            if (!window.confirm("You have unsaved edits. Are you sure you want to save everything? The current edit will be lost.")) {
                return;
            }
            setEditingGroupKey(null);
            setEditingIdol(null);
        }
        saveGroups(groups);
        setInitialGroups(JSON.parse(JSON.stringify(groups))); // Update initial state to mark as "not dirty"
        alert('Changes saved successfully!');
    }, [groups, editingGroupKey, editingIdol]);

    const handlePrepareExport = () => {
        const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
        const newTimestamp = new Date().toISOString();
        const dotDot = "..";
        const exportString = `import { Group } from '${dotDot}/types';

export const dataTimestamp = '${newTimestamp}';

export const initialIdolGroups: Group[] = ${JSON.stringify(sortedGroups, null, 2)};
`;
        setExportData(exportString);
        setExportTimestamp(newTimestamp);
        setShowExportModal(true);
    };

    const handleCopy = () => {
        if (textareaRef.current) {
            navigator.clipboard.writeText(exportData).then(() => {
                setCopySuccess('Copied!');
                setTimeout(() => setCopySuccess(''), 2000);
            }, () => {
                setCopySuccess('Failed to copy.');
                setTimeout(() => setCopySuccess(''), 2000);
            });
        }
    };


    const handleAddGroup = (e: FormEvent) => {
        e.preventDefault();
        const trimmedName = newGroupName.trim();
        const trimmedKey = newGroupKey.trim();
        if (trimmedName && trimmedKey) {
            setGroups(prevGroups => {
                if (prevGroups.some(g => g.name.toLowerCase() === trimmedName.toLowerCase() || g.key === trimmedKey)) {
                    alert(`Group with name "${trimmedName}" or key "${trimmedKey}" already exists.`);
                    return prevGroups;
                }
                return [...prevGroups, { name: trimmedName, key: trimmedKey, idols: [] }];
            });
            setNewGroupName('');
            setNewGroupKey('');
        }
    };
    
    const handleDeleteGroup = useCallback((groupKeyToDelete: string) => {
        if (window.confirm(`Are you sure you want to delete this group?`)) {
            setGroups(prevGroups => prevGroups.filter(g => g.key !== groupKeyToDelete));
            setNewIdols(prev => {
                const next = { ...prev };
                delete next[groupKeyToDelete];
                return next;
            });
        }
    }, []);

    const handleEditGroupClick = (group: Group) => {
        setEditingGroupKey(group.key);
        setEditedGroupData({ name: group.name, key: group.key });
    };

    const handleCancelEditGroup = () => {
        setEditingGroupKey(null);
        setEditedGroupData({ name: '', key: '' });
    };
    
    const handleSaveGroup = (oldKey: string) => {
        const newName = editedGroupData.name.trim();
        const newKey = editedGroupData.key.trim();
        if (!newName || !newKey) {
            alert("Group name and key cannot be empty.");
            return;
        }

        const originalGroup = groups.find(g => g.key === oldKey);
        if (originalGroup?.name === newName && originalGroup?.key === newKey) {
            handleCancelEditGroup();
            return;
        }
        
        if (groups.some(g => g.key !== oldKey && (g.name.toLowerCase() === newName.toLowerCase() || g.key === newKey))) {
            alert(`Another group with name "${newName}" or key "${newKey}" already exists.`);
            return;
        }

        setGroups(prev => prev.map(g => (g.key === oldKey ? { ...g, name: newName, key: newKey } : g)));
        
        if (oldKey !== newKey) {
            setNewIdols(prev => {
                const next = { ...prev };
                if (next[oldKey]) {
                    next[newKey] = next[oldKey];
                    delete next[oldKey];
                }
                return next;
            });
        }
        handleCancelEditGroup();
    };

    const handleNewIdolChange = (groupKey: string, field: keyof IdolData, value: string) => {
        setNewIdols(prev => ({
            ...prev,
            [groupKey]: {
                ...prev[groupKey],
                [field]: value,
            }
        }));
    };
    
    const handleAddIdol = async (e: FormEvent, groupKey: string) => {
        e.preventDefault();
        const idolState = newIdols[groupKey];
        if (!idolState || !idolState.name?.trim() || !idolState.gen?.trim() || !idolState.imageUrl?.trim()) {
            alert("Please fill out Name, Gen, and provide a processed image URL.");
            return;
        }

        const newIdolData: IdolData = {
            name: idolState.name.trim(),
            imageUrl: idolState.imageUrl.trim(),
            gen: idolState.gen.trim(),
        };

        let idolAdded = false;
        setGroups(prevGroups => prevGroups.map(g => {
            if (g.key === groupKey) {
                if (g.idols.some(i => i.name.toLowerCase() === newIdolData.name.toLowerCase())) {
                    alert(`Idol with name "${newIdolData.name}" already exists in this group.`);
                    return g;
                }
                idolAdded = true;
                return { ...g, idols: [...g.idols, newIdolData].sort((a,b) => a.name.localeCompare(b.name)) };
            }
            return g;
        }));

        if(idolAdded) {
            // Clear form and hide it
            setNewIdols(prev => ({ ...prev, [groupKey]: { name: '', gen: '', imageUrl: '' } }));
            setAddingIdolToGroupKey(null);
        }
    };

    const handleDeleteIdol = useCallback((groupKey: string, idolNameToDelete: string) => {
         if (window.confirm(`Are you sure you want to delete "${idolNameToDelete}" from this group?`)) {
            setGroups(prevGroups => prevGroups.map(g => {
                if (g.key === groupKey) {
                    return { ...g, idols: g.idols.filter(i => i.name !== idolNameToDelete) };
                }
                return g;
            }));
        }
    }, []);

    const handleEditIdolClick = (groupKey: string, idol: IdolData) => {
        setAddingIdolToGroupKey(null); // Close any open "add" forms
        setEditingIdol({ groupKey, idolName: idol.name });
        setEditedIdolData({ ...idol });
    };

    const handleEditedIdolChange = (field: keyof IdolData, value: string | undefined) => {
        setEditedIdolData(prev => {
            const newState = { ...prev };
            if (value === undefined || value === '') {
                delete newState[field];
            } else {
                newState[field] = value;
            }
            return newState;
        });
    };
    
    const handleCancelEditIdol = () => {
        setEditingIdol(null);
        setEditedIdolData({});
    };

    const handleSaveIdol = async (groupKey: string, originalIdolName: string) => {
        if (!editedIdolData.name?.trim() || !editedIdolData.gen?.trim() || !editedIdolData.imageUrl?.trim()) {
            alert('Name, Gen, and Image URL are required.');
            return;
        }
        
        const newName = editedIdolData.name.trim();

        const finalIdolData: IdolData = {
            name: newName,
            imageUrl: editedIdolData.imageUrl.trim(),
            gen: editedIdolData.gen.trim(),
        };

        let updateSucceeded = true;
        setGroups(prev => prev.map(g => {
            if (g.key === groupKey) {
                if (newName.toLowerCase() !== originalIdolName.toLowerCase() && g.idols.some(i => i.name.toLowerCase() === newName.toLowerCase())) {
                    alert(`An idol with the name "${newName}" already exists in this group.`);
                    updateSucceeded = false;
                    return g;
                }
                const newIdols = g.idols.map(i => i.name === originalIdolName ? finalIdolData : i).sort((a,b) => a.name.localeCompare(b.name));
                return { ...g, idols: newIdols };
            }
            return g;
        }));

        if (updateSucceeded) {
            handleCancelEditIdol();
        }
    };
    
    // --- Cropping & Uploading Logic ---
    const handleOpenCropper = (groupKey: string, forIdol: 'new' | { name: string }) => {
        const urlToProcess = forIdol === 'new'
            ? newIdols[groupKey]?.imageUrl
            : editedIdolData.imageUrl;

        if (!urlToProcess || !urlToProcess.trim().startsWith('http')) {
            alert('Please enter a valid image URL starting with http/https.');
            return;
        }
        
        if (forIdol === 'new') {
            setCroppingState({ target: 'new', src: urlToProcess, groupKey });
        } else {
            setCroppingState({ target: 'edit', src: urlToProcess, groupKey, idolName: forIdol.name });
        }
    };
    
    const handleCropUploadComplete = (uploadedUrl: string) => {
        if (!croppingState) return;

        if (croppingState.target === 'new') {
            handleNewIdolChange(croppingState.groupKey, 'imageUrl', uploadedUrl);
        } else if (croppingState.target === 'edit') {
            handleEditedIdolChange('imageUrl', uploadedUrl);
        }
        setCroppingState(null);
    };

    const handleCropCancel = () => {
        setCroppingState(null);
    };


    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {croppingState && (
                    <ImageCropperModal
                        imageUrl={croppingState.src}
                        onCropUploadComplete={handleCropUploadComplete}
                        onCancel={handleCropCancel}
                    />
                )}

                {/* Export Modal */}
                {showExportModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 transition-opacity duration-300">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">Export Data for Source Code</h2>
                                    <p className="text-gray-600 mt-2">Replace the entire content of `services/idolData.ts` with the code below.</p>
                                </div>
                                <button onClick={() => setShowExportModal(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="p-6 flex-1 overflow-y-auto">
                                <textarea ref={textareaRef} readOnly value={exportData} className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 rounded-md resize-none border-gray-700 focus:ring-blue-500 focus:border-blue-500" onClick={e => e.currentTarget.select()} />
                            </div>
                            <div className="p-4 bg-gray-50 border-t flex justify-end items-center gap-4">
                                <span className="text-green-600 font-semibold transition-opacity duration-300">{copySuccess}</span>
                                <button onClick={handleCopy} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors">Copy to Clipboard</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <header className="mb-10 flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">Idol Data Management</h1>
                      <p className="mt-1 text-gray-600">Add, edit, or delete groups and idols. Use the cropping tool for best results.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleNavigateBack} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 font-semibold hover:bg-gray-50 transition">Back to Sorter</button>
                    </div>
                </header>

                {/* Action Buttons */}
                <div className="sticky top-4 sm:top-6 lg:top-8 z-20 mb-8 p-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border flex flex-wrap justify-between items-center gap-4 transition-shadow">
                    <p className={`text-sm font-semibold transition-opacity ${isDirty ? 'opacity-100 text-yellow-600' : 'opacity-0'}`}>You have unsaved changes.</p>
                    <div className="flex gap-3">
                        <button onClick={handlePrepareExport} className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm" title="Export current data">Export for Code</button>
                        <button onClick={handleSave} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-blue-300 disabled:cursor-not-allowed" disabled={!isDirty}>Save Changes</button>
                    </div>
                </div>

                {/* Add Group Form */}
                <div className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">Add New Group</h2>
                    <form onSubmit={handleAddGroup} className="bg-white p-6 rounded-lg shadow-sm border grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group Name (e.g., BLACKPINK)" className="md:col-span-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" required />
                        <input type="text" value={newGroupKey} onChange={e => setNewGroupKey(e.target.value.toLowerCase().replace(/\s+/g, ''))} placeholder="Unique Key (e.g., blackpink)" className="md:col-span-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" required />
                        <button type="submit" className="md:col-span-1 px-4 py-2 bg-gray-800 text-white font-semibold rounded-md hover:bg-gray-700 transition">Add Group</button>
                    </form>
                </div>

                {/* Groups List */}
                <div className="space-y-8">
                    {groups.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })).map(group => (
                        <section key={group.key} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
                            {editingGroupKey === group.key ? (
                                <div className="mb-6 flex flex-wrap items-center gap-4">
                                    <input type="text" value={editedGroupData.name} onChange={e => setEditedGroupData({ ...editedGroupData, name: e.target.value })} className="p-2 border border-blue-400 rounded-md text-2xl font-bold flex-grow bg-white text-gray-900" />
                                    <input type="text" value={editedGroupData.key} onChange={e => setEditedGroupData({ ...editedGroupData, key: e.target.value.toLowerCase().replace(/\s+/g, '') })} className="p-2 border border-blue-400 rounded-md font-mono flex-grow bg-white text-gray-900" />
                                    <div className="flex gap-2">
                                        <button onClick={() => handleSaveGroup(group.key)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">Save</button>
                                        <button onClick={handleCancelEditGroup} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <header className="mb-6 flex flex-wrap justify-between items-center gap-3">
                                    <h3 className="text-2xl font-bold text-gray-800">
                                      <a
                                        href={`https://kpop.fandom.com/wiki/${group.name.replace(/ /g, '_')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline"
                                        title={`Search for ${group.name} on K-Pop Wiki`}
                                      >
                                          {group.name}
                                      </a>
                                      <span className="text-lg font-mono text-gray-500"> ({group.key})</span>
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleEditGroupClick(group)} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Edit Group</button>
                                        <button onClick={() => handleDeleteGroup(group.key)} className="text-sm font-semibold text-red-600 hover:text-red-800">Delete Group</button>
                                    </div>
                                </header>
                            )}

                            {/* Idols List */}
                            <div className="space-y-3 mb-6">
                                {group.idols.map(idol => (
                                    <div key={idol.name}>
                                    {editingIdol?.groupKey === group.key && editingIdol?.idolName === idol.name ? (
                                        <form onSubmit={(e) => { e.preventDefault(); handleSaveIdol(group.key, idol.name); }} className="p-3 bg-blue-50 border border-blue-200 rounded-md grid grid-cols-1 md:grid-cols-[1.5fr_2.5fr_1fr_auto] gap-x-4 gap-y-2 items-center">
                                            <input aria-label="Idol Name" value={editedIdolData.name || ''} onChange={e => handleEditedIdolChange('name', e.target.value)} placeholder="Name" className="w-full p-2 border rounded-md bg-white text-gray-900 self-end" required />
                                            
                                            <div className="flex items-end gap-2">
                                                <div className="flex-grow">
                                                  <label htmlFor={`edit-url-${group.key}`} className="text-xs text-gray-500">Image URL</label>
                                                  <input id={`edit-url-${group.key}`} type="url" aria-label="Idol Image URL" value={editedIdolData.imageUrl || ''} onChange={(e) => handleEditedIdolChange('imageUrl', e.target.value)} placeholder="Paste URL..." className="w-full p-2 border rounded-md bg-white text-gray-900"/>
                                                </div>
                                                <button type="button" onClick={() => handleOpenCropper(group.key, { name: idol.name })} className="px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 h-10 shrink-0 flex items-center gap-2">
                                                  Process & Crop
                                                </button>
                                            </div>

                                            <input aria-label="Generation" value={editedIdolData.gen || ''} onChange={e => handleEditedIdolChange('gen', e.target.value)} placeholder="Gen (e.g., gen4)" className="w-full p-2 border rounded-md bg-white text-gray-900 self-end" required />
                                            <div className="flex gap-2 self-end">
                                                <button type="submit" className="px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600">Save</button>
                                                <button type="button" onClick={handleCancelEditIdol} className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="p-3 bg-gray-50 rounded-md grid grid-cols-1 md:grid-cols-[auto_1.5fr_2.5fr_1fr_auto] gap-x-4 gap-y-2 items-center">
                                            <img src={idol.imageUrl} alt={idol.name} className="w-14 h-[5.25rem] object-cover rounded-md hidden md:block" />
                                            <span className="font-semibold">{idol.name}</span>
                                            <a href={idol.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-base break-all">{idol.imageUrl}</a>
                                            <span className="font-mono text-gray-600">{idol.gen}</span>
                                            <div className="flex gap-2 text-sm">
                                                <button onClick={() => handleEditIdolClick(group.key, idol)} className="font-medium text-blue-600 hover:text-blue-800">Edit</button>
                                                <button onClick={() => handleDeleteIdol(group.key, idol.name)} className="font-medium text-red-600 hover:text-red-800">Delete</button>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                ))}
                            </div>

                            {/* Add Idol Section */}
                             {addingIdolToGroupKey === group.key ? (
                                <form onSubmit={e => handleAddIdol(e, group.key)} className="p-3 bg-gray-100 border-t rounded-b-md grid grid-cols-1 md:grid-cols-[1.5fr_2.5fr_1fr_auto] gap-x-4 gap-y-2 items-center">
                                    <input aria-label="New Idol Name" type="text" value={newIdols[group.key]?.name || ''} onChange={e => handleNewIdolChange(group.key, 'name', e.target.value)} placeholder="New Idol Name" className="w-full p-2 border rounded-md bg-white text-gray-900 self-end" required />
                                    
                                    <div className="flex items-end gap-2">
                                        <div className="flex-grow">
                                          <label htmlFor={`add-url-${group.key}`} className="text-xs text-gray-500">Image URL</label>
                                          <input id={`add-url-${group.key}`} type="url" aria-label="New Idol Image URL" value={newIdols[group.key]?.imageUrl || ''} onChange={(e) => handleNewIdolChange(group.key, 'imageUrl', e.target.value)} placeholder="Paste URL..." className="w-full p-2 border rounded-md bg-white text-gray-900"/>
                                        </div>
                                        <button type="button" onClick={() => handleOpenCropper(group.key, 'new')} className="px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 h-10 shrink-0 flex items-center gap-2">
                                            Process & Crop
                                        </button>
                                    </div>

                                    <input aria-label="New Idol Generation" type="text" value={newIdols[group.key]?.gen || ''} onChange={e => handleNewIdolChange(group.key, 'gen', e.target.value)} placeholder="Generation (e.g., gen4)" className="w-full p-2 border rounded-md bg-white text-gray-900 self-end" required />
                                    
                                    <div className="flex items-center gap-2 self-end">
                                        <button type="submit" className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700">Add</button>
                                        <button type="button" onClick={() => setAddingIdolToGroupKey(null)} className="px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="border-t pt-4 mt-4">
                                     <button 
                                        onClick={() => {
                                            setEditingIdol(null); // Close any open edit forms
                                            setNewIdols(prev => ({ ...prev, [group.key]: { imageUrl: '' } }));
                                            setAddingIdolToGroupKey(group.key);
                                        }}
                                        className="w-full px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                    >
                                        + Add New Member
                                    </button>
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminPage;