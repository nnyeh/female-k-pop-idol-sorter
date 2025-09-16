
import React from 'react';
import RestartIcon from './icons/RestartIcon';

interface RestartButtonProps {
  progress: number;
  isHolding: boolean;
  disabled?: boolean;
  onMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
  ariaLabel?: string;
  iconClassName?: string;
}

const RestartButton: React.FC<RestartButtonProps> = ({
  progress,
  isHolding,
  disabled,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  ariaLabel = "Restart Sorter (Hold Tab or Click)",
  iconClassName = "w-5 h-5 md:w-7 md:h-7",
}) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <div
      className="relative w-[3.25rem] h-[3.25rem] md:w-[4.25rem] md:h-[4.25rem] flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed transition-colors"
      onMouseDown={disabled ? undefined : onMouseDown}
      onMouseUp={disabled ? undefined : onMouseUp}
      onMouseLeave={disabled ? undefined : onMouseLeave}
      aria-label={ariaLabel}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${isHolding || progress > 0.01 ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        <svg className="w-full h-full" viewBox="0 0 64 64">
          <circle
            className="text-red-200"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            r={radius}
            cx="32"
            cy="32"
          />
          <circle
            className="text-red-500 -rotate-90 origin-center"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx="32"
            cy="32"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
      </div>
      <RestartIcon className={`relative z-10 ${iconClassName}`} />
    </div>
  );
};

export default RestartButton;
