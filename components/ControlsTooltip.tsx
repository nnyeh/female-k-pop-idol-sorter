import React, { useState } from 'react';
import InfoIcon from './icons/InfoIcon';

const ControlsTooltip: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative z-50 flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-[3.25rem] h-[3.25rem] md:w-[4.25rem] md:h-[4.25rem] flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 transition-colors cursor-help">
        <InfoIcon className="w-7 h-7 md:w-8 md:h-8" />
      </div>

      {isHovered && (
        <div 
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-xs sm:w-96 bg-white rounded-lg shadow-xl border border-slate-200 p-4 sm:p-6 transition-opacity duration-200 pointer-events-none"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          <h4 className="font-bold text-lg sm:text-xl text-slate-800 mb-4">Controls</h4>
          <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg text-slate-600">
            <li className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 w-16 justify-center">
                <kbd className="font-sans font-semibold border border-slate-300 rounded px-1.5 py-0.5">&#x2190;</kbd>
                <span className="text-slate-400">/</span>
                <kbd className="font-sans font-semibold border border-slate-300 rounded px-1.5 py-0.5">A</kbd>
              </div>
              <span className="flex-1">Choose left</span>
            </li>
             <li className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 w-16 justify-center">
                <kbd className="font-sans font-semibold border border-slate-300 rounded px-1.5 py-0.5">&#x2192;</kbd>
                <span className="text-slate-400">/</span>
                <kbd className="font-sans font-semibold border border-slate-300 rounded px-1.5 py-0.5">D</kbd>
              </div>
              <span className="flex-1">Choose right</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 w-16 justify-center">
                <kbd className="font-sans font-semibold border border-slate-300 rounded px-1.5 py-0.5">&#x2193;</kbd>
                <span className="text-slate-400">/</span>
                <kbd className="font-sans font-semibold border border-slate-300 rounded px-1.5 py-0.5">S</kbd>
              </div>
              <span className="flex-1">Tie</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 w-16 justify-center">
                <kbd className="font-sans font-semibold border border-slate-300 rounded px-1.5 py-0.5">&#x2191;</kbd>
                <span className="text-slate-400">/</span>
                <kbd className="font-sans font-semibold border border-slate-300 rounded px-1.5 py-0.5">W</kbd>
              </div>
              <span className="flex-1">Undo last choice</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 w-16 justify-center">
                <kbd className="font-sans font-semibold border border-slate-300 rounded px-1.5 py-0.5">Tab</kbd>
              </div>
              <span className="flex-1">Restart progress</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ControlsTooltip;