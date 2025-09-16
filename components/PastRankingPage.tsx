import React, { useState, useEffect } from 'react';
import { getSortById, PastSortResult } from '../services/historyService';
import FinalRankings from './FinalRankings';
import SimpleRankingsList from './SimpleRankingsList';
import Loader from './Loader';
import ListIcon from './icons/ListIcon';
import PictureIcon from './icons/PictureIcon';
import RestartIcon from './icons/RestartIcon';
import HistoryIcon from './icons/HistoryIcon';
import { MousePos } from './IdolCard';

interface PastRankingPageProps {
  id: string;
  navigate: (path: string) => void;
  mousePos: MousePos;
}

const PastRankingPage: React.FC<PastRankingPageProps> = ({ id, navigate, mousePos }) => {
  const [result, setResult] = useState<PastSortResult | null | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  useEffect(() => {
    const foundResult = getSortById(id);
    // If the result is not found (undefined), set state to null to indicate this.
    // This prevents getting stuck on the loading screen.
    setResult(foundResult ?? null);
  }, [id]);

  if (result === undefined) {
    return <Loader message="Loading ranking..." />;
  }

  if (result === null) {
    return (
      <div className="text-center p-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Ranking Not Found</h1>
        <p className="text-slate-600 mb-8">Could not find a ranking with the specified ID.</p>
        <button
          onClick={() => navigate('/history')}
          className="inline-flex items-center gap-3 text-lg font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-all py-3 px-6 rounded-lg shadow-sm"
        >
          <HistoryIcon className="w-6 h-6" />
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="w-full animate-card-enter">
      {viewMode === 'cards' ? (
        <FinalRankings rankedIdols={result.rankedList} mousePos={mousePos} title={`Ranking from ${result.date}`} />
      ) : (
        <SimpleRankingsList rankedIdols={result.rankedList} title={`Ranking from ${result.date}`} />
      )}

      <div className="text-center mt-12 pb-8">
        <p className="text-lg text-slate-600 mb-4">
          These rankings took <span className="font-bold text-slate-800">{result.comparisonsMade}</span> battles.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-6">
          <button
            onClick={() => navigate('/history')}
            className="inline-flex items-center gap-3 text-lg font-semibold text-white bg-slate-600 hover:bg-slate-500 transition-all py-3 px-6 rounded-lg shadow-sm"
          >
            <HistoryIcon className="w-6 h-6" />
            Back to History
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
};

export default PastRankingPage;