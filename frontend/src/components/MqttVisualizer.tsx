import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Cpu, Cloud, Smartphone, Send, Terminal, RefreshCw, CheckCircle, Zap, Lock, Monitor } from 'lucide-react';

interface MqttMessage {
    id: string; topic: string; payload: string;
    subscriber: string; timestamp: number; qos: number; retain: boolean;
}

interface Packet {
    id: string; label: string; color: string;
    progress: number; fromX: number; fromY: number; toX: number; toY: number;
}

function topicMatches(pattern: string, topic: string): boolean {
    if (pattern === topic) return true;
    if (pattern.endsWith('#')) return topic.startsWith(pattern.slice(0, -1));
    if (pattern.includes('+')) {
        const pp = pattern.split('/'), tp = topic.split('/');
        return pp.length === tp.length && pp.every((p, i) => p === '+' || p === tp[i]);
    }
    return false;
}

const PUB_X = 80, SUB_X = 820, BROKER_X = 450, BROKER_Y = 185;

const PUBLISHERS = [
    { id: 'tcu',     label: 'TCU',      sublabel: 'Telematics Unit', y: 75,  color: '#22d3ee', Icon: Cpu,     topics: ['vehicle/telematics/speed', 'vehicle/telematics/battery'] },
    { id: 'obd',     label: 'OBD GW',   sublabel: 'OBD Gateway',     y: 185, color: '#4ade80', Icon: Monitor, topics: ['vehicle/status/engine',    'vehicle/status/brake'      ] },
    { id: 'climate', label: 'Climate',  sublabel: 'HVAC ECU',        y: 295, color: '#fb923c', Icon: Cpu,     topics: ['vehicle/hvac/temp',         'vehicle/hvac/fan'         ] },
] as const;

const SUBSCRIBERS = [
    { id: 'mobile', label: 'Mobile',  sublabel: 'Fleet Monitor',  y: 75,  color: '#a78bfa', Icon: Smartphone, presets: ['vehicle/telematics/#', 'vehicle/+/speed'] },
    { id: 'cloud',  label: 'Cloud',   sublabel: 'AWS IoT Core',   y: 185, color: '#60a5fa', Icon: Cloud,      presets: ['vehicle/#',            'vehicle/status/#'] },
    { id: 'dash',   label: 'Dash',    sublabel: 'Fleet Dashboard', y: 295, color: '#f472b6', Icon: Monitor,    presets: ['vehicle/status/#',     'vehicle/hvac/#']  },
] as const;

type PubId = typeof PUBLISHERS[number]['id'];
type SubId = typeof SUBSCRIBERS[number]['id'];

