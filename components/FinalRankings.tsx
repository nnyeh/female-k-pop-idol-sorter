import React from 'react';
import { Idol } from '../types';
import IdolCard, { MousePos } from './IdolCard';

interface FinalRankingsProps {
  rankedIdols: Idol[];
  mousePos: MousePos;
  title?: string;
}

const getBorderColor = (rank: number) => {
  switch (rank) {
    case 1: return '#FDCF50';
    case 2: return '#9CA3AB';
    case 3: return '#A26648';
    default: return undefined;
  }
};

const FinalRankings: React.FC<FinalRankingsProps> = ({ rankedIdols, mousePos, title = "Final rankings" }) => {
  const top10 = rankedIdols.slice(0, 10);
  const theRest = rankedIdols.slice(10);

  return (
    <div className="w-full mx-auto px-4 animate-card-enter">
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-slate-800">{title}</h1>

      {/* Top 10 Grid using Flexbox for proper centering */}
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-12 mb-16">
        {top10.map((idol, index) => {
          const rank = index + 1;
          const borderColor = getBorderColor(rank);
          
          return (
            <div key={idol.id} className="w-60 relative shrink-0">
              <span
                className="absolute -top-5 -left-3 z-30 flex items-center justify-center w-12 h-12 text-2xl font-bold text-white bg-slate-800 rounded-full"
                style={{
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  boxShadow: `0 0 0 0.25rem ${borderColor || 'white'}`
                }}
              >
                {rank}
              </span>
              <IdolCard
                idol={idol}
                mousePos={mousePos}
                isInteractive={true}
                isClickable={false}
                onChoose={() => {}}
                allowIdleAnimation={false}
                size="small"
                borderColor={borderColor}
              />
            </div>
          );
        })}
      </div>

      {/* The Rest in a Grid */}
      {theRest.length > 0 && (
        <div className="border-t-2 border-slate-200 pt-10">
          <div className="flex justify-center">
            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-4 text-lg sm:text-xl" start={11}>
              {theRest.map((idol, index) => (
                <li key={idol.id} className="flex items-baseline">
                  <span className="font-semibold w-10 sm:w-12 text-right mr-2 sm:mr-3 text-slate-400 tabular-nums shrink-0">{index + 11}.</span>
                  <div className="flex items-baseline">
                    <span className="text-slate-700 mr-2">{idol.name}</span>
                    <span className="text-base text-slate-500 whitespace-nowrap">({idol.group})</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalRankings;