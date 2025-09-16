
import React from 'react';
import { UpdateDiff } from '../services/dataService';
import CloseIcon from './icons/CloseIcon';
import { IdolData } from '../types';

interface UpdateNotificationProps {
  diff: UpdateDiff;
  onDismiss: () => void;
}

// For changed groups, listing individual idol changes
const renderIdolChangeList = (idols: IdolData[], prefix: 'add' | 'remove') => (
  <ul className="pl-5 mt-1">
    {idols.map(idol => (
      <li key={idol.name} className="flex items-center gap-2 text-sm">
        {prefix === 'add' ? (
          <span className="text-green-500 font-bold">+</span>
        ) : (
          <span className="text-red-500 font-bold">-</span>
        )}
        <span className="text-slate-600">{idol.name}</span>
      </li>
    ))}
  </ul>
);

// For new/removed groups, listing all their members
const renderGroupMemberList = (idols: IdolData[]) => (
    <ul className="pl-5 mt-1 space-y-0.5">
        {idols.map(idol => (
            <li key={idol.name} className="text-sm text-slate-500 list-disc list-inside">
                {idol.name}
            </li>
        ))}
    </ul>
);


const UpdateNotification: React.FC<UpdateNotificationProps> = ({ diff, onDismiss }) => {
  const { addedGroups, removedGroups, changedGroups, isLegacyUpdate } = diff;
  const hasChanges = addedGroups.length > 0 || removedGroups.length > 0 || changedGroups.length > 0;

  let title: string;
  let content: React.ReactNode;

  if (isLegacyUpdate) {
    title = "Update Complete";
    content = <p className="text-slate-700">Welcome to the latest version! The idol data has been updated to ensure compatibility.</p>;
  } else if (!hasChanges) {
    title = "Data Up To Date";
    content = <p className="text-slate-700">The application data is now up-to-date. No new idols were added or removed in this version.</p>;
  } else {
    title = "Update Summary";
    content = (
      <div className="space-y-4">
        {addedGroups.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-700">Added Groups</h4>
            <ul className="mt-2 space-y-2">
              {addedGroups.map(({ group }) => (
                <li key={group.key}>
                  <div className="flex items-center gap-2">
                      <span className="text-green-500 font-bold text-lg">+</span>
                      <span className="font-medium text-slate-800">{group.name}</span>
                  </div>
                  {renderGroupMemberList(group.idols)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {removedGroups.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-700">Removed Groups</h4>
            <ul className="mt-2 space-y-2">
              {removedGroups.map(({ group }) => (
                <li key={group.key}>
                  <div className="flex items-center gap-2">
                      <span className="text-red-500 font-bold text-lg">-</span>
                      <span className="font-medium text-slate-800">{group.name}</span>
                  </div>
                  {renderGroupMemberList(group.idols)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {changedGroups.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-700">Updated Groups</h4>
            <ul className="mt-2 space-y-3">
              {changedGroups.map(({ groupName, addedIdols, removedIdols }) => (
                <li key={groupName}>
                  <p className="font-medium text-slate-800">{groupName}</p>
                  {addedIdols.length > 0 && renderIdolChangeList(addedIdols, 'add')}
                  {removedIdols.length > 0 && renderIdolChangeList(removedIdols, 'remove')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-[90vw] max-w-md animate-card-enter">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button
            onClick={onDismiss}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
            aria-label="Dismiss notification"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {content}
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;