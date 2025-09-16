import React from 'react';
import { Idol } from '../types';

interface SimpleRankingsListProps {
  rankedIdols: Idol[];
  title?: string;
}

const SimpleRankingsList: React.FC<SimpleRankingsListProps> = ({ rankedIdols, title = "Final rankings" }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 animate-card-enter">
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-slate-800">{title}</h1>
      <div className="flex justify-center">
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-4 text-lg sm:text-xl">
          {rankedIdols.map((idol, index) => (
            <li key={idol.id} className="flex items-baseline">
              <span className="font-semibold w-10 sm:w-12 text-right mr-2 sm:mr-3 text-slate-400 tabular-nums shrink-0">{index + 1}.</span>
              <div className="flex items-baseline">
                <span className="text-slate-700 mr-2">{idol.name}</span>
                <span className="text-base text-slate-500 whitespace-nowrap">({idol.group})</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default SimpleRankingsList;