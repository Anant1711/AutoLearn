import React, { useState } from 'react';
import { Send, Lock, Unlock, Database, Activity, Settings } from 'lucide-react';

interface ServiceControlProps {
    onSendRequest: (serviceId: number, subFunction?: number, payload?: number[]) => void;
}

export const ServiceControl: React.FC<ServiceControlProps> = ({ onSendRequest }) => {
    const [activeTab, setActiveTab] = useState<'session' | 'dtc' | 'data' | 'security'>('session');

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
            <div className="flex items-center p-4 bg-gray-800 border-b border-gray-700">
                <Settings size={20} className="text-cyan-500 mr-2" />
                <h3 className="text-white font-bold uppercase tracking-wider text-sm">Service Control</h3>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700">
                <button
                    onClick={() => setActiveTab('session')}
                    className={`flex-1 p-3 text-xs font-bold uppercase transition-colors ${activeTab === 'session' ? 'bg-cyan-900/20 text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Session
                </button>
                <button
                    onClick={() => setActiveTab('dtc')}
                    className={`flex-1 p-3 text-xs font-bold uppercase transition-colors ${activeTab === 'dtc' ? 'bg-cyan-900/20 text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    DTCs
                </button>
                <button
                    onClick={() => setActiveTab('data')}
                    className={`flex-1 p-3 text-xs font-bold uppercase transition-colors ${activeTab === 'data' ? 'bg-cyan-900/20 text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Data
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`flex-1 p-3 text-xs font-bold uppercase transition-colors ${activeTab === 'security' ? 'bg-cyan-900/20 text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Security
                </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto">

                {/* Session Control (0x10) */}
                {activeTab === 'session' && (
                    <div className="space-y-4">
                        <div className="text-sm text-gray-400 mb-4">Service 0x10: Diagnostic Session Control</div>
                        <button
                            onClick={() => onSendRequest(0x10, 0x01)}
                            className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
                        >
                            <span className="text-white font-medium">Default Session (0x01)</span>
                            <Send size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </button>
                        <button
                            onClick={() => onSendRequest(0x10, 0x02)}
                            className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
                        >
                            <span className="text-white font-medium">Programming Session (0x02)</span>
                            <Send size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </button>
                        <button
                            onClick={() => onSendRequest(0x10, 0x03)}
                            className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
                        >
                            <span className="text-white font-medium">Extended Session (0x03)</span>
                            <Send size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </button>
                    </div>
                )}

                {/* Read DTC (0x19) */}
                {activeTab === 'dtc' && (
                    <div className="space-y-4">
                        <div className="text-sm text-gray-400 mb-4">Service 0x19: Read DTC Information</div>
                        <button
                            onClick={() => onSendRequest(0x19, 0x02, [0xFF])} // Report by Status Mask (All)
                            className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <Activity size={20} className="text-yellow-500" />
                                <span className="text-white font-medium">Read All DTCs</span>
                            </div>
                            <Send size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </button>
                        <button
                            onClick={() => onSendRequest(0x19, 0x02, [0x08])} // Confirmed DTCs only (bit 3)
                            className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <Activity size={20} className="text-red-500" />
                                <span className="text-white font-medium">Read Confirmed DTCs</span>
                            </div>
                            <Send size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </button>
                        <button
                            onClick={() => onSendRequest(0x19, 0x02, [0x04])} // Pending DTCs only (bit 2)
                            className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <Activity size={20} className="text-orange-500" />
                                <span className="text-white font-medium">Read Pending DTCs</span>
                            </div>
                            <Send size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </button>
                        <button
                            onClick={() => onSendRequest(0x19, 0x04)} // Read Freeze Frame
                            className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <Database size={20} className="text-blue-500" />
                                <span className="text-white font-medium">Read Freeze Frame Data</span>
                            </div>
                            <Send size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </button>
                        <button
                            onClick={() => onSendRequest(0x14)} // Clear DTC
                            className="w-full flex items-center justify-between p-4 bg-red-900/30 border border-red-800 rounded-lg hover:bg-red-900/50 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <Activity size={20} className="text-red-400" />
                                <span className="text-red-300 font-medium">Clear All DTCs</span>
                            </div>
                            <Send size={16} className="text-red-500 group-hover:text-red-400 transition-colors" />
                        </button>
                    </div>
                )}

                {/* Read Data (0x22) */}
                {activeTab === 'data' && (
                    <div className="space-y-4">
                        <div className="text-sm text-gray-400 mb-4">Service 0x22: Read Data By Identifier</div>
                        <button
                            onClick={() => onSendRequest(0x22, undefined, [0xF1, 0x90])} // VIN
                            className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <Database size={20} className="text-emerald-500" />
                                <span className="text-white font-medium">Read VIN (DID 0xF190)</span>
                            </div>
                            <Send size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </button>
                        <button
                            onClick={() => onSendRequest(0x22, undefined, [0xF1, 0x87])} // ECU Part Number
                            className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <Database size={20} className="text-emerald-500" />
                                <span className="text-white font-medium">Read ECU Part # (DID 0xF187)</span>
                            </div>
                            <Send size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </button>
                    </div>
                )}

                {/* Security Access (0x27) */}
                {activeTab === 'security' && (
                    <div className="space-y-4">
                        <div className="text-sm text-gray-400 mb-4">Service 0x27: Security Access</div>
                        <button
                            onClick={() => onSendRequest(0x27, 0x01)} // Request Seed
                            className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <Lock size={20} className="text-red-500" />
                                <span className="text-white font-medium">Request Seed (Level 1)</span>
                            </div>
                            <Send size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </button>

                        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                            <p className="text-xs text-gray-500 mb-2">Key Calculation: Seed + 1</p>
                            <button
                                onClick={() => {
                                    // Note: In a real app, this would use the seed from the previous response
                                    // For this MVP, we'll handle the "Send Key" logic in the parent component or assume user knows flow
                                    // But to make it interactive, we'll just send a placeholder key request here, 
                                    // and let the user see the flow. 
                                    // Ideally, the parent component should track the seed.
                                    // For now, let's just trigger a generic "Send Key" action that might fail if no seed.
                                    // We'll implement a smarter flow in UDSTester.
                                    onSendRequest(0x27, 0x02, [0x00, 0x00]); // Dummy key
                                }}
                                className="w-full flex items-center justify-between p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Unlock size={18} className="text-emerald-500" />
                                    <span className="text-white text-sm">Send Key (Level 1)</span>
                                </div>
                                <Send size={14} className="text-gray-400" />
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
