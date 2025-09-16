import React from 'react';
import useAnimatedCounter from '../hooks/useAnimatedCounter';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const animatedProgress = useAnimatedCounter(progress, 400);
  const formattedProgress = animatedProgress.toFixed(1);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1 text-base md:text-lg font-medium text-slate-500">
        <span>Progress</span>
        {/* Display the formatted progress */}
        <span className="font-roboto-mono tabular-nums">{formattedProgress}% complete</span>
      </div>
      <div
        className="w-full bg-slate-200 rounded-full h-2.5"
        role="progressbar"
        aria-label="Sorting progress"
        aria-valuenow={animatedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="bg-slate-800 h-2.5 rounded-full"
          style={{ width: `${animatedProgress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
