import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface ControlsProps {
    onControl: (action: 'accelerate' | 'brake', pressed: boolean) => void;
}

export const Controls: React.FC<ControlsProps> = ({ onControl }) => {
    return (
        <div className="flex gap-4 justify-center p-6 bg-gray-900 rounded-xl shadow-2xl border border-gray-800">
            <button
                onMouseDown={() => onControl('accelerate', true)}
                onMouseUp={() => onControl('accelerate', false)}
                onMouseLeave={() => onControl('accelerate', false)}
                className="flex flex-col items-center justify-center w-32 h-32 bg-gradient-to-b from-emerald-600 to-emerald-800 rounded-lg shadow-lg active:scale-95 active:shadow-inner transition-all duration-150 border-b-4 border-emerald-900 active:border-b-0 active:translate-y-1"
            >
                <ArrowUp size={32} className="text-white mb-2" />
                <span className="text-white font-bold uppercase tracking-wider">Accelerate</span>
            </button>

            <button
                onMouseDown={() => onControl('brake', true)}
                onMouseUp={() => onControl('brake', false)}
                onMouseLeave={() => onControl('brake', false)}
                className="flex flex-col items-center justify-center w-32 h-32 bg-gradient-to-b from-red-600 to-red-800 rounded-lg shadow-lg active:scale-95 active:shadow-inner transition-all duration-150 border-b-4 border-red-900 active:border-b-0 active:translate-y-1"
            >
                <ArrowDown size={32} className="text-white mb-2" />
                <span className="text-white font-bold uppercase tracking-wider">Brake</span>
            </button>
        </div>
    );
};
