import { useState, useEffect } from 'react';
import { Gauge, Activity, ArrowLeft, ArrowRight, Lightbulb } from 'lucide-react';

interface DashboardProps {
    speed: number;
    rpm: number;
    gear?: string;
    headlights?: string;
    turnSignals?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ speed, rpm, gear = 'P', headlights = 'off', turnSignals = 'off' }) => {
    const [blink, setBlink] = useState(true);

    // Blinking effect for turn signals
    useEffect(() => {
        if (turnSignals !== 'off') {
            const interval = setInterval(() => {
                setBlink(prev => !prev);
            }, 500);
            return () => clearInterval(interval);
        } else {
            setBlink(true);
        }
    }, [turnSignals]);

    return (
        <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 p-6">
            {/* Top Indicators Row */}
            <div className="flex items-center justify-between mb-4">
                {/* Left Turn Signal */}
                <div className={`flex items-center gap-2 transition-opacity duration-200 ${(turnSignals === 'left' || turnSignals === 'hazard') && blink
                        ? 'opacity-100'
                        : (turnSignals === 'left' || turnSignals === 'hazard')
                            ? 'opacity-20'
                            : 'opacity-20'
                    }`}>
                    <ArrowLeft size={24} className={(turnSignals === 'left' || turnSignals === 'hazard') && blink ? 'text-green-500' : 'text-gray-700'} />
                </div>

                {/* Center Status */}
                <div className="flex items-center gap-4">
                    {/* Gear Indicator */}
                    <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                        <span className="text-gray-400 text-xs uppercase">Gear</span>
                        <span className="text-cyan-400 font-bold text-lg">{gear}</span>
                    </div>

                    {/* Headlights Indicator */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${headlights === 'off'
                            ? 'bg-gray-800 border-gray-700'
                            : headlights === 'on'
                                ? 'bg-yellow-900/30 border-yellow-700'
                                : 'bg-blue-900/30 border-blue-700'
                        }`}>
                        <Lightbulb size={16} className={headlights === 'off' ? 'text-gray-600' : headlights === 'on' ? 'text-yellow-400' : 'text-blue-400'} />
                        <span className={`text-xs uppercase font-bold ${headlights === 'off' ? 'text-gray-600' : headlights === 'on' ? 'text-yellow-400' : 'text-blue-400'
                            }`}>{headlights === 'high' ? 'High Beam' : headlights}</span>
                    </div>
                </div>

                {/* Right Turn Signal */}
                <div className={`flex items-center gap-2 transition-opacity duration-200 ${(turnSignals === 'right' || turnSignals === 'hazard') && blink
                        ? 'opacity-100'
                        : (turnSignals === 'right' || turnSignals === 'hazard')
                            ? 'opacity-20'
                            : 'opacity-20'
                    }`}>
                    <ArrowRight size={24} className={(turnSignals === 'right' || turnSignals === 'hazard') && blink ? 'text-green-500' : 'text-gray-700'} />
                </div>
            </div>

            {/* Gauges Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>
    );
};
