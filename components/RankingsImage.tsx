import React, { forwardRef } from 'react';
import { Idol } from '../types';

interface RankingsImageProps {
  rankedIdols: Idol[];
  isPreview?: boolean;
}

// Border colors for top ranks
const getCardBorderColor = (rank: number) => {
  switch (rank) {
    case 1: return '#FDCF50'; // Gold
    case 2: return '#9CA3AB'; // Silver
    case 3: return '#A26648'; // Bronze
    default: return 'white';
  }
};

const textShadowStyle = { textShadow: '1px 1px 4px rgba(0, 0, 0, 0.8)' };

const RankingsImage = forwardRef<HTMLDivElement, RankingsImageProps>(({ rankedIdols, isPreview = false }, ref) => {
    const top10 = rankedIdols.slice(0, 10);
    const theRest = rankedIdols.slice(10);
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div 
            ref={ref} 
            className={`p-8 bg-slate-50 text-slate-800 ${!isPreview ? 'absolute -left-[9999px] top-0' : 'relative'}`}
            style={{ width: '1400px', fontFamily: "'Inter', sans-serif" }}
        >
            <header className="text-center pb-6 mb-12">
                <h1 className="text-5xl font-bold">My rankings</h1>
                <p className="text-xl text-slate-500 mt-2">{today}</p>
            </header>

            <main>
                <div className="flex flex-wrap justify-center gap-x-10 gap-y-12 mb-16">
                    {top10.map((idol, index) => {
                        const rank = index + 1;
                        const borderColor = getCardBorderColor(rank);
                        
                        return (
                            <div key={idol.id} className="w-[240px] relative shrink-0">
                                {/* Rank Number Circle */}
                                <div
                                    className="absolute -top-5 -left-3 z-30 w-12 h-12 rounded-full"
                                    style={{
                                        backgroundColor: borderColor,
                                        padding: '4px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }}
                                >
                                    <div
                                        className="w-full h-full flex items-center justify-center font-bold text-white rounded-full"
                                        style={{
                                            backgroundColor: '#1e293b', // slate-800
                                            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                            fontSize: '24px', // FIX: Reduced font size
                                            lineHeight: '1',
                                        }}
                                    >
                                        {rank}
                                    </div>
                                </div>
                                
                                {/* Card border implemented with a padded wrapper */}
                                <div
                                    className="rounded-2xl"
                                    style={{
                                        backgroundColor: borderColor,
                                        padding: '4px',
                                        // FIX: Stronger shadow
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2)'
                                    }}
                                >
                                    <div 
                                        className="relative rounded-xl aspect-[2/3] overflow-hidden bg-cover bg-center"
                                        style={{ 
                                            backgroundImage: `url(${idol.imageUrl})`,
                                        }}
                                    >
                                        <div 
                                            className="absolute bottom-0 left-0 right-0 flex flex-col justify-end text-white z-20"
                                            style={{
                                                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 10%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0) 70%)',
                                                // FIX: Increased padding
                                                paddingLeft: '20px',
                                                paddingRight: '20px',
                                                paddingBottom: '20px',
                                                paddingTop: '40px',
                                            }}
                                        >
                                            {/* FIX: Added margin-bottom */}
                                            <h3 className="font-bold" style={{ ...textShadowStyle, fontSize: '30px', lineHeight: '1.1', marginBottom: '4px' }}>{idol.name}</h3>
                                            <p className="text-slate-300" style={{ ...textShadowStyle, fontSize: '20px' }}>{idol.group}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {theRest.length > 0 && (
                    <div className="border-t-2 border-slate-200 pt-10">
                        <div className="flex justify-center">
                            {/* FIX: 5 columns, bigger text, no wrapping */}
                            <ol className="grid grid-cols-5 gap-x-8 gap-y-4 text-2xl" start={11}>
                                {theRest.map((idol, index) => (
                                    <li key={idol.id} className="flex items-baseline overflow-hidden">
                                        <span className="font-semibold w-12 text-right mr-3 text-slate-400 tabular-nums shrink-0">{index + 11}.</span>
                                        <div className="flex items-baseline flex-nowrap min-w-0">
                                            <span className="text-slate-700 mr-2 truncate">{idol.name}</span>
                                            <span className="text-xl text-slate-500 whitespace-nowrap">({idol.group})</span>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                )}
            </main>
            
            <footer className="text-center mt-12 pt-6">
                <p className="text-lg text-slate-500">Generated by Female K-Pop Idol Sorter</p>
            </footer>
        </div>
    );
});

export default RankingsImage;