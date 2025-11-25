import React, { useEffect, useRef } from 'react';
import type { CANMessage } from '../types';
import { Terminal } from 'lucide-react';

interface CANLogProps {
    messages: CANMessage[];
}

export const CANLog: React.FC<CANLogProps> = ({ messages }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
            <div className="flex items-center p-4 bg-gray-800 border-b border-gray-700">
                <Terminal size={20} className="text-cyan-500 mr-2" />
                <h3 className="text-white font-bold uppercase tracking-wider text-sm">CAN Bus Traffic</h3>
            </div>
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs"
            >
                {messages.length === 0 ? (
                    <div className="text-gray-500 text-center italic mt-10">No traffic detected...</div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} className="flex items-center p-2 bg-gray-800/50 rounded border border-gray-700/50 hover:bg-gray-700/50 transition-colors">
                            <span className="text-gray-500 w-20">{new Date(msg.timestamp).toLocaleTimeString().split(' ')[0]}.{String(new Date(msg.timestamp).getMilliseconds()).padStart(3, '0')}</span>
                            <span className="text-yellow-500 font-bold w-16">0x{msg.id.toString(16).toUpperCase()}</span>
                            <span className="text-cyan-400 font-bold w-32">{msg.name}</span>
                            <span className="text-emerald-400 flex-1">
                                {Object.entries(msg.data).map(([key, value]) =>
                                    `${key}: ${typeof value === 'number' ? Math.round(value) : value}`
                                ).join(', ')}
                            </span>
                            <span className="text-gray-600 text-[10px]">RAW: {msg.rawValue}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
