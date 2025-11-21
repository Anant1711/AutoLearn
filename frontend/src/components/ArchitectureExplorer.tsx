import React, { useState } from 'react';
import { Network, Cpu, Info, X, Wifi, Radio, Zap, Shield } from 'lucide-react';

interface ECU {
    id: string;
    name: string;
    type: 'gateway' | 'powertrain' | 'body' | 'chassis' | 'infotainment' | 'adas';
    x: number;
    y: number;
    description: string;
    signals: string[];
}

const ECUS: ECU[] = [
    // Gateway
    { id: 'gw', name: 'Gateway', type: 'gateway', x: 400, y: 300, description: 'Central Gateway Module. Bridges all vehicle domains and buses.', signals: ['All Traffic'] },

    // Powertrain (Red)
    { id: 'ecm', name: 'ECM', type: 'powertrain', x: 250, y: 150, description: 'Engine Control Module. Manages engine performance, fuel injection, and ignition.', signals: ['Engine_Speed', 'Engine_Temp', 'Throttle_Pos'] },
    { id: 'tcm', name: 'TCM', type: 'powertrain', x: 350, y: 100, description: 'Transmission Control Module. Controls gear shifting and torque converter.', signals: ['Gear_Pos', 'Trans_Temp'] },
    { id: 'bms', name: 'BMS', type: 'powertrain', x: 150, y: 150, description: 'Battery Management System. Monitors HV battery state of charge and health.', signals: ['HV_Voltage', 'SOC', 'SOH'] },
    { id: 'obc', name: 'OBC', type: 'powertrain', x: 450, y: 100, description: 'On-Board Charger. Manages AC charging from grid.', signals: ['Charge_Current', 'Plug_Status'] },

    // Chassis (Orange)
    { id: 'abs', name: 'ABS/ESP', type: 'chassis', x: 150, y: 300, description: 'Electronic Stability Program. Controls braking and traction.', signals: ['Wheel_Speed_FL', 'Yaw_Rate', 'Brake_Pressure'] },
    { id: 'eps', name: 'EPS', type: 'chassis', x: 150, y: 400, description: 'Electric Power Steering. Assists steering effort.', signals: ['Steering_Angle', 'Steering_Torque'] },
    { id: 'sas', name: 'SAS', type: 'chassis', x: 250, y: 450, description: 'Steering Angle Sensor. Measures steering wheel position.', signals: ['Steering_Angle'] },

    // Body (Blue)
    { id: 'bcm', name: 'BCM', type: 'body', x: 600, y: 150, description: 'Body Control Module. Controls lights, windows, and locks.', signals: ['Door_Status', 'Light_Status', 'Wiper_Status'] },
    { id: 'ipc', name: 'IPC', type: 'body', x: 650, y: 300, description: 'Instrument Panel Cluster. Displays vehicle status to the driver.', signals: ['Odometer', 'Fuel_Level'] },
    { id: 'hvac', name: 'HVAC', type: 'body', x: 700, y: 150, description: 'Heating, Ventilation, and Air Conditioning.', signals: ['Cabin_Temp', 'Fan_Speed'] },
    { id: 'door_fl', name: 'Door FL', type: 'body', x: 550, y: 50, description: 'Front Left Door Module.', signals: ['Window_Pos', 'Lock_Status'] },

    // Infotainment (Purple)
    { id: 'hu', name: 'Head Unit', type: 'infotainment', x: 600, y: 450, description: 'Central Infotainment Display. Navigation, Audio, Connectivity.', signals: ['Audio_Vol', 'Nav_GPS', 'Touch_Event'] },
    { id: 'tcu', name: 'TCU', type: 'infotainment', x: 700, y: 450, description: 'Telematics Control Unit. 4G/5G connectivity and eCall.', signals: ['Cell_Signal', 'GPS_Lat', 'GPS_Long'] },

    // ADAS (Green)
    { id: 'radar', name: 'F-Radar', type: 'adas', x: 400, y: 500, description: 'Front Long-Range Radar. Detects objects for ACC/AEB.', signals: ['Obj_Dist', 'Obj_Rel_Speed'] },
    { id: 'camera', name: 'F-Camera', type: 'adas', x: 500, y: 500, description: 'Front Camera. Lane detection and Traffic Sign Recognition.', signals: ['Lane_Type', 'Speed_Limit'] },
];