export const MqttVisualizer: React.FC = () => {
    const [connected,   setConnected]   = useState(false);
    const [connecting,  setConnecting]  = useState(false);
    const [activePubId, setActivePubId] = useState<PubId>('tcu');
    const [activeTopic, setActiveTopic] = useState<string>(PUBLISHERS[0].topics[0]);
    const [subSubs,     setSubSubs]     = useState<Record<SubId, string[]>>({ mobile: [], cloud: [], dash: [] });
    const [messages,    setMessages]    = useState<MqttMessage[]>([]);
    const [qos,         setQos]         = useState<0|1|2>(1);
    const [retain,      setRetain]      = useState(false);
    const [packets,     setPackets]     = useState<Packet[]>([]);
    const [busy,        setBusy]        = useState(false);
    const [logs,        setLogs]        = useState<Array<{ text: string; type: string }>>([
        { text: 'MQTT Multi-Client Simulator ready. 3 Publishers · 3 Subscribers.', type: 'info' }
    ]);
    const [inspecting, setInspecting] = useState<{ topic: string; payload: string; qos: number } | null>(null);

    const logRef  = useRef<HTMLDivElement>(null);
    const aniRefs = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [logs]);

    useEffect(() => () => { aniRefs.current.forEach(id => cancelAnimationFrame(id)); }, []);

    const addLog = useCallback((text: string, type = 'info') => {
        setLogs(p => [...p.slice(-80), { text: `[${new Date().toLocaleTimeString()}] ${text}`, type }]);
    }, []);

    const animatePacket = useCallback((
        fromX: number, fromY: number, toX: number, toY: number,
        label: string, color: string, dur = 2200
    ): Promise<void> => new Promise(resolve => {
        const id = Math.random().toString(36).slice(2);
        setPackets(p => [...p, { id, label, color, progress: 0, fromX, fromY, toX, toY }]);
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min((now - start) / dur, 1);
            setPackets(p => p.map(pk => pk.id === id ? { ...pk, progress: t * 100 } : pk));
            if (t < 1) { const r = requestAnimationFrame(tick); aniRefs.current.set(id, r); }
            else { aniRefs.current.delete(id); setPackets(p => p.filter(pk => pk.id !== id)); resolve(); }
        };
        const r = requestAnimationFrame(tick);
        aniRefs.current.set(id, r);
    }), []);

    const handleConnect = async () => {
        if (connected) {
            setConnected(false);
            setSubSubs({ mobile: [], cloud: [], dash: [] });
            addLog('All 6 clients disconnected from broker.', 'warn');
            return;
        }
        setConnecting(true);
        addLog('Bringing MQTT network online…', 'info');
        for (const pub of PUBLISHERS) {
            addLog(`${pub.label} → CONNECT (Publisher, KeepAlive=60)`, 'packet');
            await new Promise(r => setTimeout(r, 320));
        }
        for (const sub of SUBSCRIBERS) {
            addLog(`${sub.label} → CONNECT (Subscriber)`, 'packet');
            await new Promise(r => setTimeout(r, 280));
        }
        addLog('Broker → 6× CONNACK (0x00 Accepted). Network online ✓', 'success');
        setConnected(true);
        setConnecting(false);
    };

    const toggleSub = (subId: SubId, topic: string) => {
        if (!connected) { addLog('Connect first!', 'warn'); return; }
        const sub = SUBSCRIBERS.find(s => s.id === subId)!;
        setSubSubs(prev => {
            const cur = prev[subId] || [];
            if (cur.includes(topic)) {
                addLog(`${sub.label} → UNSUBSCRIBE (${topic})`, 'packet');
                return { ...prev, [subId]: cur.filter(t => t !== topic) };
            } else {
                addLog(`${sub.label} → SUBSCRIBE (${topic}, QoS ${qos})`, 'packet');
                addLog(`Broker → SUBACK to ${sub.label} (QoS ${qos})`, 'success');
                return { ...prev, [subId]: [...cur, topic] };
            }
        });
    };

    const handlePublish = async (topic: string, payload: string) => {
        if (!connected || busy) return;
        const pub = PUBLISHERS.find(p => p.id === activePubId)!;
        setBusy(true);
        setInspecting({ topic, payload, qos });
        addLog(`${pub.label} → PUBLISH "${topic}" [QoS ${qos}]`, 'packet');

        await animatePacket(PUB_X, pub.y, BROKER_X, BROKER_Y, 'PUBLISH', pub.color);
        addLog(`Broker ← received on "${topic}"`, 'info');
        if (qos >= 1) addLog(`Broker → PUBACK → ${pub.label}`, 'success');

        const matched = SUBSCRIBERS.filter(sub =>
            (subSubs[sub.id] || []).some(p => topicMatches(p, topic))
        );

        if (matched.length > 0) {
            addLog(`Broker ⇒ fan-out to ${matched.length} subscriber(s): ${matched.map(s => s.label).join(', ')}`, 'info');
            // Fan-out: all simultaneous
            await Promise.all(matched.map(sub =>
                animatePacket(BROKER_X, BROKER_Y, SUB_X, sub.y, 'DELIVER', sub.color, 2200)
            ));
            matched.forEach(sub => {
                setMessages(prev => [{
                    id: Math.random().toString(), topic, payload,
                    subscriber: sub.label, timestamp: Date.now(), qos, retain
                }, ...prev.slice(0, 23)]);
                addLog(`${sub.label} ← received "${topic}"`, 'success');
            });
        } else {
            await new Promise(r => setTimeout(r, 400));
            addLog('Broker: no matching subscribers — message dropped', 'warn');
        }
        setBusy(false);
    };

    const activePub = PUBLISHERS.find(p => p.id === activePubId) ?? PUBLISHERS[0];

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-12 bg-gray-950 min-h-full p-4 gap-6 items-start">

            {/* Left Column: SVG Diagram, Terminal & Message Inbox */}
            <div className="lg:col-span-7 flex flex-col gap-6 w-full">
                {/* ── SVG Diagram ── */}
                <div className="bg-[#0d1117] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl w-full">
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-800 bg-gray-900/60">
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={13} className="text-cyan-400" /> MQTT — 3 Publishers · Broker · 3 Subscribers
                        </span>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${connected ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {connected ? '● 6 NODES ONLINE' : '○ ALL OFFLINE'}
                        </span>
                    </div>

                    {/* SVG Diagram */}
                    <div className="relative w-full" style={{ paddingBottom: '38%', minHeight: 240 }}>
                        <svg viewBox="0 0 900 370" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                            <defs>
                                <filter id="glow-pk"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                                <filter id="glow-broker"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                            </defs>

                            {/* Column Labels */}
                            <text x={PUB_X}    y={17} textAnchor="middle" fill="#374151" fontSize="7.5" fontFamily="monospace" fontWeight="bold" letterSpacing="1">PUBLISHERS</text>
                            <text x={BROKER_X} y={17} textAnchor="middle" fill="#374151" fontSize="7.5" fontFamily="monospace" fontWeight="bold" letterSpacing="1">BROKER</text>
                            <text x={SUB_X}    y={17} textAnchor="middle" fill="#374151" fontSize="7.5" fontFamily="monospace" fontWeight="bold" letterSpacing="1">SUBSCRIBERS</text>

                            {/* Publisher → Broker lines */}
                            {PUBLISHERS.map(pub => (
                                <line key={pub.id}
                                    x1={PUB_X + 40} y1={pub.y} x2={BROKER_X - 54} y2={BROKER_Y}
                                    stroke={connected ? pub.color : '#1f2937'}
                                    strokeWidth={connected && activePubId === pub.id ? 2.5 : 1.5}
                                    strokeDasharray={connected ? '0' : '5 5'}
                                    strokeOpacity={connected ? (activePubId === pub.id ? 0.8 : 0.25) : 0.4}
                                    className="transition-all duration-700" />
                            ))}

                            {/* Broker → Subscriber lines */}
                            {SUBSCRIBERS.map(sub => (
                                <line key={sub.id}
                                    x1={BROKER_X + 54} y1={BROKER_Y} x2={SUB_X - 40} y2={sub.y}
                                    stroke={(subSubs[sub.id] || []).length > 0 ? sub.color : '#1f2937'}
                                    strokeWidth={(subSubs[sub.id] || []).length > 0 ? 2 : 1.5}
                                    strokeDasharray={(subSubs[sub.id] || []).length > 0 ? '0' : '5 5'}
                                    strokeOpacity={(subSubs[sub.id] || []).length > 0 ? 0.65 : 0.3}
                                    className="transition-all duration-700" />
                            ))}

                            {/* Moving Packets */}
                            {packets.map(pk => {
                                const cx = pk.fromX + (pk.toX - pk.fromX) * (pk.progress / 100);
                                const cy = pk.fromY + (pk.toY - pk.fromY) * (pk.progress / 100);
                                return (
                                    <g key={pk.id}>
                                        <circle cx={cx} cy={cy} r={18} fill={pk.color} opacity={0.07} />
                                        <circle cx={cx} cy={cy} r={10} fill={pk.color} opacity={0.15} />
                                        <circle cx={cx} cy={cy} r={5.5} fill={pk.color} filter="url(#glow-pk)" />
                                        <rect x={cx - 22} y={cy - 29} width={44} height={13} rx="3" fill={pk.color} opacity={0.92} />
                                        <text x={cx} y={cy - 20} textAnchor="middle" fill="#fff" fontSize="6.5" fontWeight="bold" fontFamily="monospace">{pk.label}</text>
                                    </g>
                                );
                            })}

                            {/* Publisher Nodes */}
                            {PUBLISHERS.map(pub => {
                                const isActive = activePubId === pub.id;
                                return (
                                    <g key={pub.id} style={{ cursor: 'pointer' }}
                                        onClick={() => { setActivePubId(pub.id as PubId); setActiveTopic(pub.topics[0]); }}>
                                        <rect x={PUB_X - 40} y={pub.y - 42} width={80} height={84} rx="14"
                                            fill={connected ? (isActive ? '#061820' : '#0d1117') : '#111827'}
                                            stroke={connected ? (isActive ? pub.color : '#2d3748') : '#1f2937'}
                                            strokeWidth={isActive ? 2.5 : 1.5}
                                            filter={connected && isActive ? 'url(#glow-pk)' : undefined}
                                            className="transition-all duration-400" />
                                        <foreignObject x={PUB_X - 14} y={pub.y - 26} width={28} height={28}>
                                            <div className="w-full h-full flex items-center justify-center" style={{ color: connected ? pub.color : '#374151' }}>
                                                <pub.Icon size={22} />
                                            </div>
                                        </foreignObject>
                                        <text x={PUB_X} y={pub.y + 28} textAnchor="middle" fill={connected ? pub.color : '#4b5563'} fontSize="8" fontWeight="bold" fontFamily="sans-serif">{pub.label}</text>
                                        <text x={PUB_X} y={pub.y + 39} textAnchor="middle" fill="#374151" fontSize="6" fontFamily="monospace">{pub.sublabel}</text>
                                        {isActive && connected && (
                                            <rect x={PUB_X - 40} y={pub.y - 42} width={80} height={84} rx="14"
                                                fill="none" stroke={pub.color} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 3" />
                                        )}
                                    </g>
                                );
                            })}

                            {/* MQTT Broker */}
                            <g>
                                <rect x={BROKER_X - 54} y={BROKER_Y - 56} width={108} height={112} rx="20"
                                    fill={connected ? '#031220' : '#111827'}
                                    stroke={connected ? '#06b6d4' : '#374151'} strokeWidth="2"
                                    filter={connected ? 'url(#glow-broker)' : undefined}
                                    className="transition-all duration-500" />
                                <foreignObject x={BROKER_X - 24} y={BROKER_Y - 36} width={48} height={48}>
                                    <div className="w-full h-full flex items-center justify-center" style={{ color: connected ? '#22d3ee' : '#374151' }}>
                                        <Cloud size={38} />
                                    </div>
                                </foreignObject>
                                <text x={BROKER_X} y={BROKER_Y + 70} textAnchor="middle" fill={connected ? '#67e8f9' : '#4b5563'} fontSize="9" fontWeight="bold" fontFamily="sans-serif">MQTT Broker</text>
                                <text x={BROKER_X} y={BROKER_Y + 82} textAnchor="middle" fill="#374151" fontSize="6.5" fontFamily="monospace">Mosquitto / EMQX</text>
                            </g>

                            {/* Subscriber Nodes */}
                            {SUBSCRIBERS.map(sub => {
                                const activeSubs = subSubs[sub.id] || [];
                                const isSubscribed = activeSubs.length > 0;
                                return (
                                    <g key={sub.id}>
                                        <rect x={SUB_X - 40} y={sub.y - 42} width={80} height={84} rx="14"
                                            fill={isSubscribed ? '#0a0618' : '#111827'}
                                            stroke={isSubscribed ? sub.color : connected ? '#2d3748' : '#1f2937'}
                                            strokeWidth={isSubscribed ? 2 : 1.5}
                                            filter={isSubscribed ? 'url(#glow-pk)' : undefined}
                                            className="transition-all duration-400" />
                                        <foreignObject x={SUB_X - 14} y={sub.y - 26} width={28} height={28}>
                                            <div className="w-full h-full flex items-center justify-center" style={{ color: isSubscribed ? sub.color : '#374151' }}>
                                                <sub.Icon size={22} />
                                            </div>
                                        </foreignObject>
                                        <text x={SUB_X} y={sub.y + 28} textAnchor="middle" fill={isSubscribed ? sub.color : '#4b5563'} fontSize="8" fontWeight="bold" fontFamily="sans-serif">{sub.label}</text>
                                        <text x={SUB_X} y={sub.y + 39} textAnchor="middle" fill="#374151" fontSize="6" fontFamily="monospace">{sub.sublabel}</text>
                                        {isSubscribed && (
                                            <>
                                                <circle cx={SUB_X + 34} cy={sub.y - 36} r={10} fill={sub.color} />
                                                <text x={SUB_X + 34} y={sub.y - 32} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="monospace">{activeSubs.length}</text>
                                            </>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    {/* Packet Inspector */}
                    <div className="border-t border-gray-800 bg-gray-900/30 px-5 py-3">
                        <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1.5 flex items-center gap-2">
                            <Zap size={11} className="text-cyan-500" /> Live Packet Inspector
                        </div>
                        {inspecting && busy ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-0.5 font-mono text-[11px]">
                                <div><span className="text-gray-500">Type:</span> <span className="text-cyan-300">PUBLISH (0x30)</span></div>
                                <div><span className="text-gray-500">QoS:</span> <span className="text-cyan-300">{inspecting.qos}</span></div>
                                <div><span className="text-gray-500">Retain:</span> <span className="text-cyan-300">{retain ? '1' : '0'}</span></div>
                                <div><span className="text-gray-500">From:</span> <span className="text-cyan-300">{activePub.label}</span></div>
                                <div className="col-span-2 sm:col-span-4 truncate"><span className="text-gray-500">Topic:</span> <span className="text-emerald-300 ml-1">{inspecting.topic}</span></div>
                                <div className="col-span-2 sm:col-span-4 truncate"><span className="text-gray-500">Payload:</span> <span className="text-yellow-300 ml-1">{inspecting.payload}</span></div>
                            </div>
                        ) : (
                            <p className="text-[11px] text-gray-600 italic font-mono">No packet in flight. Select a publisher and publish to inspect.</p>
                        )}
                    </div>
                </div>

                {/* Terminal */}
                <div className="bg-[#0a0e13] border border-gray-800 rounded-2xl p-4 flex flex-col h-56 w-full">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-800">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                        <span className="text-[10px] font-mono text-gray-600 ml-1 flex items-center gap-1">
                            <Terminal size={10} /> mqtt_multi_client.log
                        </span>
                    </div>
                    <div ref={logRef} className="flex-1 overflow-y-auto font-mono text-[11px] leading-5 space-y-0.5 scrollbar-hide">
                        {logs.map((l, i) => (
                            <div key={i} className={
                                l.type === 'success' ? 'text-emerald-400' :
                                l.type === 'warn'    ? 'text-red-400' :
                                l.type === 'packet'  ? 'text-cyan-300 font-semibold' : 'text-gray-500'}>
                                {l.text}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Message Inbox */}
                <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-4 flex flex-col gap-3 min-h-[240px] w-full">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">
                        <CheckCircle size={13} className="text-emerald-500" /> Message Inbox ({messages.length})
                    </div>
                    {messages.length === 0 ? (
                        <p className="text-xs text-gray-600 italic text-center py-8">
                            No messages received yet.<br />Connect nodes → subscribe → publish to see fan-out in action.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto scrollbar-hide">
                            {messages.map(msg => {
                                const sub = SUBSCRIBERS.find(s => s.label === msg.subscriber);
                                return (
                                    <div key={msg.id} className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-3 transition-colors">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold"
                                                style={{ color: sub?.color ?? '#60a5fa', background: (sub?.color ?? '#60a5fa') + '15', border: '1px solid ' + (sub?.color ?? '#60a5fa') + '40' }}>
                                                ▶ {msg.subscriber}
                                            </span>
                                            <span className="text-[9px] text-gray-600 font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="font-mono text-[9px] text-gray-500 mb-1 truncate">{msg.topic}</div>
                                        <pre className="font-mono text-[10px] text-gray-300 bg-gray-950 rounded-md p-1.5 truncate">{msg.payload}</pre>
                                        <div className="flex gap-3 mt-1.5 text-[9px] font-mono text-gray-600">
                                            <span>QoS <span className="text-cyan-500">{msg.qos}</span></span>
                                            <span>Ret <span className="text-cyan-500">{msg.retain ? 'Y' : 'N'}</span></span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Controls */}
            <div className="lg:col-span-5 flex flex-col gap-6 w-full">
                {/* Network + QoS */}
                <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-4 flex flex-col gap-3 w-full">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">Network</h4>
                    <button onClick={handleConnect} disabled={connecting}
                        className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300
                            ${connected ? 'bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-800'
                                        : 'bg-cyan-900/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-700'}
                            disabled:opacity-50`}>
                        <RefreshCw size={14} className={connecting ? 'animate-spin' : ''} />
                        {connecting ? 'Connecting…' : connected ? 'Disconnect All Nodes' : 'Connect All 6 Nodes'}
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] text-gray-600 font-bold uppercase block mb-1">QoS Level</label>
                            <select value={qos} onChange={e => setQos(Number(e.target.value) as 0 | 1 | 2)}
                                className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-md p-1.5 focus:border-cyan-500 focus:outline-none">
                                <option value={0}>QoS 0 – At most once</option>
                                <option value={1}>QoS 1 – At least once</option>
                                <option value={2}>QoS 2 – Exactly once</option>
                            </select>
                        </div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer" onClick={() => setRetain(p => !p)}>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${retain ? 'bg-cyan-600' : 'bg-gray-700'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${retain ? 'left-4' : 'left-0.5'}`} />
                                </div>
                                <Lock size={11} /> Retain
                            </label>
                        </div>
                    </div>
                </div>

                {/* Publisher + Publish */}
                <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-4 flex flex-col gap-3 w-full">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">Publish</h4>

                    {/* Publisher picker */}
                    <div className="flex gap-2">
                        {PUBLISHERS.map(pub => (
                            <button key={pub.id}
                                onClick={() => { setActivePubId(pub.id as PubId); setActiveTopic(pub.topics[0]); }}
                                className="flex-1 py-1.5 rounded-md text-[10px] font-bold border transition-all duration-200"
                                style={activePubId === pub.id
                                    ? { color: pub.color, borderColor: pub.color, background: pub.color + '18' }
                                    : { color: '#4b5563', borderColor: '#374151', background: 'transparent' }}>
                                {pub.label}
                            </button>
                        ))}
                    </div>

                    {/* Topic picker */}
                    <div className="flex flex-col gap-1">
                        {activePub.topics.map(t => (
                            <button key={t} onClick={() => setActiveTopic(t)}
                                className={`text-left text-[10px] px-3 py-1.5 rounded-md border font-mono transition-all duration-200
                                    ${activeTopic === t
                                        ? 'bg-gray-800 border-gray-500 text-gray-200'
                                        : 'bg-gray-900 border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400'}`}>
                                {t}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => handlePublish(activeTopic, JSON.stringify({ ts: Date.now(), value: Math.round(Math.random() * 100) }))}
                        disabled={!connected || busy}
                        className="w-full py-2 flex items-center justify-center gap-2 rounded-lg font-bold text-xs border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ color: activePub.color, borderColor: activePub.color, background: activePub.color + '15' }}>
                        <Send size={12} /> Publish from {activePub.label}
                    </button>

                    {/* Quick presets */}
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { pub: 'tcu', topic: 'vehicle/telematics/speed', payload: '{"speed":90,"unit":"km/h"}', label: 'Speed' },
                            { pub: 'obd', topic: 'vehicle/status/engine',    payload: '{"rpm":3200,"load":72}',     label: 'Engine' },
                            { pub: 'climate', topic: 'vehicle/hvac/temp',    payload: '{"setpoint":22,"actual":21}', label: 'HVAC' },
                            { pub: 'tcu', topic: 'vehicle/telematics/battery', payload: '{"soc":81,"temp":28}',     label: 'Battery' },
                        ].map(p => {
                            const pub = PUBLISHERS.find(pub => pub.id === p.pub)!;
                            return (
                                <button key={p.label}
                                    onClick={() => { setActivePubId(p.pub as PubId); setActiveTopic(p.topic); handlePublish(p.topic, p.payload); }}
                                    disabled={!connected || busy}
                                    className="text-xs px-2.5 py-2 rounded-lg border font-semibold flex items-center justify-between transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
                                    style={{ color: pub.color, borderColor: pub.color + '60', background: pub.color + '10' }}>
                                    {p.label} <Send size={10} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Subscriber Subscriptions */}
                <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-4 flex flex-col gap-4 w-full">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">Subscriptions</h4>
                    {SUBSCRIBERS.map(sub => (
                        <div key={sub.id} className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <sub.Icon size={11} style={{ color: sub.color }} />
                                <span className="text-[10px] font-bold" style={{ color: sub.color }}>{sub.label}</span>
                                <span className="text-[9px] text-gray-600">{sub.sublabel}</span>
                            </div>
                            <div className="flex flex-col gap-1 pl-4">
                                {sub.presets.map(topic => {
                                    const active = (subSubs[sub.id] || []).includes(topic);
                                    return (
                                        <button key={topic} onClick={() => toggleSub(sub.id as SubId, topic)}
                                            disabled={!connected}
                                            className={`text-left text-[10px] px-2.5 py-1 rounded-md border font-mono transition-all duration-200
                                                disabled:opacity-30 disabled:cursor-not-allowed`}
                                            style={active
                                                ? { color: sub.color, borderColor: sub.color + '80', background: sub.color + '10' }
                                                : { color: '#4b5563', borderColor: '#1f2937', background: 'transparent' }}>
                                            {active ? '✓ ' : '○ '}{topic}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
