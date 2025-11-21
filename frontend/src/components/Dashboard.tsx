import React from 'react';
import { Gauge, Activity } from 'lucide-react';

interface DashboardProps {
    speed: number;
    rpm: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ speed, rpm }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-900 rounded-xl shadow-2xl border border-gray-800">
            {/* Speedometer */}
            <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-lg border border-gray-700 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-gray-500">
                    <Gauge size={24} />
                </div>
                <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4">Speed</h3>
                <div className="relative w-48 h-48 flex items-center justify-center">
                    {/* Circular Progress Background */}
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-gray-700"
                        />
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={552}
                            strokeDashoffset={552 - (552 * speed) / 240} // Max speed 240
                            className="text-cyan-500 transition-all duration-300 ease-out"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-5xl font-bold text-white font-mono">{Math.round(speed)}</span>
                        <span className="text-gray-400 text-sm mt-1">km/h</span>
                    </div>
                </div>
            </div>

            {/* RPM Gauge */}
            <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-lg border border-gray-700 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-gray-500">
                    <Activity size={24} />
                </div>
                <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4">RPM</h3>
                <div className="relative w-48 h-48 flex items-center justify-center">
                    {/* Circular Progress Background */}
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-gray-700"
                        />
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={552}
                            strokeDashoffset={552 - (552 * rpm) / 8000} // Max RPM 8000
                            className={`${rpm > 6000 ? 'text-red-500' : 'text-emerald-500'} transition-all duration-300 ease-out`}
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-5xl font-bold text-white font-mono">{Math.round(rpm)}</span>
                        <span className="text-gray-400 text-sm mt-1">RPM</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
