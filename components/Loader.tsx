import React from 'react';

interface LoaderProps {
  message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 border-4 border-slate-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-lg font-semibold text-slate-700">{message}</p>
    </div>
  );
};

export default Loader;