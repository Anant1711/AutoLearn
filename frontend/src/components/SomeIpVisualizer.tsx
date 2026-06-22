import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Cpu, Network, Send, Terminal, Play, ShieldAlert, Activity } from 'lucide-react';

interface SomeIpLog {
    text: string;
    type: 'request' | 'response' | 'sd' | 'notify' | 'info';
}

interface Packet {
    id: string; label: string; color: string; textColor: string;
    progress: number; fromX: number; fromY: number; toX: number; toY: number;
}

interface FrameInspector {
    serviceId: string; methodId: string; length: string;
    clientId: string; sessionId: string; protoVer: string;
    ifVer: string; msgType: string; returnCode: string;
    payload: string; label: string;
    type: 'request' | 'response' | 'sd' | 'notify';
}

// ── Layout constants ──
const CLIENT_X = 80;
const SERVER_X = 820;
const SD_X     = 450;
const SD_Y     = 150;

const CLIENTS = [
    { id: 'hu',  label: 'Head Unit',  sublabel: 'SOME/IP Client', y: 90,  color: '#3b82f6' },
    { id: 'ivi', label: 'IVI System', sublabel: 'SOME/IP Client', y: 210, color: '#22d3ee' },
] as const;

const SERVERS = [
    { id: 'engine', label: 'Engine ECU', sublabel: 'Svc 0x0099', y: 90,  color: '#10b981', serviceId: '0099', methodId: '0001', methodName: 'getOdometer()' },
    { id: 'hvac',   label: 'HVAC ECU',   sublabel: 'Svc 0x00B2', y: 210, color: '#f59e0b', serviceId: '00B2', methodId: '0001', methodName: 'setHVAC(temp)' },
] as const;

type ClientId = typeof CLIENTS[number]['id'];
type ServerId = typeof SERVERS[number]['id'];

