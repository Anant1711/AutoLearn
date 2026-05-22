import React, { useState } from 'react';
import { MqttVisualizer } from './MqttVisualizer';
import { SomeIpVisualizer } from './SomeIpVisualizer';
import { DbcParser } from './DbcParser';
import { Cloud, Network, Database } from 'lucide-react';

const tabs = [
    { id: 'mqtt',   label: 'MQTT Telematics',   icon: Cloud,     color: 'cyan'   },
    { id: 'someip', label: 'SOME/IP (VSOMEIP)',  icon: Network,   color: 'violet' },
    { id: 'dbc',    label: 'DBC Signal Mapper',  icon: Database,  color: 'amber'  },
] as const;

type TabId = typeof tabs[number]['id'];

const colorMap: Record<string, { active: string; glow: string; text: string }> = {
    cyan:   { active: 'border-cyan-400 text-cyan-300',   glow: 'shadow-[0_0_18px_rgba(34,211,238,0.35)]',  text: 'text-cyan-400'   },
    violet: { active: 'border-violet-400 text-violet-300', glow: 'shadow-[0_0_18px_rgba(167,139,250,0.35)]', text: 'text-violet-400' },
    amber:  { active: 'border-amber-400 text-amber-300',  glow: 'shadow-[0_0_18px_rgba(251,191,36,0.35)]',  text: 'text-amber-400'  },
};

export const Protocols: React.FC = () => {
    const [subTab, setSubTab] = useState<TabId>('mqtt');

    return (
        <div className="flex flex-col h-full gap-0 bg-gray-950">
            {/* Premium Tab Bar */}
            <div className="flex gap-1 px-1 pt-1 bg-gray-950 border-b border-gray-800">
                {tabs.map(({ id, label, icon: Icon, color }) => {
                    const isActive = subTab === id;
                    const c = colorMap[color];
                    return (
                        <button
                            key={id}
                            onClick={() => setSubTab(id)}
                            className={`
                                group relative flex items-center gap-2 px-5 py-3 rounded-t-lg
                                text-xs font-bold uppercase tracking-widest
                                transition-all duration-300 whitespace-nowrap select-none
                                ${isActive
                                    ? `bg-gray-900 border-t-2 border-x border-b-0 ${c.active} ${c.glow}`
                                    : 'bg-transparent border-t-2 border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'}
                            `}
                        >
                            <Icon
                                size={15}
                                className={`transition-all duration-300 ${isActive ? c.text : 'text-gray-600 group-hover:text-gray-400'}`}
                            />
                            {label}
                            {isActive && (
                                <span className={`absolute bottom-[-1px] left-0 right-0 h-[2px] ${
                                    color === 'cyan'   ? 'bg-cyan-400'   :
                                    color === 'violet' ? 'bg-violet-400' : 'bg-amber-400'
                                }`} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Active Sub-tab View */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-gray-950">
                {subTab === 'mqtt'   && <MqttVisualizer />}
                {subTab === 'someip' && <SomeIpVisualizer />}
                {subTab === 'dbc'    && <DbcParser />}
            </div>
        </div>
    );
};