export const ArchitectureExplorer: React.FC = () => {
    const [selectedECU, setSelectedECU] = useState<ECU | null>(null);

    return (
        <div className="flex h-full gap-6">
            {/* Canvas Area */}
            <div className="flex-1 bg-gray-900 rounded-xl shadow-2xl border border-gray-800 relative overflow-hidden p-8">
                <div className="absolute top-4 left-4 flex items-center gap-2 text-gray-400">
                    <Network size={20} />
                    <span className="text-sm font-bold uppercase tracking-wider">Vehicle Topology</span>
                </div>

                <svg className="w-full h-full" viewBox="0 0 800 600">
                    {/* Bus Lines */}

                    {/* PT-CAN (High Speed 500k) - Red */}
                    <path d="M 400 300 L 250 150" stroke="#ef4444" strokeWidth="3" />
                    <path d="M 400 300 L 350 100" stroke="#ef4444" strokeWidth="3" />
                    <path d="M 400 300 L 150 150" stroke="#ef4444" strokeWidth="3" />
                    <path d="M 400 300 L 450 100" stroke="#ef4444" strokeWidth="3" />

                    {/* Chassis-CAN (High Speed 500k) - Orange */}
                    <path d="M 400 300 L 150 300" stroke="#f97316" strokeWidth="3" />
                    <path d="M 400 300 L 150 400" stroke="#f97316" strokeWidth="3" />
                    <path d="M 400 300 L 250 450" stroke="#f97316" strokeWidth="3" />

                    {/* Body-CAN (Low Speed 125k) - Blue */}
                    <path d="M 400 300 L 600 150" stroke="#3b82f6" strokeWidth="3" />
                    <path d="M 400 300 L 650 300" stroke="#3b82f6" strokeWidth="3" />
                    <path d="M 600 150 L 700 150" stroke="#3b82f6" strokeWidth="3" /> {/* Daisy chain */}

                    {/* LIN Bus (Single Wire) - Cyan */}
                    <path d="M 600 150 L 550 50" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 2" />

                    {/* Infotainment (Ethernet/HSCAN) - Purple */}
                    <path d="M 400 300 L 600 450" stroke="#a855f7" strokeWidth="4" />
                    <path d="M 600 450 L 700 450" stroke="#a855f7" strokeWidth="4" />

                    {/* ADAS (CAN-FD) - Green */}
                    <path d="M 400 300 L 400 500" stroke="#10b981" strokeWidth="3" />
                    <path d="M 400 300 L 500 500" stroke="#10b981" strokeWidth="3" />


                    {/* Nodes */}
                    {ECUS.map((ecu) => (
                        <g
                            key={ecu.id}
                            onClick={() => setSelectedECU(ecu)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <circle
                                cx={ecu.x}
                                cy={ecu.y}
                                r="35"
                                fill={
                                    ecu.type === 'gateway' ? '#10b981' :
                                        ecu.type === 'powertrain' ? '#ef4444' :
                                            ecu.type === 'chassis' ? '#f97316' :
                                                ecu.type === 'body' ? '#3b82f6' :
                                                    ecu.type === 'infotainment' ? '#a855f7' : '#10b981'
                                }
                                stroke="#1f2937"
                                strokeWidth="4"
                                className={`transition-all duration-300 ${selectedECU?.id === ecu.id ? 'stroke-white stroke-[6px]' : ''}`}
                            />
                            {/* Icons based on type */}
                            {ecu.type === 'gateway' && <Network x={ecu.x - 12} y={ecu.y - 12} size={24} className="text-white pointer-events-none" />}
                            {ecu.type === 'powertrain' && <Zap x={ecu.x - 12} y={ecu.y - 12} size={24} className="text-white pointer-events-none" />}
                            {ecu.type === 'chassis' && <Shield x={ecu.x - 12} y={ecu.y - 12} size={24} className="text-white pointer-events-none" />}
                            {ecu.type === 'body' && <Cpu x={ecu.x - 12} y={ecu.y - 12} size={24} className="text-white pointer-events-none" />}
                            {ecu.type === 'infotainment' && <Radio x={ecu.x - 12} y={ecu.y - 12} size={24} className="text-white pointer-events-none" />}
                            {ecu.type === 'adas' && <Wifi x={ecu.x - 12} y={ecu.y - 12} size={24} className="text-white pointer-events-none" />}

                            <text x={ecu.x} y={ecu.y + 55} textAnchor="middle" fill="white" className="text-xs font-bold pointer-events-none">{ecu.name}</text>
                        </g>
                    ))}

                    {/* Legend */}
                    <g transform="translate(20, 480)">
                        <rect width="180" height="100" rx="8" fill="#1f2937" fillOpacity="0.9" />

                        <line x1="20" y1="20" x2="50" y2="20" stroke="#ef4444" strokeWidth="3" />
                        <text x="60" y="24" fill="#d1d5db" fontSize="10">PT-CAN (500k)</text>

                        <line x1="20" y1="35" x2="50" y2="35" stroke="#f97316" strokeWidth="3" />
                        <text x="60" y="39" fill="#d1d5db" fontSize="10">Chassis-CAN (500k)</text>

                        <line x1="20" y1="50" x2="50" y2="50" stroke="#3b82f6" strokeWidth="3" />
                        <text x="60" y="54" fill="#d1d5db" fontSize="10">Body-CAN (125k)</text>

                        <line x1="20" y1="65" x2="50" y2="65" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 2" />
                        <text x="60" y="69" fill="#d1d5db" fontSize="10">LIN Bus (20k)</text>

                        <line x1="20" y1="80" x2="50" y2="80" stroke="#a855f7" strokeWidth="4" />
                        <text x="60" y="84" fill="#d1d5db" fontSize="10">Ethernet (100M)</text>
                    </g>
                </svg>
            </div>

            {/* Sidebar Details */}
            <div className={`w-80 bg-gray-900 rounded-xl shadow-2xl border border-gray-800 transition-all duration-300 ${selectedECU ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-50'}`}>
                {selectedECU ? (
                    <div className="p-6 h-full flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-lg ${selectedECU.type === 'gateway' ? 'bg-emerald-500/20 text-emerald-400' :
                                        selectedECU.type === 'powertrain' ? 'bg-red-500/20 text-red-400' :
                                            selectedECU.type === 'chassis' ? 'bg-orange-500/20 text-orange-400' :
                                                selectedECU.type === 'body' ? 'bg-blue-500/20 text-blue-400' :
                                                    selectedECU.type === 'infotainment' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'
                                    }`}>
                                    <Cpu size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selectedECU.name}</h2>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">{selectedECU.type} Domain</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedECU(null)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                    <Info size={14} /> Description
                                </h3>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    {selectedECU.description}
                                </p>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                    <Network size={14} /> Signals Transmitted
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedECU.signals.map(signal => (
                                        <span key={signal} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-cyan-400 font-mono">
                                            {signal}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                        <Network size={48} className="mb-4 opacity-20" />
                        <p>Select an ECU from the topology map to view details.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