export const SomeIpVisualizer: React.FC = () => {
    const [activeClientId,  setActiveClientId]  = useState<ClientId>('hu');
    const [offeredServices, setOfferedServices] = useState<Record<ServerId, boolean>>({ engine: false, hvac: false });
    const [discoveredBy,    setDiscoveredBy]    = useState<Record<ClientId, ServerId[]>>({ hu: [], ivi: [] });
    const [subscribedTo,    setSubscribedTo]    = useState<Record<ClientId, ServerId[]>>({ hu: [], ivi: [] });
    const [serverValues,    setServerValues]    = useState({ odometer: 12345, hvacTemp: 22 });
    const [pendingHvacTemp, setPendingHvacTemp] = useState(22);
    const [sessionId,       setSessionId]       = useState(1);
    const [packets,         setPackets]         = useState<Packet[]>([]);
    const [busy,            setBusy]            = useState(false);
    const [inspector,       setInspector]       = useState<FrameInspector | null>(null);
    const [isAutoNotifying, setIsAutoNotifying] = useState(false);
    const [logs, setLogs] = useState<SomeIpLog[]>([
        { text: 'SOME/IP Multi-Client stack initialized. 2 Clients · SD Daemon · 2 Servers.', type: 'info' }
    ]);

    const notifyRef       = useRef<any>(null);
    const logRef          = useRef<HTMLDivElement>(null);
    const aniRefs         = useRef<Map<string, number>>(new Map());
    const subscribedToRef = useRef(subscribedTo);

    useEffect(() => { subscribedToRef.current = subscribedTo; }, [subscribedTo]);
    useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);
    useEffect(() => () => {
        aniRefs.current.forEach(id => cancelAnimationFrame(id));
        if (notifyRef.current) clearInterval(notifyRef.current);
    }, []);

    const addLog = useCallback((text: string, type: SomeIpLog['type'] = 'info') => {
        setLogs(p => [...p.slice(-80), { text: `[SOME/IP] ${text}`, type }]);
    }, []);

    // rAF-based smooth animation — supports concurrent packets via Map
    const animatePacket = useCallback((
        fromX: number, fromY: number, toX: number, toY: number,
        label: string, color: string, textColor: string, dur = 2200
    ): Promise<void> => new Promise(resolve => {
        const id = Math.random().toString(36).slice(2);
        setPackets(p => [...p, { id, label, color, textColor, progress: 0, fromX, fromY, toX, toY }]);
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

    const showFrame = (
        type: FrameInspector['type'], label: string,
        serviceId: string, methodId: string, length: string,
        clientId: string, sessId: string, msgType: string, returnCode: string, payload = ''
    ) => setInspector({ serviceId, methodId, length, clientId, sessionId: sessId, protoVer: '01', ifVer: '01', msgType, returnCode, payload, label, type });

    // ── Service Discovery: Offer ──
    const handleOfferService = async (serverId: ServerId) => {
        if (busy) return;
        const server = SERVERS.find(s => s.id === serverId)!;
        if (offeredServices[serverId]) {
            setOfferedServices(p => ({ ...p, [serverId]: false }));
            setDiscoveredBy(p => ({ hu: p.hu.filter(s => s !== serverId), ivi: p.ivi.filter(s => s !== serverId) }));
            setSubscribedTo(p => ({ hu: p.hu.filter(s => s !== serverId), ivi: p.ivi.filter(s => s !== serverId) }));
            setIsAutoNotifying(false);
            addLog(`${server.label} stopped. Service 0x${server.serviceId} offline.`, 'info');
            return;
        }
        setBusy(true);
        addLog(`${server.label} → SD Offer (Service 0x${server.serviceId}, Instance 0x0001)`, 'sd');
        showFrame('sd', `SD: OFFER ${server.label}`, 'FFFF', '8100', '00000028', '0000', '0001', '02', '00',
            `01 00 ${server.serviceId.match(/.{2}/g)?.join(' ')} 00 01 01 00 00 FF FF FF FF`);
        await animatePacket(SERVER_X, server.y, SD_X, SD_Y, 'SD OFFER', '#f59e0b', '#000');
        setOfferedServices(p => ({ ...p, [serverId]: true }));
        addLog(`Service 0x${server.serviceId} registered on SD Daemon. Instance active.`, 'info');
        setBusy(false);
    };

    // ── Service Discovery: Find ──
    const handleFindService = async (serverId: ServerId) => {
        if (busy) return;
        const server  = SERVERS.find(s => s.id === serverId)!;
        const client  = CLIENTS.find(c => c.id === activeClientId)!;
        setBusy(true);
        addLog(`${client.label} → SD Find Service 0x${server.serviceId}`, 'sd');
        showFrame('sd', `SD: FIND 0x${server.serviceId}`, 'FFFF', '8100', '00000028', '0002', '0001', '02', '00',
            `00 00 ${server.serviceId.match(/.{2}/g)?.join(' ')} 00 01 01 00 00 FF FF FF FF`);
        await animatePacket(CLIENT_X, client.y, SD_X, SD_Y, 'SD FIND', '#f59e0b', '#000');

        if (offeredServices[serverId]) {
            addLog(`SD matched → ${server.label} at 192.168.7.${SERVERS.indexOf(server) + 4}:30509`, 'sd');
            showFrame('sd', 'SD: OFFER MATCHED', 'FFFF', '8100', '00000028', '0000', '0001', '02', '00',
                `01 00 ${server.serviceId.match(/.{2}/g)?.join(' ')} 00 01 01 00 00 FF FF FF FF`);
            await animatePacket(SD_X, SD_Y, CLIENT_X, client.y, 'SD MATCH', '#f59e0b', '#000');
            setDiscoveredBy(p => ({ ...p, [client.id]: [...new Set([...p[client.id], serverId])] }));
            addLog(`${client.label} → discovered ${server.label}`, 'info');
        } else {
            addLog(`Find timeout — Service 0x${server.serviceId} not offered.`, 'info');
        }
        setBusy(false);
    };

    // ── Subscribe Eventgroup ──
    const handleSubscribe = async (serverId: ServerId) => {
        if (busy) return;
        const server = SERVERS.find(s => s.id === serverId)!;
        const client = CLIENTS.find(c => c.id === activeClientId)!;
        const isSubscribed = (subscribedTo[client.id] || []).includes(serverId);

        if (isSubscribed) {
            setSubscribedTo(p => ({ ...p, [client.id]: p[client.id].filter(s => s !== serverId) }));
            addLog(`${client.label} → UNSUBSCRIBE Eventgroup from ${server.label}`, 'sd');
            return;
        }
        if (!(discoveredBy[client.id] || []).includes(serverId)) {
            addLog(`${client.label} must first Find Service 0x${server.serviceId}.`, 'info');
            return;
        }
        setBusy(true);
        addLog(`${client.label} → SD Subscribe Eventgroup 0x4001 (${server.label})`, 'sd');
        showFrame('sd', 'SD: SUBSCRIBE EG', 'FFFF', '8100', '0000002C', '0002', '0002', '02', '00',
            `06 00 ${server.serviceId.match(/.{2}/g)?.join(' ')} 00 01 01 00 00 40 01 00 00`);
        await animatePacket(CLIENT_X, client.y, SERVER_X, server.y, 'SUBSCRIBE', '#8b5cf6', '#fff');
        addLog(`${server.label} → Subscribe ACK`, 'sd');
        showFrame('sd', 'SD: SUBSCRIBE ACK', 'FFFF', '8100', '0000002C', '0000', '0002', '02', '00',
            `07 00 ${server.serviceId.match(/.{2}/g)?.join(' ')} 00 01 01 00 00 40 01 00 00`);
        await animatePacket(SERVER_X, server.y, CLIENT_X, client.y, 'SUB ACK', '#8b5cf6', '#fff');
        setSubscribedTo(p => ({ ...p, [client.id]: [...new Set([...p[client.id], serverId])] }));
        addLog(`${client.label} subscribed to events from ${server.label} ✓`, 'info');
        setBusy(false);
    };

    // ── RPC Method Call ──
    const handleCallMethod = async (serverId: ServerId) => {
        if (busy) return;
        const server = SERVERS.find(s => s.id === serverId)!;
        const client = CLIENTS.find(c => c.id === activeClientId)!;
        if (!(discoveredBy[client.id] || []).includes(serverId)) {
            addLog(`${client.label} must first discover ${server.label}.`, 'info');
            return;
        }
        setBusy(true);
        const sessHex = sessionId.toString(16).toUpperCase().padStart(4, '0');
        addLog(`${client.label} → ${server.methodName} on ${server.label} [Session 0x${sessHex}]`, 'request');

        let reqPayload = '', respPayload = '';
        if (serverId === 'engine') {
            const newOdo = serverValues.odometer + Math.floor(Math.random() * 5 + 1);
            setServerValues(p => ({ ...p, odometer: newOdo }));
            respPayload = newOdo.toString(16).toUpperCase().padStart(8, '0').match(/.{2}/g)?.join(' ') ?? '';
        } else {
            reqPayload = pendingHvacTemp.toString(16).toUpperCase().padStart(2, '0');
            setServerValues(p => ({ ...p, hvacTemp: pendingHvacTemp }));
        }

        showFrame('request', `REQ: ${server.methodName}`, server.serviceId, server.methodId, '00000008',
            '0002', sessHex, '00', '00', reqPayload);
        await animatePacket(CLIENT_X, client.y, SERVER_X, server.y, 'REQUEST', client.color, '#fff');
        setSessionId(p => (p + 1) & 0xFFFF);

        addLog(`${server.label} → response (Session 0x${sessHex})`, 'response');
        showFrame('response', `RESP: ${server.methodName}`, server.serviceId, server.methodId, '0000000C',
            '0002', sessHex, '80', '00', respPayload);
        await animatePacket(SERVER_X, server.y, CLIENT_X, client.y, 'RESPONSE', '#10b981', '#fff');
        setBusy(false);
    };

    // ── Event Notification (fan-out to all subscribed clients) ──
    const triggerNotify = useCallback(async (serverId: ServerId) => {
        const currentSubs = subscribedToRef.current;
        const server = SERVERS.find(s => s.id === serverId)!;
        const subscribedClients = CLIENTS.filter(c => (currentSubs[c.id] || []).includes(serverId));
        if (subscribedClients.length === 0) {
            addLog(`No clients subscribed to events from ${server.label}.`, 'info');
            return;
        }
        const speed = Math.floor(60 + Math.random() * 40);
        const speedHex = speed.toString(16).toUpperCase().padStart(4, '0');
        const speedBytes = speedHex.match(/.{2}/g)?.join(' ') ?? '';
        addLog(`${server.label} → EVENT speedChanged(${speed} km/h) → fan-out to ${subscribedClients.map(c => c.label).join(', ')}`, 'notify');
        showFrame('notify', `EVENT: ${speed} km/h`, server.serviceId, '8001', '0000000A', '0000', '100A', '02', '00', speedBytes);
        // Fan-out simultaneously to all subscribed clients
        await Promise.all(subscribedClients.map(c =>
            animatePacket(SERVER_X, server.y, CLIENT_X, c.y, `EVT ${speed}`, '#a855f7', '#fff', 2200)
        ));
    }, [addLog, animatePacket]);

    // Auto-notify loop
    useEffect(() => {
        if (!isAutoNotifying) {
            if (notifyRef.current) clearInterval(notifyRef.current);
            return;
        }
        notifyRef.current = setInterval(() => {
            const currentSubs = subscribedToRef.current;
            const serverWithSubs = SERVERS.find(s =>
                CLIENTS.some(c => (currentSubs[c.id] || []).includes(s.id))
            );
            if (serverWithSubs) triggerNotify(serverWithSubs.id);
        }, 5000);
        return () => { if (notifyRef.current) clearInterval(notifyRef.current); };
    }, [isAutoNotifying, triggerNotify]);

    const msgTypeLabel = (c: string) => ({ '00': 'REQUEST', '02': 'NOTIFICATION', '80': 'RESPONSE', '81': 'ERROR' }[c] ?? c);

    const anyOffered           = Object.values(offeredServices).some(Boolean);
    const activeClient         = CLIENTS.find(c => c.id === activeClientId)!;
    const clientDiscoveries    = discoveredBy[activeClientId]  ?? [];
    const clientSubscriptions  = subscribedTo[activeClientId]  ?? [];
    const anyClientSubscribed  = CLIENTS.some(c => (subscribedTo[c.id] || []).length > 0);

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-12 bg-gray-950 min-h-full p-4 gap-6 items-start">

            {/* Left Column: Visualizer SVG & Terminal Logs */}
            <div className="lg:col-span-7 flex flex-col gap-6 w-full">
                {/* ── SVG Diagram ── */}
                <div className="bg-[#0d1117] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl w-full">
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-800 bg-gray-900/60">
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                            <Network size={13} className="text-violet-400" /> SOME/IP — 2 Clients · SD Daemon · 2 Servers
                        </span>
                        <div className="flex gap-2 text-[10px] font-mono font-bold">
                            {SERVERS.map(s => (
                                <span key={s.id} className={`px-2 py-0.5 rounded border ${offeredServices[s.id]
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-gray-800/50 text-gray-600 border-gray-700'}`}>
                                    {s.label} {offeredServices[s.id] ? '●' : '○'}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* SVG */}
                    <div className="relative w-full" style={{ paddingBottom: '32%', minHeight: 220 }}>
                        <svg viewBox="0 0 900 295" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                            <defs>
                                <filter id="si-glow-node"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                                <filter id="si-glow-sd">  <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                                <filter id="si-glow-pk">  <feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                            </defs>

                            {/* Column Labels */}
                            <text x={CLIENT_X} y={16} textAnchor="middle" fill="#374151" fontSize="7" fontFamily="monospace" fontWeight="bold" letterSpacing="1">CLIENTS</text>
                            <text x={SD_X}     y={16} textAnchor="middle" fill="#374151" fontSize="7" fontFamily="monospace" fontWeight="bold" letterSpacing="1">SD DAEMON</text>
                            <text x={SERVER_X} y={16} textAnchor="middle" fill="#374151" fontSize="7" fontFamily="monospace" fontWeight="bold" letterSpacing="1">SERVERS</text>

                            {/* SD Bus lines: clients → SD Daemon */}
                            {CLIENTS.map(client => (
                                <line key={client.id}
                                    x1={CLIENT_X + 40} y1={client.y}
                                    x2={SD_X - 32}     y2={SD_Y}
                                    stroke={anyOffered ? '#f59e0b' : '#1f2937'}
                                    strokeWidth="1.5"
                                    strokeDasharray={anyOffered ? '0' : '5 5'}
                                    strokeOpacity={anyOffered ? (activeClientId === client.id ? 0.65 : 0.1) : 0.2}
                                    className="transition-all duration-700" />
                            ))}

                            {/* SD Bus lines: SD Daemon → servers */}
                            {SERVERS.map(server => (
                                <line key={server.id}
                                    x1={SD_X + 32}     y1={SD_Y}
                                    x2={SERVER_X - 40} y2={server.y}
                                    stroke={offeredServices[server.id] ? '#f59e0b' : '#1f2937'}
                                    strokeWidth="1.5"
                                    strokeDasharray={offeredServices[server.id] ? '0' : '5 5'}
                                    strokeOpacity={offeredServices[server.id] ? 0.55 : 0.3}
                                    className="transition-all duration-700" />
                            ))}

                            {/* Direct RPC lines: shown for discovered pairs of active client only */}
                            {CLIENTS.flatMap(client =>
                                SERVERS.map(server => {
                                    if (client.id !== activeClientId) return null;
                                    const disc = (discoveredBy[client.id] || []).includes(server.id);
                                    if (!disc) return null;
                                    const offsetY = client.y < SD_Y ? 10 : -10;
                                    return (
                                        <line key={`${client.id}-${server.id}`}
                                            x1={CLIENT_X + 40} y1={client.y + offsetY}
                                            x2={SERVER_X - 40} y2={server.y + offsetY}
                                            stroke="#6366f1"
                                            strokeWidth="1.5"
                                            strokeOpacity={0.65}
                                            className="transition-all duration-500" />
                                    );
                                })
                            )}

                            {/* ── Moving Packets ── */}
                            {packets.map(pk => {
                                const cx = pk.fromX + (pk.toX - pk.fromX) * (pk.progress / 100);
                                const cy = pk.fromY + (pk.toY - pk.fromY) * (pk.progress / 100);
                                return (
                                    <g key={pk.id}>
                                        <circle cx={cx} cy={cy} r={18} fill={pk.color} opacity={0.07} />
                                        <circle cx={cx} cy={cy} r={10} fill={pk.color} opacity={0.15} />
                                        <circle cx={cx} cy={cy} r={5.5} fill={pk.color} filter="url(#si-glow-pk)" />
                                        <rect x={cx - 24} y={cy - 30} width={48} height={13} rx="3" fill={pk.color} opacity={0.92} />
                                        <text x={cx} y={cy - 21} textAnchor="middle" fill={pk.textColor}
                                            fontSize="6" fontWeight="bold" fontFamily="monospace">{pk.label}</text>
                                    </g>
                                );
                            })}

                            {/* ── Client Nodes ── */}
                            {CLIENTS.map(client => {
                                const isActive = activeClientId === client.id;
                                const disc     = (discoveredBy[client.id] || []);
                                const subs     = (subscribedTo[client.id] || []);
                                return (
                                    <g key={client.id} style={{ cursor: 'pointer' }} onClick={() => setActiveClientId(client.id)}>
                                        <rect x={CLIENT_X - 40} y={client.y - 42} width={80} height={84} rx="14"
                                            fill={isActive ? '#071428' : '#0d1117'}
                                            stroke={isActive ? client.color : '#2d3748'} strokeWidth={isActive ? 2.5 : 1.5}
                                            filter={isActive ? 'url(#si-glow-node)' : undefined}
                                            className="transition-all duration-400" />
                                        <foreignObject x={CLIENT_X - 14} y={client.y - 26} width={28} height={28}>
                                            <div className="w-full h-full flex items-center justify-center"
                                                style={{ color: isActive ? client.color : '#4b5563' }}>
                                                <Cpu size={22} />
                                            </div>
                                        </foreignObject>
                                        <text x={CLIENT_X} y={client.y + 30} textAnchor="middle"
                                            fill={isActive ? client.color : '#6b7280'} fontSize="8" fontWeight="bold" fontFamily="sans-serif">{client.label}</text>
                                        <text x={CLIENT_X} y={client.y + 41} textAnchor="middle"
                                            fill="#374151" fontSize="6" fontFamily="monospace">SOME/IP Client</text>
                                        {/* Active indicator dot */}
                                        {isActive && (
                                            <circle cx={CLIENT_X + 34} cy={client.y - 36} r={6} fill={client.color} />
                                        )}
                                        {/* Discovery badges */}
                                        {disc.map((sId, idx) => {
                                            const sv = SERVERS.find(s => s.id === sId)!;
                                            return <circle key={sId} cx={CLIENT_X + 34} cy={client.y - 20 + idx * 14} r={4}
                                                fill={sv.color} opacity={0.85} />;
                                        })}
                                        {/* Subscription badges */}
                                        {subs.length > 0 && (
                                            <rect x={CLIENT_X - 40} y={client.y - 42} width={80} height={84} rx="14"
                                                fill="none" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 3" />
                                        )}
                                    </g>
                                );
                            })}

                            {/* ── SD Daemon (smaller) ── */}
                            <g>
                                <circle cx={SD_X} cy={SD_Y} r={30}
                                    fill={anyOffered ? '#1a1100' : '#111827'}
                                    stroke={anyOffered ? '#f59e0b' : '#374151'} strokeWidth="2"
                                    filter={anyOffered ? 'url(#si-glow-sd)' : undefined}
                                    className="transition-all duration-500" />
                                <foreignObject x={SD_X - 11} y={SD_Y - 14} width={22} height={22}>
                                    <div className="w-full h-full flex items-center justify-center"
                                        style={{ color: anyOffered ? '#fbbf24' : '#4b5563' }}>
                                        <Network size={17} />
                                    </div>
                                </foreignObject>
                                <text x={SD_X} y={SD_Y + 42} textAnchor="middle"
                                    fill={anyOffered ? '#fcd34d' : '#6b7280'} fontSize="8" fontWeight="bold" fontFamily="sans-serif">SD Daemon</text>
                                <text x={SD_X} y={SD_Y + 53} textAnchor="middle"
                                    fill="#374151" fontSize="6" fontFamily="monospace">Service Registry</text>
                            </g>

                            {/* ── Server Nodes ── */}
                            {SERVERS.map(server => {
                                const offered  = offeredServices[server.id];
                                const subCount = CLIENTS.filter(c => (subscribedTo[c.id] || []).includes(server.id)).length;
                                return (
                                    <g key={server.id}>
                                        <rect x={SERVER_X - 40} y={server.y - 42} width={80} height={84} rx="14"
                                            fill={offered ? '#071a10' : '#111827'}
                                            stroke={offered ? server.color : '#2d3748'} strokeWidth={offered ? 2 : 1.5}
                                            filter={offered ? 'url(#si-glow-node)' : undefined}
                                            className="transition-all duration-500" />
                                        <foreignObject x={SERVER_X - 14} y={server.y - 26} width={28} height={28}>
                                            <div className="w-full h-full flex items-center justify-center"
                                                style={{ color: offered ? server.color : '#4b5563' }}>
                                                <Cpu size={22} />
                                            </div>
                                        </foreignObject>
                                        <text x={SERVER_X} y={server.y + 30} textAnchor="middle"
                                            fill={offered ? server.color : '#6b7280'} fontSize="8" fontWeight="bold" fontFamily="sans-serif">{server.label}</text>
                                        <text x={SERVER_X} y={server.y + 41} textAnchor="middle"
                                            fill="#374151" fontSize="6" fontFamily="monospace">Svc 0x{server.serviceId}</text>
                                        {/* Subscriber count badge */}
                                        {subCount > 0 && (
                                            <>
                                                <circle cx={SERVER_X - 34} cy={server.y - 36} r={10} fill="#a855f7" />
                                                <text x={SERVER_X - 34} y={server.y - 32} textAnchor="middle" fill="white"
                                                    fontSize="8" fontWeight="bold" fontFamily="monospace">{subCount}</text>
                                            </>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    {/* Frame Inspector */}
                    <div className="border-t border-gray-800 bg-gray-900/30 px-5 py-3">
                        <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1.5 flex items-center gap-2">
                            <Activity size={11} className="text-violet-500" /> SOME/IP Frame Header Inspector
                        </div>
                        {inspector ? (
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                                    <span className="px-2 py-0.5 bg-blue-900/50 border border-blue-800/50 text-blue-300 rounded" title="Service ID · Method ID">
                                        {inspector.serviceId.match(/.{2}/g)?.join(' ')} {inspector.methodId.match(/.{2}/g)?.join(' ')}
                                    </span>
                                    <span className="px-2 py-0.5 bg-amber-900/50 border border-amber-800/50 text-amber-300 rounded" title="Length">
                                        {inspector.length.match(/.{2}/g)?.join(' ')}
                                    </span>
                                    <span className="px-2 py-0.5 bg-purple-900/50 border border-purple-800/50 text-purple-300 rounded" title="Client ID · Session ID">
                                        {inspector.clientId.match(/.{2}/g)?.join(' ')} {inspector.sessionId.match(/.{2}/g)?.join(' ')}
                                    </span>
                                    <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-300 rounded">
                                        {inspector.protoVer} {inspector.ifVer}
                                    </span>
                                    <span className="px-2 py-0.5 bg-red-900/50 border border-red-800/50 text-red-300 rounded" title="Message Type">
                                        {inspector.msgType}
                                    </span>
                                    <span className="px-2 py-0.5 bg-emerald-900/50 border border-emerald-800/50 text-emerald-300 rounded" title="Return Code">
                                        {inspector.returnCode}
                                    </span>
                                    {inspector.payload && (
                                        <span className="px-2 py-0.5 bg-cyan-900/50 border border-cyan-800/50 text-cyan-300 rounded" title="Payload">
                                            {inspector.payload}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-0.5 font-mono text-[10px] text-gray-400">
                                    <span><b className="text-blue-400">ServiceID:</b> 0x{inspector.serviceId}</span>
                                    <span><b className="text-blue-400">MethodID:</b> 0x{inspector.methodId}</span>
                                    <span><b className="text-amber-400">Length:</b> {parseInt(inspector.length, 16)} bytes</span>
                                    <span><b className="text-purple-400">Session:</b> 0x{inspector.sessionId}</span>
                                    <span className="col-span-2"><b className="text-red-400">MsgType:</b> 0x{inspector.msgType} ({msgTypeLabel(inspector.msgType)})</span>
                                    <span className="col-span-2"><b className="text-emerald-400">RetCode:</b> 0x{inspector.returnCode} ({inspector.returnCode === '00' ? 'E_OK' : 'E_NOT_OK'})</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[11px] text-gray-600 italic font-mono">
                                No frame active. Trigger SD discovery or an RPC call to inspect.
                            </p>
                        )}
                    </div>
                </div>

                {/* Terminal */}
                <div className="bg-[#0a0e13] border border-gray-800 rounded-2xl p-4 flex flex-col h-[380px] w-full">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-800">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                        <span className="text-[10px] font-mono text-gray-600 ml-1 flex items-center gap-1">
                            <Terminal size={10} /> someip_multi_client.log
                        </span>
                        <span className="ml-auto text-[9px] font-mono" style={{ color: activeClient.color }}>
                            Active: {activeClient.label}
                        </span>
                    </div>
                    <div ref={logRef} className="flex-1 overflow-y-auto font-mono text-[11px] leading-5 space-y-0.5 scrollbar-hide">
                        {logs.map((l, i) => (
                            <div key={i} className={
                                l.type === 'sd'       ? 'text-amber-400' :
                                l.type === 'request'  ? 'text-blue-400' :
                                l.type === 'response' ? 'text-emerald-400' :
                                l.type === 'notify'   ? 'text-purple-400 font-semibold' : 'text-gray-500'}>
                                {l.text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Controls */}
            <div className="lg:col-span-5 flex flex-col gap-6 w-full">
                {/* Active Client Selector */}
                <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-4 flex flex-col gap-3 w-full">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">
                        Active Client <span className="text-gray-700 normal-case font-normal">(click node in diagram)</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        {CLIENTS.map(client => (
                            <button key={client.id} onClick={() => setActiveClientId(client.id)}
                                className="py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 border"
                                style={activeClientId === client.id
                                    ? { color: client.color, borderColor: client.color, background: client.color + '18' }
                                    : { color: '#4b5563', borderColor: '#374151', background: 'transparent' }}>
                                <Cpu size={12} /> {client.label}
                            </button>
                        ))}
                    </div>
                    {/* Discovery status */}
                    <div className="flex flex-col gap-1">
                        {SERVERS.map(s => {
                            const disc = clientDiscoveries.includes(s.id);
                            const sub  = clientSubscriptions.includes(s.id);
                            return (
                                <div key={s.id} className="flex items-center gap-2 text-[10px] font-mono">
                                    <div className={`w-1.5 h-1.5 rounded-full ${disc ? '' : 'bg-gray-700'}`}
                                        style={disc ? { background: s.color } : {}} />
                                    <span style={{ color: disc ? s.color : '#4b5563' }}>{s.label}</span>
                                    {disc && <span className="text-gray-600">— discovered</span>}
                                    {sub  && <span className="text-purple-500 ml-auto">● subscribed</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Service Discovery */}
                <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-4 flex flex-col gap-4 w-full">
                    <h4 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest border-b border-gray-800 pb-2">
                        1 · Service Discovery (SD)
                    </h4>
                    {SERVERS.map(server => (
                        <div key={server.id} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full transition-colors" style={{ background: offeredServices[server.id] ? server.color : '#374151' }} />
                                <span className="text-[10px] font-bold transition-colors" style={{ color: offeredServices[server.id] ? server.color : '#6b7280' }}>
                                    {server.label}
                                </span>
                                <span className="text-[9px] text-gray-600 font-mono">0x{server.serviceId}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pl-4">
                                <button onClick={() => handleOfferService(server.id)} disabled={busy}
                                    className={`py-1.5 text-[10px] font-bold rounded-md border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
                                        ${offeredServices[server.id]
                                            ? 'bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/50'
                                            : 'bg-emerald-900/30 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50'}`}>
                                    {offeredServices[server.id] ? 'Stop Offer' : 'Offer Service'}
                                </button>
                                <button onClick={() => handleFindService(server.id)} disabled={busy}
                                    className="py-1.5 text-[10px] font-bold rounded-md border bg-amber-900/30 border-amber-800 text-amber-400 hover:bg-amber-900/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200">
                                    Find ({activeClient.label})
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* RPC + Events */}
                <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-4 flex flex-col gap-3 w-full">
                    <h4 className="text-xs font-bold text-blue-500/80 uppercase tracking-widest border-b border-gray-800 pb-2">
                        2 · RPC Methods + Events
                    </h4>
                    {SERVERS.map(server => {
                        const disc = clientDiscoveries.includes(server.id);
                        const sub  = clientSubscriptions.includes(server.id);
                        return (
                            <div key={server.id}
                                className={`flex flex-col gap-2 p-3 rounded-xl border transition-all duration-300 ${disc ? 'border-gray-700 bg-gray-900/40' : 'border-gray-800/50 opacity-40'}`}>
                                <div className="flex items-center gap-2 text-[10px]">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: server.color }} />
                                    <span style={{ color: server.color }} className="font-bold">{server.label}</span>
                                    <span className="text-[9px] text-gray-600 font-mono">{server.methodName}</span>
                                </div>

                                {/* HVAC slider */}
                                {server.id === 'hvac' && (
                                    <div className="flex items-center gap-2">
                                        <input type="range" min={16} max={28} value={pendingHvacTemp}
                                            onChange={e => setPendingHvacTemp(Number(e.target.value))}
                                            disabled={!disc || busy}
                                            className="flex-1 accent-amber-500 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer disabled:opacity-40" />
                                        <span className="text-[10px] font-mono font-bold text-amber-400 w-10 text-right">{pendingHvacTemp}°C</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-1.5">
                                    <button onClick={() => handleCallMethod(server.id)} disabled={!disc || busy}
                                        className="py-1.5 col-span-1 text-[9px] font-bold rounded-md border bg-blue-900/30 border-blue-800 text-blue-300 hover:bg-blue-900/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1">
                                        <Send size={8} /> Call
                                    </button>
                                    <button onClick={() => handleSubscribe(server.id)} disabled={!disc || busy}
                                        className={`py-1.5 col-span-2 text-[9px] font-bold rounded-md border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
                                            ${sub ? 'bg-purple-900/40 border-purple-700 text-purple-300'
                                                  : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-purple-800 hover:text-purple-400'}`}>
                                        {sub ? '✓ Subscribed Events' : 'Subscribe Events'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Event controls */}
                    <div className="flex gap-2 pt-1 border-t border-gray-800">
                        <button
                            onClick={() => {
                                const s = SERVERS.find(sv => CLIENTS.some(c => (subscribedTo[c.id] || []).includes(sv.id)));
                                if (s) triggerNotify(s.id);
                            }}
                            disabled={!anyClientSubscribed || busy}
                            className="flex-1 py-2 text-xs font-bold rounded-md border bg-purple-900/30 border-purple-800 text-purple-300 hover:bg-purple-900/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            Fire Event
                        </button>
                        <button onClick={() => setIsAutoNotifying(p => !p)} disabled={!anyClientSubscribed}
                            className={`flex-1 py-2 text-xs font-bold rounded-md border transition-all duration-200 disabled:opacity-30 flex items-center justify-center gap-1
                                ${isAutoNotifying
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-300 animate-pulse'
                                    : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-purple-400 hover:border-purple-800'}`}>
                            <Play size={11} /> {isAutoNotifying ? 'Stop Auto' : 'Auto Notify'}
                        </button>
                    </div>

                    {/* Live values */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-800">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-center">
                            <div className="text-[9px] text-gray-600 uppercase font-bold mb-1">Odometer</div>
                            <div className="font-mono font-bold text-sm text-emerald-400">{serverValues.odometer} km</div>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-center">
                            <div className="text-[9px] text-gray-600 uppercase font-bold mb-1">HVAC</div>
                            <div className="font-mono font-bold text-sm text-amber-400">{serverValues.hvacTemp}°C</div>
                        </div>
                    </div>

                    {/* Protocol info */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/60 border border-gray-800 rounded-lg">
                        <ShieldAlert size={12} className="text-violet-500 flex-shrink-0" />
                        <span className="text-[9px] font-mono text-gray-500">Ethernet-Based Service-Oriented RPC over UDP/TCP</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
