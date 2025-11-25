import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Lightbulb, AlertTriangle } from 'lucide-react';

interface ControlsProps {
    onControl: (action: string, pressed?: boolean, value?: any) => void;
    currentGear?: string;
    currentHeadlights?: string;
    currentTurnSignals?: string;
}

export const Controls: React.FC<ControlsProps> = ({ onControl, currentGear = 'P', currentHeadlights = 'off', currentTurnSignals = 'off' }) => {
    const [gear, setGear] = useState(currentGear);
    const [headlights, setHeadlights] = useState(currentHeadlights);
    const [turnSignals, setTurnSignals] = useState(currentTurnSignals);
    const [blink, setBlink] = useState(true);

    // Sync with props when they change
    useEffect(() => {
        setGear(currentGear);
    }, [currentGear]);

    useEffect(() => {
        setHeadlights(currentHeadlights);
    }, [currentHeadlights]);

    useEffect(() => {
        setTurnSignals(currentTurnSignals);
    }, [currentTurnSignals]);

    // Blinking effect for turn signals
    useEffect(() => {
        if (turnSignals !== 'off') {
            const interval = setInterval(() => {
                setBlink(prev => !prev);
            }, 500); // Blink every 500ms
            return () => clearInterval(interval);
        } else {
            setBlink(true);
        }
    }, [turnSignals]);

    const handleGearChange = (newGear: string) => {
        setGear(newGear);
        onControl('gear', undefined, newGear);
    };

    const handleHeadlightsToggle = () => {
        const states = ['off', 'on', 'high'];
        const currentIndex = states.indexOf(headlights);
        const nextState = states[(currentIndex + 1) % states.length];
        setHeadlights(nextState);
        onControl('headlights', undefined, nextState);
    };

    const handleTurnSignal = (direction: string) => {
        const newState = turnSignals === direction ? 'off' : direction;
        setTurnSignals(newState);
        onControl('turnSignals', undefined, newState);
    };

    return (
        <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 p-6 space-y-4">
            {/* Row 1: Turn Signals, Steering, Headlights */}
            <div className="grid grid-cols-3 gap-4">
                {/* Turn Signals */}
                <div>
                    <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Turn Signals</h4>
                    <div className="flex gap-1">
                        <button
                            onClick={() => handleTurnSignal('left')}
                            className={`flex-1 flex items-center justify-center h-12 rounded-lg transition-all ${turnSignals === 'left' && blink
                                ? 'bg-gradient-to-b from-green-500 to-green-700 text-white shadow-lg shadow-green-500/50'
                                : turnSignals === 'left'
                                    ? 'bg-gray-800 text-gray-500'
                                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                                }`}
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <button
                            onClick={() => handleTurnSignal('hazard')}
                            className={`flex-1 flex items-center justify-center h-12 rounded-lg transition-all ${turnSignals === 'hazard' && blink
                                ? 'bg-gradient-to-b from-red-500 to-red-700 text-white shadow-lg shadow-red-500/50'
                                : turnSignals === 'hazard'
                                    ? 'bg-gray-800 text-gray-500'
                                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                                }`}
                        >
                            <AlertTriangle size={18} />
                        </button>
                        <button
                            onClick={() => handleTurnSignal('right')}
                            className={`flex-1 flex items-center justify-center h-12 rounded-lg transition-all ${turnSignals === 'right' && blink
                                ? 'bg-gradient-to-b from-green-500 to-green-700 text-white shadow-lg shadow-green-500/50'
                                : turnSignals === 'right'
                                    ? 'bg-gray-800 text-gray-500'
                                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                                }`}
                        >
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Steering */}
                <div>
                    <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Steering</h4>
                    <div className="flex gap-2">
                        <button
                            onMouseDown={() => onControl('steer', undefined, -50)}
                            onMouseUp={() => onControl('steer', undefined, 0)}
                            onMouseLeave={() => onControl('steer', undefined, 0)}
                            className="flex-1 flex items-center justify-center h-12 bg-gradient-to-b from-blue-600 to-blue-800 rounded-lg shadow-lg active:scale-95 transition-all"
                        >
                            <ArrowLeft size={20} className="text-white" />
                        </button>
                        <button
                            onMouseDown={() => onControl('steer', undefined, 50)}
                            onMouseUp={() => onControl('steer', undefined, 0)}
                            onMouseLeave={() => onControl('steer', undefined, 0)}
                            className="flex-1 flex items-center justify-center h-12 bg-gradient-to-b from-blue-600 to-blue-800 rounded-lg shadow-lg active:scale-95 transition-all"
                        >
                            <ArrowRight size={20} className="text-white" />
                        </button>
                    </div>
                </div>

                {/* Headlights */}
                <div>
                    <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Headlights</h4>
                    <button
                        onClick={handleHeadlightsToggle}
                        className={`w-full flex items-center justify-center gap-2 h-12 rounded-lg font-bold uppercase text-xs transition-all ${headlights === 'off'
                            ? 'bg-gray-800 text-gray-500'
                            : headlights === 'on'
                                ? 'bg-gradient-to-b from-yellow-500 to-yellow-700 text-white shadow-lg shadow-yellow-500/50'
                                : 'bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-lg shadow-blue-500/50'
                            }`}
                    >
                        <Lightbulb size={18} />
                        {headlights === 'off' ? 'Off' : headlights === 'on' ? 'On' : 'High'}
                    </button>
                </div>
            </div>

            {/* Row 2: Gear Selector */}
            <div>
                <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Gear</h4>
                <div className="flex gap-2">
                    {['P', 'R', 'N', 'D'].map((g) => (
                        <button
                            key={g}
                            onClick={() => handleGearChange(g)}
                            className={`flex-1 h-14 rounded-lg font-bold text-lg transition-all ${gear === g
                                ? 'bg-gradient-to-b from-cyan-500 to-cyan-700 text-white shadow-lg shadow-cyan-500/50'
                                : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                                }`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* Row 3: Accelerate/Brake */}
            <div>
                <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Throttle & Brake</h4>
                <div className="flex gap-4 justify-center">
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
            </div>
        </div>
    );
};
