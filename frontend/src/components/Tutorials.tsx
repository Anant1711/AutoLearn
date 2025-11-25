import { Rocket, Sparkles } from 'lucide-react';

export const Tutorials: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
                <div className="mb-6 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles size={120} className="text-cyan-500/20 animate-pulse" />
                    </div>
                    <Rocket size={80} className="mx-auto text-cyan-500 relative z-10" />
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Coming Soon!</h2>
                <p className="text-gray-600 text-lg mb-6">
                    We're working on interactive tutorials to help you master CAN Bus, UDS protocols, and automotive diagnostics.
                </p>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="text-blue-900 font-bold mb-3">What to Expect:</h3>
                    <ul className="text-left text-gray-700 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-cyan-500 mt-1">✓</span>
                            <span>Step-by-step CAN Bus fundamentals</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-cyan-500 mt-1">✓</span>
                            <span>Interactive UDS protocol exercises</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-cyan-500 mt-1">✓</span>
                            <span>Real-world diagnostic scenarios</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-cyan-500 mt-1">✓</span>
                            <span>ECU flashing simulations</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
