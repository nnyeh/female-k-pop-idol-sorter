import React, { useState } from 'react';
import { getHistory, clearHistory, PastSortResult } from '../services/historyService';
import RestartIcon from './icons/RestartIcon';
import HistoryIcon from './icons/HistoryIcon';

interface HistoryPageProps {
  navigate: (path: string) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ navigate }) => {
  const [history, setHistory] = useState<PastSortResult[]>(getHistory());

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to delete your entire sorting history? This action cannot be undone.')) {
      clearHistory();
      setHistory(getHistory()); // Re-fetch from source of truth
    }
  };
  
  const getFormattedDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 animate-card-enter">
      <header className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-800">Sorting History</h1>
        <p className="mt-4 text-lg text-slate-600">Review your past rankings.</p>
      </header>

      <div className="flex flex-wrap justify-center items-center gap-4 mb-12">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-3 text-lg font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-all py-3 px-6 rounded-lg shadow-sm"
        >
          <RestartIcon className="w-6 h-6" />
          Back to Home
        </button>
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="inline-flex items-center gap-3 text-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-all py-3 px-6 rounded-lg shadow-sm"
          >
            Clear History
          </button>
        )}
      </div>

      <main>
        {history.length === 0 ? (
          <div className="text-center py-16 px-6 bg-slate-50 rounded-lg border">
            <HistoryIcon className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h2 className="text-2xl font-semibold text-slate-700">No History Yet</h2>
            <p className="text-slate-500 mt-2">Complete a sort to see your ranking history here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((result) => (
              <div key={result.id} className="bg-white p-6 rounded-lg shadow-md border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <p className="font-bold text-xl text-slate-800">{getFormattedDate(result.id)}</p>
                  <p className="text-slate-600 mt-1">
                    Ranked <span className="font-semibold">{result.filterSummary.idolCount}</span> idols
                    {result.filterSummary?.groupCount > 0 && (
                      <>
                        {' from '}
                        <span className="font-semibold">{result.filterSummary.groupCount}</span>
                        {` ${result.filterSummary.groupCount === 1 ? 'group' : 'groups'}`}
                      </>
                    )}
                    {' using '}
                    <span className="font-semibold">{result.comparisonsMade}</span> comparisons.
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/history/${result.id}`)}
                  className="bg-slate-700 text-white font-bold py-2 px-5 rounded-lg hover:bg-slate-600 transition-colors shadow-sm whitespace-nowrap"
                >
                  View Results
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;