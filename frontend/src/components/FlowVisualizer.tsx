import React, { useEffect, useRef } from 'react';
import type { UDSMessage } from '../types';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

interface FlowVisualizerProps {
    messages: UDSMessage[];
}

export const FlowVisualizer: React.FC<FlowVisualizerProps> = ({ messages }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
            <div className="p-4 bg-gray-800 border-b border-gray-700">
                <h3 className="text-white font-bold uppercase tracking-wider text-sm">Diagnostic Flow</h3>
            </div>
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
            >
                {messages.length === 0 ? (
                    <div className="text-gray-500 text-center italic mt-10">No diagnostic session active...</div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.type === 'request' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg ${msg.type === 'request'
                                    ? 'bg-blue-900/50 border border-blue-700/50 text-blue-100'
                                    : msg.type === 'error'
                                        ? 'bg-red-900/50 border border-red-700/50 text-red-100'
                                        : 'bg-emerald-900/50 border border-emerald-700/50 text-emerald-100'
                                }`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {msg.type === 'request' ? <ArrowRight size={14} /> : msg.type === 'error' ? <AlertCircle size={14} /> : <ArrowLeft size={14} />}
                                    <span className="font-bold text-xs uppercase">{msg.type}</span>
                                    <span className="text-[10px] opacity-70">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div className="font-mono text-sm">
                                    <span className="font-bold">SID: 0x{msg.serviceId.toString(16).toUpperCase().padStart(2, '0')}</span>
                                    {msg.subFunction !== undefined && (
                                        <span className="ml-2 opacity-80">Sub: 0x{msg.subFunction.toString(16).toUpperCase().padStart(2, '0')}</span>
                                    )}
                                </div>
                                {msg.data && msg.data.length > 0 && (
                                    <div className="mt-1 font-mono text-xs opacity-80 break-all">
                                        Data: {msg.data.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}
                                    </div>
                                )}
                                {msg.description && (
                                    <div className="mt-1 text-xs italic opacity-70 border-t border-white/10 pt-1">
                                        {msg.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
