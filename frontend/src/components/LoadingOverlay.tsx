import { Car } from 'lucide-react';

interface LoadingOverlayProps {
    progress: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ progress }) => {
    return (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center">
                {/* Circular Progress */}
                <div className="relative w-32 h-32 mx-auto mb-6">
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Background circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-gray-200"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={352}
                            strokeDashoffset={352 - (352 * progress) / 100}
                            className="text-cyan-500 transition-all duration-1000 ease-out"
                        />
                    </svg>
                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Car size={40} className="text-cyan-500 animate-pulse" />
                    </div>
                </div>

                {/* Text */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Starting Backend...
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                    Waking up the server (this may take up to 30 seconds)
                </p>

                {/* Progress percentage */}
                <div className="text-cyan-600 font-mono text-sm font-semibold">
                    {Math.round(progress)}%
                </div>
            </div>
        </div>
    );
};
