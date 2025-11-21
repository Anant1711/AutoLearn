import React from 'react';
import { BookOpen, PlayCircle, FileText } from 'lucide-react';

const TUTORIALS = [
    {
        id: 1,
        title: 'CAN Bus Basics',
        level: 'Beginner',
        duration: '10 min',
        description: 'Understand the fundamentals of Controller Area Network, message frames, and arbitration.',
        icon: <BookOpen size={24} className="text-blue-400" />
    },
    {
        id: 2,
        title: 'UDS Protocol Deep Dive',
        level: 'Intermediate',
        duration: '25 min',
        description: 'Learn about Diagnostic Sessions, Security Access, and how to read DTCs using UDS.',
        icon: <FileText size={24} className="text-emerald-400" />
    },
    {
        id: 3,
        title: 'ECU Flashing Simulation',
        level: 'Advanced',
        duration: '40 min',
        description: 'Step-by-step guide to simulating an ECU firmware update over CAN.',
        icon: <PlayCircle size={24} className="text-red-400" />
    }
];

export const Tutorials: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TUTORIALS.map((tutorial) => (
                <div key={tutorial.id} className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-cyan-500/50 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                            {tutorial.icon}
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${tutorial.level === 'Beginner' ? 'bg-blue-900/30 text-blue-400' :
                                tutorial.level === 'Intermediate' ? 'bg-emerald-900/30 text-emerald-400' :
                                    'bg-red-900/30 text-red-400'
                            }`}>
                            {tutorial.level}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{tutorial.title}</h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{tutorial.description}</p>
                    <div className="flex items-center text-xs text-gray-500">
                        <span>{tutorial.duration}</span>
                        <span className="mx-2">•</span>
                        <span>Interactive</span>
                    </div>
                </div>
            ))}
        </div>
    );
};
