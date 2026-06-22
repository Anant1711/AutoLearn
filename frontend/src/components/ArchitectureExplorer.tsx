import React, { useState, useEffect, useRef } from 'react';
import { Network, Cpu, Info, X, Wifi, Radio, Zap, Shield, Activity, Terminal, AlertTriangle, Flame, Lock, Unlock, Settings, RefreshCw } from 'lucide-react';

interface ECU {
    id: string;
    name: string;
    type: 'gateway' | 'powertrain' | 'body' | 'chassis' | 'infotainment' | 'adas' | 'diagnostics';
    x: number;
    y: number;
    description: string;
    signals: string[];
}

interface Packet {
    id: string;
    label: string;
    color: string;
    progress: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
}

interface ZoneNode {
    id: string;
    name: string;
    description: string;
    x: number;
    y: number;
}

const ECUS: ECU[] = [
    // Gateway / HPC
    { id: 'gw', name: 'Gateway', type: 'gateway', x: 400, y: 300, description: 'Central Gateway Module. Bridges all vehicle domains and network buses, performing message translation and routing in real time.', signals: ['All Routing Traffic'] },

    // Powertrain (Red)
    { id: 'ecm', name: 'ECM', type: 'powertrain', x: 250, y: 150, description: 'Engine Control Module. Manages engine performance, fuel injection, and ignition parameters.', signals: ['Engine_Speed', 'Engine_Temp', 'Throttle_Pos'] },
    { id: 'tcm', name: 'TCM', type: 'powertrain', x: 350, y: 100, description: 'Transmission Control Module. Controls gear shifts and torque converter lockup.', signals: ['Gear_Pos', 'Trans_Temp'] },
    { id: 'bms', name: 'BMS', type: 'powertrain', x: 150, y: 150, description: 'Battery Management System. Monitors HV battery state of charge (SOC), health, and cell voltage.', signals: ['HV_Voltage', 'SOC', 'SOH'] },
    { id: 'obc', name: 'OBC', type: 'powertrain', x: 450, y: 100, description: 'On-Board Charger. Controls AC utility grid charging to HV battery pack.', signals: ['Charge_Current', 'Plug_Status'] },

    // Chassis (Orange)
    { id: 'abs', name: 'ABS/ESP', type: 'chassis', x: 150, y: 300, description: 'Electronic Stability Program. Regulates active braking pressures and wheelslip.', signals: ['Wheel_Speed_FL', 'Yaw_Rate', 'Brake_Pressure'] },
    { id: 'eps', name: 'EPS', type: 'chassis', x: 150, y: 400, description: 'Electric Power Steering. Directs rack steering assistance torque values.', signals: ['Steering_Torque'] },
    { id: 'sas', name: 'SAS', type: 'chassis', x: 250, y: 450, description: 'Steering Angle Sensor. Optically measures steering wheel rotational position.', signals: ['Steering_Angle'] },

    // Body (Blue)
    { id: 'bcm', name: 'BCM', type: 'body', x: 600, y: 150, description: 'Body Control Module. Master controller for cabin lights, locks, and wiper logic.', signals: ['Door_Status', 'Light_Status', 'Wiper_Status'] },
    { id: 'ipc', name: 'IPC', type: 'body', x: 650, y: 300, description: 'Instrument Panel Cluster. Displays speed, gauges, diagnostics, and warnings to driver.', signals: ['Odometer', 'Fuel_Level'] },
    { id: 'hvac', name: 'HVAC', type: 'body', x: 700, y: 150, description: 'Heating, Ventilation, and Air Conditioning controller.', signals: ['Cabin_Temp', 'Fan_Speed'] },
    { id: 'door_fl', name: 'Door FL', type: 'body', x: 550, y: 50, description: 'Front Left Door ECU. Manages local window regulator and power lock.', signals: ['Window_Pos', 'Lock_Status'] },

    // Infotainment (Purple)
    { id: 'hu', name: 'Head Unit', type: 'infotainment', x: 600, y: 450, description: 'Central Infotainment Head Unit. Serves navigation, multimedia, and UI controls.', signals: ['Audio_Vol', 'Nav_GPS'] },
    { id: 'tcu', name: 'TCU', type: 'infotainment', x: 700, y: 450, description: 'Telematics Control Unit. Serves 4G/5G OTA cloud connectivity and emergency eCall services.', signals: ['Cell_Signal', 'GPS_Lat', 'GPS_Long'] },

    // ADAS (Green)
    { id: 'radar', name: 'F-Radar', type: 'adas', x: 400, y: 500, description: 'Front Radar sensor. Supplies object tracking telemetry for ACC and emergency braking.', signals: ['Obj_Dist', 'Obj_Rel_Speed'] },
    { id: 'camera', name: 'F-Camera', type: 'adas', x: 500, y: 500, description: 'Front Lane/Object Camera. Computes lane geometry and speed limit sign symbols.', signals: ['Lane_Type', 'Speed_Limit'] },

    // Diagnostics (Yellow)
    { id: 'obd', name: 'OBD-II Port', type: 'diagnostics', x: 280, y: 300, description: 'On-Board Diagnostics Port. Used to connect external scan tools and send UDS diagnostic messages (ISO 14229) to vehicle ECUs.', signals: [] }
];

const ZONES: ZoneNode[] = [
    { id: 'zone_fl', name: 'Zone Front-Left', description: 'Zonal Controller (Front-Left). Aggregates physical inputs from engine, battery, and left front door, routing them onto the Ethernet backbone.', x: 280, y: 200 },
    { id: 'zone_fr', name: 'Zone Front-Right', description: 'Zonal Controller (Front-Right). Aggregates chassis inputs, right body sensors, and forward cameras.', x: 520, y: 200 },
    { id: 'zone_rl', name: 'Zone Rear-Left', description: 'Zonal Controller (Rear-Left). Manages rear braking, chassis steering feedback, and rear chassis sensors.', x: 280, y: 400 },
    { id: 'zone_rr', name: 'Zone Rear-Right', description: 'Zonal Controller (Rear-Right). Aggregates HVAC, infotainment, and telematics systems.', x: 520, y: 400 }
];

export const ArchitectureExplorer: React.FC = () => {
    // Basic Layout states
    const [architectureMode, setArchitectureMode] = useState<'domain' | 'zonal'>('domain');
    const [selectedECU, setSelectedECU] = useState<ECU | null>(null);
    const [packets, setPackets] = useState<Packet[]>([]);
    const [busy, setBusy] = useState(false);
    const [gatewayGlow, setGatewayGlow] = useState(false);
    const [flashedEcus, setFlashedEcus] = useState<string[]>([]);
    
    // Logs State
    const [logs, setLogs] = useState<string[]>([
        'Central Gateway Controller online. Ready to route diagnostics packets.'
    ]);
    
    // Bus Load State
    const [busLoads, setBusLoads] = useState({
        pt: 45,
        chassis: 30,
        body: 18,
        lin: 5,
        eth: 1.5,
        adas: 10
    });

    // Cybersecurity simulator states
    const [secOcEnabled, setSecOcEnabled] = useState(false);
    const [attackActive, setAttackActive] = useState(false);
    const [isEngineSpoofed, setIsEngineSpoofed] = useState(false);

    // Fault injection states
    const [chassisCanFault, setChassisCanFault] = useState(false);
    const [ethernetRingFault, setEthernetRingFault] = useState(false);
    const [offlineEcus, setOfflineEcus] = useState<string[]>([]);

    // UDS states
    const [udsSession, setUdsSession] = useState<'default' | 'extended'>('default');
    const [udsSecurity, setUdsSecurity] = useState<'locked' | 'unlocked'>('locked');
    const [udsSeedRequested, setUdsSeedRequested] = useState(false);
    const [udsTargetEcu, setUdsTargetEcu] = useState<string>('ecm');

    const terminalContainerRef = useRef<HTMLDivElement>(null);

    // Auto scroll diagnostic log container (scrolls ONLY the container, leaving window scroll position unchanged)
    useEffect(() => {
        if (terminalContainerRef.current) {
            terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // Live background bus noise
    useEffect(() => {
        const interval = setInterval(() => {
            setBusLoads(prev => {
                const faultChassis = chassisCanFault ? 0 : Math.min(80, Math.max(10, Math.round(prev.chassis + (Math.random() * 4 - 2))));
                return {
                    pt: Math.min(85, Math.max(15, Math.round(prev.pt + (Math.random() * 4 - 2)))),
                    chassis: faultChassis,
                    body: Math.min(60, Math.max(8, Math.round(prev.body + (Math.random() * 2 - 1)))),
                    lin: Math.min(35, Math.max(2, Math.round(prev.lin + (Math.random() * 2 - 1)))),
                    eth: Math.min(15, Math.max(0.2, Number((prev.eth + (Math.random() * 0.4 - 0.2)).toFixed(1)))),
                    adas: Math.min(75, Math.max(5, Math.round(prev.adas + (Math.random() * 3 - 1.5)))),
                };
            });
        }, 1500);
        return () => clearInterval(interval);
    }, [chassisCanFault]);

    const addLog = (text: string) => {
        setLogs(prev => [...prev.slice(-40), `[${new Date().toLocaleTimeString()}] ${text}`]);
    };

    const getBusColor = (type: ECU['type']): string => {
        if (type === 'powertrain') return '#ef4444'; // Red
        if (type === 'chassis') return '#f97316';    // Orange
        if (type === 'body') return '#3b82f6';       // Blue
        if (type === 'infotainment') return '#a855f7'; // Purple
        if (type === 'adas') return '#10b981';       // Green
        if (type === 'diagnostics') return '#facc15'; // Yellow
        return '#34d399';
    };

    const getBusColorForNode = (nodeId: string): string => {
        if (nodeId === 'door_fl') return '#06b6d4'; // LIN Cyan
        if (nodeId.startsWith('zone_')) return '#a855f7'; // Ethernet Purple
        const node = ECUS.find(e => e.id === nodeId);
        if (!node) return '#34d399';
        return getBusColor(node.type);
    };

    // Retrieve dynamically positioned coordinates based on architecture mode
    const getEcuCoords = (id: string): { x: number, y: number } => {
        if (architectureMode === 'domain') {
            const ecu = ECUS.find(e => e.id === id);
            return ecu ? { x: ecu.x, y: ecu.y } : { x: 400, y: 300 };
        } else {
            // Zonal Mode Coordinates
            const zonalCoords: Record<string, { x: number, y: number }> = {
                gw: { x: 400, y: 300 }, // HPC
                ecm: { x: 170, y: 120 },
                bms: { x: 120, y: 180 },
                door_fl: { x: 170, y: 240 },
                radar: { x: 350, y: 100 },
                obc: { x: 630, y: 120 },
                tcm: { x: 680, y: 180 },
                bcm: { x: 630, y: 240 },
                camera: { x: 450, y: 100 },
                abs: { x: 170, y: 380 },
                eps: { x: 120, y: 420 },
                sas: { x: 170, y: 480 },
                hvac: { x: 630, y: 380 },
                hu: { x: 680, y: 420 },
                tcu: { x: 630, y: 480 },
                ipc: { x: 400, y: 150 },
                obd: { x: 280, y: 300 },
                zone_fl: { x: 280, y: 200 },
                zone_fr: { x: 520, y: 200 },
                zone_rl: { x: 280, y: 400 },
                zone_rr: { x: 520, y: 400 }
            };
            return zonalCoords[id] || { x: 400, y: 300 };
        }
    };

    const getEcuZoneId = (ecuId: string): string => {
        if (['ecm', 'bms', 'door_fl', 'radar'].includes(ecuId)) return 'zone_fl';
        if (['obc', 'bcm', 'camera', 'ipc', 'tcm'].includes(ecuId)) return 'zone_fr';
        if (['abs', 'eps', 'sas'].includes(ecuId)) return 'zone_rl';
        if (['hvac', 'hu', 'tcu'].includes(ecuId)) return 'zone_rr';
        return '';
    };

    // Calculate routing coordinate paths from/to Gateway (Domain Mode)
    const getPathToGateway = (nodeId: string): string[] => {
        if (nodeId === 'hvac') {
            return ['hvac', 'bcm', 'gw'];
        }
        if (nodeId === 'door_fl') {
            return ['door_fl', 'bcm']; // LIN ends at BCM master
        }
        if (nodeId === 'tcu') {
            return ['tcu', 'hu', 'gw'];
        }
        return [nodeId, 'gw'];
    };

    const getPathFromGateway = (destId: string): string[] => {
        const path = getPathToGateway(destId);
        return [...path].reverse();
    };

    const getBackbonePath = (fromZone: string, toZone: string): string[] => {
        if (fromZone === toZone) return [fromZone];
        
        // Ring sequence: zone_fl -> zone_fr -> zone_rr -> zone_rl -> zone_fl
        const ring = ['zone_fl', 'zone_fr', 'zone_rr', 'zone_rl'];
        const fromIdx = ring.indexOf(fromZone);
        const toIdx = ring.indexOf(toZone);
        
        if (fromIdx === -1 || toIdx === -1) return [fromZone, toZone];
        
        // Direction 1: Clockwise path
        const pathCW: string[] = [];
        let curr = fromIdx;
        while (curr !== toIdx) {
            pathCW.push(ring[curr]);
            curr = (curr + 1) % ring.length;
        }
        pathCW.push(ring[toIdx]);
        
        // Direction 2: Counter-Clockwise path
        const pathCCW: string[] = [];
        curr = fromIdx;
        while (curr !== toIdx) {
            pathCCW.push(ring[curr]);
            curr = (curr - 1 + ring.length) % ring.length;
        }
        pathCCW.push(ring[toIdx]);
        
        const hasFaultyLink = (path: string[]): boolean => {
            if (!ethernetRingFault) return false;
            for (let i = 0; i < path.length - 1; i++) {
                const u = path[i];
                const v = path[i + 1];
                if ((u === 'zone_fl' && v === 'zone_rl') || (u === 'zone_rl' && v === 'zone_fl')) {
                    return true;
                }
            }
            return false;
        };
        
        const cwFault = hasFaultyLink(pathCW);
        const ccwFault = hasFaultyLink(pathCCW);
        
        if (cwFault && !ccwFault) return pathCCW;
        if (!cwFault && ccwFault) return pathCW;
        if (cwFault && ccwFault) {
            // Both backbone paths cut, fallback to Central HPC star routing
            return [fromZone, 'gw', toZone];
        }
        
        return pathCW.length <= pathCCW.length ? pathCW : pathCCW;
    };

    const getPathPoints = (nodeIds: string[]): Array<{ x: number, y: number }> => {
        return nodeIds.map(id => getEcuCoords(id));
    };

    // Dynamic ECU Details retrieval (names and function desc in Zonal mode)
    const getEcuDetails = (ecu: ECU): ECU => {
        if (ecu.id === 'gw' && architectureMode === 'zonal') {
            return {
                ...ecu,
                name: 'Central HPC',
                description: 'Central High-Performance Computer. Serves as the central brain of the Zonal architecture. Executes safety-critical computations, application middleware, and orchestrates high-speed zonal ring communications.'
            };
        }
        return ecu;
    };

    // Animate a packet along a multi-segment path
    const animatePacketAlongPath = (
        points: Array<{ x: number, y: number }>,
        label: string, color: string, dur = 1000
    ): Promise<void> => new Promise(resolve => {
        if (points.length < 2) { resolve(); return; }
        const id = Math.random().toString(36).slice(2);
        
        setPackets(p => [...p, { id, label, color, progress: 0, fromX: points[0].x, fromY: points[0].y, toX: points[0].x, toY: points[0].y }]);
        
        const start = performance.now();
        const tick = (now: number) => {
            const elapsed = now - start;
            const t = Math.min(elapsed / dur, 1);
            
            const numSegments = points.length - 1;
            const segmentProgress = t * numSegments;
            const segmentIndex = Math.min(Math.floor(segmentProgress), numSegments - 1);
            const localT = segmentProgress - segmentIndex;
            
            const pStart = points[segmentIndex];
            const pEnd = points[segmentIndex + 1];
            
            const cx = pStart.x + (pEnd.x - pStart.x) * localT;
            const cy = pStart.y + (pEnd.y - pStart.y) * localT;
            
            setPackets(prev => prev.map(pk => {
                if (pk.id === id) {
                    return { ...pk, fromX: cx, fromY: cy, progress: t * 100 };
                }
                return pk;
            }));
            
            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                setPackets(prev => prev.filter(pk => pk.id !== id));
                resolve();
            }
        };
        requestAnimationFrame(tick);
    });

    const handleSimulateSignal = async (signalName: string, sourceEcu: ECU) => {
        if (busy) return;
        setBusy(true);
        
        let dests: string[] = [];
        let busLabel = 'CAN';
        let busKey: keyof typeof busLoads = 'pt';
        
        // Define signal routes and bus domains
        if (signalName === 'Engine_Speed' || signalName === 'Engine_Temp') {
            dests = ['ipc'];
            busLabel = 'PT-CAN (High-Speed)';
            busKey = 'pt';
        } else if (signalName === 'Throttle_Pos') {
            dests = ['tcm', 'ipc'];
            busLabel = 'PT-CAN (High-Speed)';
            busKey = 'pt';
        } else if (signalName === 'Gear_Pos' || signalName === 'Trans_Temp') {
            dests = ['ipc'];
            busLabel = 'PT-CAN (High-Speed)';
            busKey = 'pt';
        } else if (signalName === 'SOC' || signalName === 'SOH' || signalName === 'HV_Voltage') {
            dests = ['ipc', 'hu'];
            busLabel = 'PT-CAN (High-Speed)';
            busKey = 'pt';
        } else if (signalName === 'Charge_Current' || signalName === 'Plug_Status') {
            dests = ['bms', 'ipc'];
            busLabel = 'PT-CAN (High-Speed)';
            busKey = 'pt';
        } else if (signalName === 'Window_Pos' || signalName === 'Lock_Status') {
            dests = ['bcm'];
            busLabel = 'LIN (Single-Wire)';
            busKey = 'lin';
        } else if (signalName === 'Door_Status' || signalName === 'Light_Status' || signalName === 'Wiper_Status') {
            dests = ['ipc'];
            busLabel = 'Body-CAN (Low-Speed)';
            busKey = 'body';
        } else if (signalName === 'Cabin_Temp' || signalName === 'Fan_Speed') {
            dests = ['ipc', 'hu'];
            busLabel = 'Body-CAN (Low-Speed)';
            busKey = 'body';
        } else if (signalName === 'Steering_Angle' || signalName === 'Steering_Torque') {
            dests = ['abs', 'ecm'];
            busLabel = 'Chassis-CAN';
            busKey = 'chassis';
        } else if (signalName === 'Wheel_Speed_FL' || signalName === 'Yaw_Rate' || signalName === 'Brake_Pressure') {
            dests = ['ecm', 'ipc'];
            busLabel = 'Chassis-CAN';
            busKey = 'chassis';
        } else if (signalName === 'Obj_Dist' || signalName === 'Obj_Rel_Speed') {
            dests = ['abs', 'ecm'];
            busLabel = 'ADAS-CAN-FD';
            busKey = 'adas';
        } else if (signalName === 'Lane_Type' || signalName === 'Speed_Limit') {
            dests = ['ipc', 'hu'];
            busLabel = 'ADAS-CAN-FD';
            busKey = 'adas';
        } else if (signalName === 'Audio_Vol' || signalName === 'Nav_GPS') {
            dests = ['ipc'];
            busLabel = 'Ethernet (100Base-T1)';
            busKey = 'eth';
        } else if (signalName === 'GPS_Lat' || signalName === 'GPS_Long' || signalName === 'Cell_Signal') {
            dests = ['hu'];
            busLabel = 'Ethernet (Telematics Link)';
            busKey = 'eth';
        }

        // Check if physical fault blocks transmission
        if (chassisCanFault && sourceEcu.type === 'chassis') {
            addLog(`[FAULT] Transmission blocked: Chassis-CAN is offline (Short-to-Ground)`);
            setBusy(false);
            return;
        }

        // Spike bus load temporarily
        setBusLoads(prev => ({ ...prev, [busKey]: Math.min(98, prev[busKey] + 25) }));
        
        if (architectureMode === 'domain') {
            // Traditional domain routing
            addLog(`[ECU] ${sourceEcu.name} initiated transmission of signal "${signalName}" over ${busLabel}`);
            
            const pathH = getPathPoints(getPathToGateway(sourceEcu.id));
            const sourceColor = getBusColorForNode(sourceEcu.id);
            
            if (sourceEcu.id !== 'gw') {
                await animatePacketAlongPath(pathH, signalName, sourceColor, 900);
                
                if (sourceEcu.id === 'door_fl') {
                    addLog(`[BCM] Master processed LIN frame "${signalName}" from Door Client`);
                    setFlashedEcus(prev => [...prev, 'bcm']);
                    setTimeout(() => setFlashedEcus(prev => prev.filter(id => id !== 'bcm')), 350);
                } else {
                    setGatewayGlow(true);
                    addLog(`[Gateway] Intercepted packet "${signalName}". Translating address matrices...`);
                    setTimeout(() => setGatewayGlow(false), 250);
                }
            }
            
            if (dests.length > 0 && sourceEcu.id !== 'door_fl') {
                await Promise.all(dests.map(async destId => {
                    if (chassisCanFault && destId === 'abs') {
                        addLog(`[FAULT] Cannot route to ABS: Chassis-CAN offline`);
                        return;
                    }
                    
                    const destEcu = ECUS.find(e => e.id === destId);
                    if (destEcu) {
                        const destPath = getPathPoints(getPathFromGateway(destId));
                        const destColor = getBusColorForNode(destId);
                        
                        addLog(`[Gateway] Routing "${signalName}" to ${destEcu.name} via ${getBusDomainName(destEcu.type)}`);
                        await animatePacketAlongPath(destPath, signalName, destColor, 900);
                        
                        setFlashedEcus(prev => [...prev, destId]);
                        setTimeout(() => setFlashedEcus(prev => prev.filter(id => id !== destId)), 400);
                    }
                }));
            }
        } else {
            // Zonal routing
            const zoneA = getEcuZoneId(sourceEcu.id);
            addLog(`[ECU] ${sourceEcu.name} initiated transmission of signal "${signalName}" over local ${busLabel}`);
            
            if (dests.length > 0) {
                await Promise.all(dests.map(async destId => {
                    if (chassisCanFault && ['abs', 'eps', 'sas'].includes(destId)) {
                        addLog(`[FAULT] Cannot route to ${destId}: Chassis-CAN segment offline`);
                        return;
                    }

                    const zoneB = getEcuZoneId(destId);
                    let nodePath: string[] = [];
                    
                    if (zoneA === zoneB) {
                        nodePath = [sourceEcu.id, zoneA, destId];
                        addLog(`[${zoneA.toUpperCase().replace('_', ' ')}] Local routing inside zone for "${signalName}"`);
                    } else {
                        const bbPath = getBackbonePath(zoneA, zoneB);
                        nodePath = [sourceEcu.id, ...bbPath, destId];
                        
                        if (ethernetRingFault && bbPath.includes('gw') && bbPath.length > 2) {
                            addLog(`[ROUTE] Segment Zone FL<->RL broken! Rerouted "${signalName}" through Central HPC backup star path.`);
                        } else if (ethernetRingFault && bbPath.length > 2) {
                            addLog(`[ROUTE] Segment Zone FL<->RL broken! Rerouted "${signalName}" clockwise around ring: Zone FL -> Zone FR -> Zone RR -> Zone RL.`);
                        } else {
                            addLog(`[Backbone] Routing "${signalName}" from ${zoneA.toUpperCase().replace('_', ' ')} to ${zoneB.toUpperCase().replace('_', ' ')} over Ethernet ring`);
                        }
                    }
                    
                    const pathPoints = getPathPoints(nodePath);
                    const destColor = getBusColorForNode(destId);
                    
                    await animatePacketAlongPath(pathPoints, signalName, destColor, 1200);
                    
                    setFlashedEcus(prev => [...prev, zoneB, destId]);
                    setTimeout(() => setFlashedEcus(prev => prev.filter(id => id !== zoneB && id !== destId)), 400);
                    addLog(`[ECU] ${ECUS.find(e => e.id === destId)?.name || destId} received signal "${signalName}" successfully`);
                }));
            }
        }
        
        setBusy(false);
    };

    const getBusDomainName = (type: ECU['type']): string => {
        if (type === 'powertrain') return 'PT-CAN';
        if (type === 'chassis') return 'Chassis-CAN';
        if (type === 'body') return 'Body-CAN';
        if (type === 'infotainment') return 'Ethernet';
        if (type === 'adas') return 'ADAS-CAN-FD';
        return 'Local Link';
    };

    // Diagnostic Handlers
    const handleUdsReadVin = async () => {
        if (busy) return;
        setBusy(true);
        addLog(`[UDS] Tester: Read VIN Request (Service ID: 0x22, DID: 0xF190)`);
        
        const pathReq = getPathPoints(architectureMode === 'domain' ? ['obd', 'gw'] : ['obd', 'gw']);
        await animatePacketAlongPath(pathReq, '22 F1 90', '#facc15', 750);
        
        setGatewayGlow(true);
        setTimeout(() => setGatewayGlow(false), 200);
        addLog(`[Gateway] Processing diagnostic DID query... reading EEPROM`);
        
        const pathResp = getPathPoints(architectureMode === 'domain' ? ['gw', 'obd'] : ['gw', 'obd']);
        await animatePacketAlongPath(pathResp, '62 F1 90', '#10b981', 750);
        
        addLog(`[UDS] Tester: Positive Response (0x62): VIN Data = "AUT0LEARN2026VEH"`);
        setBusy(false);
    };

    const handleUdsEnterExtended = async () => {
        if (busy) return;
        setBusy(true);
        addLog(`[UDS] Tester: Diagnostic Session Control -> Extended Session (Service ID: 0x10, Sub-function: 0x03)`);
        
        const pathReq = getPathPoints(['obd', 'gw']);
        await animatePacketAlongPath(pathReq, '10 03', '#facc15', 750);
        
        setGatewayGlow(true);
        setTimeout(() => setGatewayGlow(false), 200);
        
        const pathResp = getPathPoints(['gw', 'obd']);
        await animatePacketAlongPath(pathResp, '50 03', '#10b981', 750);
        
        setUdsSession('extended');
        addLog(`[UDS] Tester: Positive Response (0x50): Diagnostics Session changed to Extended.`);
        setBusy(false);
    };

    const handleUdsRequestSeed = async () => {
        if (busy) return;
        if (udsSession !== 'extended') {
            addLog(`[UDS] Negative Response (0x7F 27 7F): Security Access Rejected. Extended diagnostic session required.`);
            return;
        }
        setBusy(true);
        addLog(`[UDS] Tester: Security Access -> Request Seed (Service ID: 0x27, Sub-function: 0x01)`);
        
        const pathReq = getPathPoints(['obd', 'gw']);
        await animatePacketAlongPath(pathReq, '27 01', '#facc15', 750);
        
        setGatewayGlow(true);
        setTimeout(() => setGatewayGlow(false), 200);
        
        const pathResp = getPathPoints(['gw', 'obd']);
        await animatePacketAlongPath(pathResp, '67 01', '#10b981', 750);
        
        setUdsSeedRequested(true);
        addLog(`[UDS] Tester: Positive Response (0x67): Seed Bytes = "0xEF 0xD3 0x82 0x11"`);
        setBusy(false);
    };

    const handleUdsSendKey = async () => {
        if (busy) return;
        if (!udsSeedRequested) return;
        setBusy(true);
        addLog(`[UDS] Tester: Security Access -> Send Calculated Key (Service ID: 0x27, Sub-function: 0x02)`);
        
        const pathReq = getPathPoints(['obd', 'gw']);
        await animatePacketAlongPath(pathReq, '27 02', '#facc15', 750);
        
        setGatewayGlow(true);
        setTimeout(() => setGatewayGlow(false), 200);
        
        const pathResp = getPathPoints(['gw', 'obd']);
        await animatePacketAlongPath(pathResp, '67 02', '#10b981', 750);
        
        setUdsSecurity('unlocked');
        addLog(`[UDS] Tester: Positive Response (0x67): Security Key verified! Tester Unlocked.`);
        setBusy(false);
    };

    const handleUdsEcuReset = async () => {
        if (busy) return;
        setBusy(true);
        
        const target = udsTargetEcu;
        const targetEcuObj = ECUS.find(e => e.id === target);
        const targetName = targetEcuObj ? targetEcuObj.name : target;
        
        addLog(`[UDS] Tester: Hard Reset Request to ${targetName} (Service ID: 0x11, Sub-function: 0x01)`);
        
        let pathReqNodes = ['obd', 'gw'];
        if (architectureMode === 'zonal') {
            const zone = getEcuZoneId(target);
            pathReqNodes = ['obd', 'gw', zone, target];
        } else {
            pathReqNodes = ['obd', 'gw', target];
        }
        
        const pathReq = getPathPoints(pathReqNodes);
        await animatePacketAlongPath(pathReq, '11 01', '#facc15', 950);
        
        // Turn ECU offline
        setOfflineEcus(prev => [...prev, target]);
        addLog(`[SYS] ${targetName} processed reset instruction. Halting CAN transceivers.`);
        
        let pathRespNodes = [target, 'gw', 'obd'];
        if (architectureMode === 'zonal') {
            const zone = getEcuZoneId(target);
            pathRespNodes = [target, zone, 'gw', 'obd'];
        }
        
        const pathResp = getPathPoints(pathRespNodes);
        await animatePacketAlongPath(pathResp, '51 01', '#10b981', 950);
        
        addLog(`[UDS] Tester: Positive Response (0x51). Reset execution confirmed.`);
        setBusy(false);
        
        // Wait 2.5s and reboot node
        setTimeout(() => {
            setOfflineEcus(prev => prev.filter(id => id !== target));
            addLog(`[SYS] ${targetName} reboot completed. Restoring CAN transceivers. Node Online.`);
        }, 2500);
    };

    // Attack Simulator Handler
    const handleRunAttack = async () => {
        if (busy) return;
        setBusy(true);
        setAttackActive(true);
        
        addLog(`[ATTACK] Rogue cellular node (TCU) attempting spoof transmission of Powertrain CAN ID 0x123...`);
        
        const pathNodes = architectureMode === 'domain' 
            ? ['tcu', 'hu', 'gw']
            : ['tcu', 'zone_rr', 'gw'];
            
        const pathReq = getPathPoints(pathNodes);
        await animatePacketAlongPath(pathReq, 'SPOOF_RPM', '#f43f5e', 900);
        
        if (secOcEnabled) {
            // Drop packet
            setGatewayGlow(true);
            setTimeout(() => setGatewayGlow(false), 300);
            
            addLog(`[IDS/ALERT] Intrusion Detection System flagged unmapped frame ID 0x123 from TCU source domain!`);
            addLog(`[SecOC] Verification Failed: Authentication signature missing. Packet discarded.`);
            
            setFlashedEcus(prev => [...prev, 'gw']);
            setTimeout(() => setFlashedEcus(prev => prev.filter(id => id !== 'gw')), 400);
        } else {
            // Forward packet
            addLog(`[Gateway] Security disabled. Routing unauthenticated frame 0x123 to Engine Control Module...`);
            
            const destPathNodes = architectureMode === 'domain'
                ? ['gw', 'ecm']
                : ['gw', 'zone_fl', 'ecm'];
                
            const pathDest = getPathPoints(destPathNodes);
            await animatePacketAlongPath(pathDest, 'SPOOF_RPM', '#f43f5e', 900);
            
            setIsEngineSpoofed(true);
            addLog(`[ATTACK] Spoof Frame (ID: 0x123, Value: 8000 RPM) successfully received by ECM!`);
            addLog(`[SYS/ALERT] Engine Control Module reports critical throttle anomaly!`);
            
            setFlashedEcus(prev => [...prev, 'ecm']);
            setTimeout(() => setFlashedEcus(prev => prev.filter(id => id !== 'ecm')), 400);
            
            // Timeout alert after 5 seconds
            setTimeout(() => {
                setIsEngineSpoofed(false);
                addLog(`[SYS] Spoof frame timeout. ECM falling back to backup default states.`);
            }, 5000);
        }
        
        setAttackActive(false);
        setBusy(false);
    };

    // Fault Injection togglers
    const handleToggleChassisFault = () => {
        if (chassisCanFault) {
            setChassisCanFault(false);
            addLog(`[SYS] Physical fault cleared. Restoring Chassis-CAN bus communications.`);
            addLog(`[SYS] Executing network wakeup. ABS/ESP, EPS, SAS nodes ONLINE.`);
        } else {
            setChassisCanFault(true);
            addLog(`[FAULT] Injected physical fault: Chassis-CAN CAN_H wire shorted to Ground!`);
            addLog(`[SYS/DTC] DTCs generated: U0121 (ABS Timeout), U0131 (EPS Timeout), U0126 (SAS Timeout).`);
            addLog(`[FAULT] Chassis-CAN enters Bus-Off state. Communication terminated.`);
            if (selectedECU && selectedECU.type === 'chassis') {
                setSelectedECU(null);
            }
        }
    };

    const handleToggleEthernetFault = () => {
        if (ethernetRingFault) {
            setEthernetRingFault(false);
            addLog(`[SYS] Ethernet link repair completed. Ring backbone redundancy fully operational.`);
        } else {
            setEthernetRingFault(true);
            addLog(`[FAULT] Injected physical fiber cut on Left Backbone link (Zone FL <-> Zone RL)!`);
            addLog(`[ROUTE] Left Ethernet segment offline. Dynamic ring rerouting algorithms active.`);
        }
    };

    return (
        <div className="flex flex-col bg-gray-950 p-4 gap-4 text-gray-100 min-h-full rounded-2xl relative">
            {/* Spoofing alert notification */}
            {isEngineSpoofed && (
                <div className="absolute top-4 left-4 right-4 bg-red-950/90 border border-red-500 rounded-xl p-4 flex items-center gap-3 animate-bounce shadow-2xl z-30 backdrop-blur-md">
                    <AlertTriangle className="text-red-500 animate-pulse shrink-0" size={24} />
                    <div className="flex-1">
                        <h4 className="text-xs font-bold text-red-200 uppercase tracking-wide">Intrusion Alert: Spoofing Successful</h4>
                        <p className="text-[10px] text-red-300 font-mono mt-0.5 leading-relaxed">
                            Compromised node TCU injected frame 0x123 (Engine_Speed) at 8,000 RPM. Gateway firewall was disabled. Driving instruments cluster showing anomalous data!
                        </p>
                    </div>
                </div>
            )}

            {/* Global Control Dashboard Panel */}
            <div className="bg-[#0d1117] rounded-xl border border-gray-800 p-4 flex flex-col gap-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Topology Layout:</span>
                        <div className="bg-gray-950 p-1 rounded-lg border border-gray-800 flex gap-1">
                            <button
                                onClick={() => {
                                    setArchitectureMode('domain');
                                    setSelectedECU(null);
                                    addLog('[SYS] Switched to traditional Domain-Based Vehicle Network Architecture.');
                                }}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                                    architectureMode === 'domain' 
                                        ? 'bg-blue-600 text-white shadow' 
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                Domain-Based
                            </button>
                            <button
                                onClick={() => {
                                    setArchitectureMode('zonal');
                                    setSelectedECU(null);
                                    addLog('[SYS] Switched to modern software-defined Zonal Vehicle Network Architecture.');
                                }}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                                    architectureMode === 'zonal' 
                                        ? 'bg-purple-600 text-white shadow' 
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                Zonal (Modern)
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Security SecOC Toggler */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Firewall / SecOC:</span>
                            <button
                                onClick={() => {
                                    setSecOcEnabled(prev => !prev);
                                    addLog(`[SECURITY] Intrusion Detection System & SecOC firewall ${!secOcEnabled ? 'ENABLED' : 'DISABLED'}.`);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold transition-all ${
                                    secOcEnabled 
                                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 hover:bg-emerald-950/60' 
                                        : 'bg-red-950/30 text-red-400 border-red-900/40 hover:bg-red-950/55'
                                }`}
                            >
                                {secOcEnabled ? <Lock size={12} className="text-emerald-400" /> : <Unlock size={12} className="text-red-400" />}
                                {secOcEnabled ? 'Firewall Active' : 'Unsecured Link'}
                            </button>
                        </div>

                        {/* Cybersecurity Spoof Attack button */}
                        <button
                            onClick={handleRunAttack}
                            disabled={busy || attackActive}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wide rounded transition-all flex items-center gap-1.5"
                        >
                            <Flame size={13} />
                            Inject Spoof Attack
                        </button>
                    </div>
                </div>

                <div className="border-t border-gray-800/60 pt-3 flex flex-wrap items-center gap-4 justify-between">
                    {/* Fault Injections */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Inject Fault:</span>
                        <div className="flex gap-2">
                            <button
                                onClick={handleToggleChassisFault}
                                className={`px-3 py-1 text-[10px] font-bold rounded border uppercase tracking-wider transition-all ${
                                    chassisCanFault 
                                        ? 'bg-orange-600 border-orange-500 text-white' 
                                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                                }`}
                            >
                                Chassis CAN Short
                            </button>

                            {architectureMode === 'zonal' && (
                                <button
                                    onClick={handleToggleEthernetFault}
                                    className={`px-3 py-1 text-[10px] font-bold rounded border uppercase tracking-wider transition-all ${
                                        ethernetRingFault 
                                            ? 'bg-red-600 border-red-500 text-white' 
                                            : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                                    }`}
                                >
                                    Ethernet Link Cut
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <span className="text-[10px] text-gray-500 font-mono italic">
                        {architectureMode === 'domain' 
                            ? 'Domain mode routes packets logically through central gateway.' 
                            : 'Zonal mode aggregates local inputs to Zone controllers, routed over high-speed Ethernet backbone.'}
                    </span>
                </div>
            </div>

            {/* Canvas + Details Row */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch w-full">
                
                {/* Left side: Canvas and Legend stack */}
                <div className="flex-1 flex flex-col gap-3">
                    {/* Canvas Area */}
                    <div className="flex-1 bg-[#0d1117] rounded-xl shadow-2xl border border-gray-800 relative overflow-hidden p-4 min-h-[460px] lg:min-h-[520px]">
                        <div className="absolute top-4 left-4 flex items-center gap-2 text-gray-400">
                            <Network size={20} className="text-cyan-400 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-200">Interactive Network Topologies</span>
                        </div>

                        <svg className="w-full h-full" viewBox="0 0 800 580" preserveAspectRatio="xMidYMid meet">
                            <defs>
                                <filter id="topo-glow-pk"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                                <filter id="topo-glow-gw"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                            </defs>

                            {/* Rendering paths depending on Mode */}
                            {architectureMode === 'domain' ? (
                                <>
                                    {/* PT-CAN (High Speed 500k) - Red */}
                                    <path d="M 400 300 L 250 150" stroke={getBusColor('powertrain')} strokeWidth="2.5" />
                                    <path d="M 400 300 L 350 100" stroke={getBusColor('powertrain')} strokeWidth="2.5" />
                                    <path d="M 400 300 L 150 150" stroke={getBusColor('powertrain')} strokeWidth="2.5" />
                                    <path d="M 400 300 L 450 100" stroke={getBusColor('powertrain')} strokeWidth="2.5" />

                                    {/* Chassis-CAN (High Speed 500k) - Orange */}
                                    <path d="M 400 300 L 150 300" stroke={chassisCanFault ? "#4b5563" : getBusColor('chassis')} strokeWidth="2.5" strokeDasharray={chassisCanFault ? "4 4" : undefined} />
                                    <path d="M 400 300 L 150 400" stroke={chassisCanFault ? "#4b5563" : getBusColor('chassis')} strokeWidth="2.5" strokeDasharray={chassisCanFault ? "4 4" : undefined} />
                                    <path d="M 400 300 L 250 450" stroke={chassisCanFault ? "#4b5563" : getBusColor('chassis')} strokeWidth="2.5" strokeDasharray={chassisCanFault ? "4 4" : undefined} />

                                    {/* Body-CAN (Low Speed 125k) - Blue */}
                                    <path d="M 400 300 L 600 150" stroke={getBusColor('body')} strokeWidth="2.5" />
                                    <path d="M 400 300 L 650 300" stroke={getBusColor('body')} strokeWidth="2.5" />
                                    <path d="M 600 150 L 700 150" stroke={getBusColor('body')} strokeWidth="2.5" />

                                    {/* LIN Bus (Single Wire) - Cyan */}
                                    <path d="M 600 150 L 550 50" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 2" />

                                    {/* Infotainment (Ethernet/HSCAN) - Purple */}
                                    <path d="M 400 300 L 600 450" stroke={getBusColor('infotainment')} strokeWidth="3" />
                                    <path d="M 600 450 L 700 450" stroke={getBusColor('infotainment')} strokeWidth="3" />

                                    {/* ADAS (CAN-FD) - Green */}
                                    <path d="M 400 300 L 400 500" stroke={getBusColor('adas')} strokeWidth="2.5" />
                                    <path d="M 400 300 L 500 500" stroke={getBusColor('adas')} strokeWidth="2.5" />

                                    {/* OBD-II Port Link */}
                                    <path d="M 400 300 L 280 300" stroke="#facc15" strokeWidth="2" strokeDasharray="3 3" />
                                </>
                            ) : (
                                <>
                                    {/* ZONAL MODE BACKBONE RING */}
                                    {/* Star Links from Central HPC to Zone Gateways */}
                                    <line x1="400" y1="300" x2="280" y2="200" stroke="#4b5563" strokeWidth="1.5" strokeDasharray="3 3" />
                                    <line x1="400" y1="300" x2="520" y2="200" stroke="#4b5563" strokeWidth="1.5" strokeDasharray="3 3" />
                                    <line x1="400" y1="300" x2="280" y2="400" stroke="#4b5563" strokeWidth="1.5" strokeDasharray="3 3" />
                                    <line x1="400" y1="300" x2="520" y2="400" stroke="#4b5563" strokeWidth="1.5" strokeDasharray="3 3" />

                                    {/* Ring backbone Links */}
                                    <line x1="280" y1="200" x2="520" y2="200" stroke="#a855f7" strokeWidth="3.5" />
                                    <line x1="520" y1="200" x2="520" y2="400" stroke="#a855f7" strokeWidth="3.5" />
                                    <line x1="520" y1="400" x2="280" y2="400" stroke="#a855f7" strokeWidth="3.5" />
                                    
                                    {ethernetRingFault ? (
                                        <g>
                                            <line x1="280" y1="400" x2="280" y2="200" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5 5" />
                                            <circle cx="280" cy="300" r="10" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
                                            <path d="M 276 296 L 284 304 M 284 296 L 276 304" stroke="#ffffff" strokeWidth="2" />
                                        </g>
                                    ) : (
                                        <line x1="280" y1="400" x2="280" y2="200" stroke="#a855f7" strokeWidth="3.5" />
                                    )}

                                    {/* Zone FL Local Edge Links */}
                                    <line x1="280" y1="200" x2="170" y2="120" stroke={getBusColor('powertrain')} strokeWidth="2" />
                                    <line x1="280" y1="200" x2="120" y2="180" stroke={getBusColor('powertrain')} strokeWidth="2" />
                                    <line x1="280" y1="200" x2="170" y2="240" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 2" />
                                    <line x1="280" y1="200" x2="350" y2="100" stroke={getBusColor('adas')} strokeWidth="2" />

                                    {/* Zone FR Local Edge Links */}
                                    <line x1="520" y1="200" x2="630" y2="120" stroke={getBusColor('powertrain')} strokeWidth="2" />
                                    <line x1="520" y1="200" x2="680" y2="180" stroke={getBusColor('powertrain')} strokeWidth="2" />
                                    <line x1="520" y1="200" x2="630" y2="240" stroke={getBusColor('body')} strokeWidth="2" />
                                    <line x1="520" y1="200" x2="450" y2="100" stroke={getBusColor('adas')} strokeWidth="2" />
                                    <line x1="520" y1="200" x2="400" y2="150" stroke={getBusColor('body')} strokeWidth="2" />

                                    {/* Zone RL Local Edge Links (Chassis) */}
                                    <line x1="280" y1="400" x2="170" y2="380" stroke={chassisCanFault ? "#4b5563" : getBusColor('chassis')} strokeWidth="2" strokeDasharray={chassisCanFault ? "4 4" : undefined} />
                                    <line x1="280" y1="400" x2="120" y2="420" stroke={chassisCanFault ? "#4b5563" : getBusColor('chassis')} strokeWidth="2" strokeDasharray={chassisCanFault ? "4 4" : undefined} />
                                    <line x1="280" y1="400" x2="170" y2="480" stroke={chassisCanFault ? "#4b5563" : getBusColor('chassis')} strokeWidth="2" strokeDasharray={chassisCanFault ? "4 4" : undefined} />

                                    {/* Zone RR Local Edge Links */}
                                    <line x1="520" y1="400" x2="630" y2="380" stroke={getBusColor('body')} strokeWidth="2" />
                                    <line x1="520" y1="400" x2="680" y2="420" stroke={getBusColor('infotainment')} strokeWidth="2" />
                                    <line x1="520" y1="400" x2="630" y2="480" stroke={getBusColor('infotainment')} strokeWidth="2" />

                                    {/* OBD link directly to central brain */}
                                    <line x1="400" y1="300" x2="280" y2="300" stroke="#facc15" strokeWidth="2" strokeDasharray="3 3" />
                                </>
                            )}

                            {/* Zone Gateway Nodes (Zonal Mode only) */}
                            {architectureMode === 'zonal' && ZONES.map(zone => {
                                const isSelected = selectedECU?.id === zone.id;
                                const isFlashed = flashedEcus.includes(zone.id);
                                return (
                                    <g
                                        key={zone.id}
                                        onClick={() => setSelectedECU({
                                            id: zone.id,
                                            name: zone.name,
                                            type: 'gateway',
                                            x: zone.x,
                                            y: zone.y,
                                            description: zone.description,
                                            signals: ['Zonal Routing Traffic']
                                        })}
                                        className="cursor-pointer hover:opacity-90 transition-opacity"
                                    >
                                        <rect
                                            x={zone.x - 22}
                                            y={zone.y - 22}
                                            width={44}
                                            height={44}
                                            rx={8}
                                            fill="#0f172a"
                                            stroke={
                                                isFlashed ? '#ffffff' :
                                                isSelected ? '#a855f7' : '#4b5563'
                                            }
                                            strokeWidth={isSelected || isFlashed ? 3 : 1.5}
                                            className="transition-all duration-300"
                                        />
                                        <g transform={`translate(${zone.x - 9}, ${zone.y - 9})`}>
                                            <Cpu size={18} className="text-purple-400 pointer-events-none" />
                                        </g>
                                        <text x={zone.x} y={zone.y + 36} textAnchor="middle" fill="#9ca3af" className="text-[9px] font-bold font-sans pointer-events-none">{zone.name}</text>
                                    </g>
                                );
                            })}

                            {/* Transmitting Packets */}
                            {packets.map(pk => (
                                <g key={pk.id}>
                                    <circle cx={pk.fromX} cy={pk.fromY} r={10} fill={pk.color} opacity={0.15} />
                                    <circle cx={pk.fromX} cy={pk.fromY} r={4.5} fill={pk.color} filter="url(#topo-glow-pk)" />
                                    <rect x={pk.fromX - 25} y={pk.fromY - 20} width={50} height={11} rx="2.5" fill={pk.color} opacity={0.92} />
                                    <text x={pk.fromX} y={pk.fromY - 12} textAnchor="middle" fill="#fff" fontSize="6.5" fontWeight="bold" fontFamily="monospace">{pk.label}</text>
                                </g>
                            ))}

                            {/* ECU Nodes */}
                            {ECUS.map((ecu) => {
                                const isGw = ecu.id === 'gw';
                                const isSelected = selectedECU?.id === ecu.id;
                                const isFlashed = flashedEcus.includes(ecu.id);
                                
                                const coords = getEcuCoords(ecu.id);
                                const ecuDetails = getEcuDetails(ecu);

                                // Check if node is offline due to physical fault or diagnostic hard resets
                                const isOffline = (chassisCanFault && ecu.type === 'chassis') || offlineEcus.includes(ecu.id);

                                return (
                                    <g
                                        key={ecu.id}
                                        onClick={() => setSelectedECU(ecuDetails)}
                                        className={`cursor-pointer hover:opacity-90 transition-opacity ${isOffline ? 'opacity-40' : ''}`}
                                    >
                                        <circle
                                            cx={coords.x}
                                            cy={coords.y}
                                            r={isGw ? '38' : '26'}
                                            fill={
                                                isOffline ? '#374151' :
                                                isGw ? (gatewayGlow ? '#10b981' : '#047857') :
                                                ecu.type === 'powertrain' ? '#7f1d1d' :
                                                ecu.type === 'chassis' ? '#7c2d12' :
                                                ecu.type === 'body' ? '#1e3a8a' :
                                                ecu.type === 'infotainment' ? '#581c87' : 
                                                ecu.type === 'diagnostics' ? '#854d0e' : '#064e3b'
                                            }
                                            stroke={
                                                isOffline ? '#4b5563' :
                                                isFlashed ? '#ffffff' :
                                                isSelected ? getBusColorForNode(ecu.id) : '#1f2937'
                                            }
                                            strokeWidth={isGw || isSelected || isFlashed ? '3.5' : '1.5'}
                                            filter={isGw && gatewayGlow ? 'url(#topo-glow-gw)' : undefined}
                                            className="transition-all duration-300"
                                        />
                                        
                                        {/* Center Icon */}
                                        <g transform={`translate(${coords.x - 9}, ${coords.y - 9})`}>
                                            {ecu.type === 'gateway' && <Network size={18} className="text-emerald-300 pointer-events-none" />}
                                            {ecu.type === 'powertrain' && <Zap size={18} className="text-red-300 pointer-events-none" />}
                                            {ecu.type === 'chassis' && <Shield size={18} className="text-orange-300 pointer-events-none" />}
                                            {ecu.type === 'body' && <Cpu size={18} className="text-blue-300 pointer-events-none" />}
                                            {ecu.type === 'infotainment' && <Radio size={18} className="text-purple-300 pointer-events-none" />}
                                            {ecu.type === 'adas' && <Wifi size={18} className="text-green-300 pointer-events-none" />}
                                            {ecu.type === 'diagnostics' && <Terminal size={18} className="text-yellow-300 pointer-events-none" />}
                                        </g>

                                        <text x={coords.x} y={coords.y + (isGw ? 52 : 40)} textAnchor="middle" fill={isOffline ? '#6b7280' : '#d1d5db'} className="text-[10px] font-bold font-sans pointer-events-none">
                                            {isOffline ? `${ecuDetails.name} (OFFLINE)` : ecuDetails.name}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    {/* Legend Bar (Horizontal, outside the SVG) */}
                    <div className="bg-[#0d1117] border border-gray-800 rounded-xl p-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-mono text-gray-400 shadow-md">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Buses & Speeds:</span>
                        
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-0.5 bg-[#ef4444] inline-block" />
                            <span>PT-CAN (500kbps)</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="w-5 h-0.5 bg-[#f97316] inline-block" />
                            <span>Chassis-CAN (500kbps)</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="w-5 h-0.5 bg-[#3b82f6] inline-block" />
                            <span>Body-CAN (125kbps)</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="w-5 h-1 border-t border-dashed border-[#06b6d4] inline-block" />
                            <span>LIN Bus (20kbps)</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="w-5 h-1 bg-[#a855f7] inline-block" />
                            <span>{architectureMode === 'domain' ? 'Ethernet (100Mbps)' : 'Ethernet Ring (1Gbps)'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="w-5 h-0.5 bg-[#10b981] inline-block" />
                            <span>ADAS-CAN-FD (2Mbps)</span>
                        </div>
                    </div>
                </div>

                {/* Sidebar Details (Right) */}
                <div className="w-full lg:w-80 bg-[#0d1117] rounded-xl shadow-2xl border border-gray-800 flex flex-col min-h-[300px]">
                    {selectedECU ? (
                        <div className="p-5 flex flex-col h-full justify-between gap-5">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-lg ${
                                            selectedECU.type === 'gateway' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            selectedECU.type === 'powertrain' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                            selectedECU.type === 'chassis' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                            selectedECU.type === 'body' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                            selectedECU.type === 'infotainment' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                                            selectedECU.type === 'diagnostics' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                                        }`}>
                                            {selectedECU.type === 'diagnostics' ? <Settings size={20} /> : <Cpu size={20} />}
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-white font-mono">{selectedECU.name}</h2>
                                            <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                                                {selectedECU.type === 'gateway' && architectureMode === 'zonal' ? 'Central compute' : `${selectedECU.type} Domain`}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedECU(null)} className="text-gray-500 hover:text-white transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                            <Info size={11} /> Function Description
                                        </h3>
                                        <p className="text-gray-400 text-xs leading-relaxed">
                                            {selectedECU.description}
                                        </p>
                                    </div>

                                    {/* UDS Diagnostic Tester Panel */}
                                    {selectedECU.id === 'obd' ? (
                                        <div>
                                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <Terminal size={11} className="text-yellow-400" /> UDS Diagnostics Console
                                            </h3>
                                            
                                            <div className="space-y-3">
                                                <div className="bg-gray-950 border border-gray-800 rounded p-2.5 space-y-1.5 font-mono text-[10px]">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">UDS Session:</span>
                                                        <span className={udsSession === 'extended' ? 'text-amber-400 font-bold' : 'text-gray-400'}>
                                                            {udsSession === 'extended' ? 'Extended (0x03)' : 'Default (0x01)'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Security Key:</span>
                                                        <span className={udsSecurity === 'unlocked' ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                                                            {udsSecurity === 'unlocked' ? 'Unlocked (Lv 1)' : 'Locked'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={handleUdsReadVin}
                                                        disabled={busy}
                                                        className="w-full text-left px-2.5 py-1.5 bg-cyan-950/30 hover:bg-cyan-900/40 disabled:opacity-30 border border-cyan-800/40 text-cyan-300 font-bold text-[10px] uppercase rounded transition-all flex justify-between items-center"
                                                    >
                                                        <span>Read VIN (0x22 F1 90)</span>
                                                        <span className="text-gray-500 text-[9px] font-mono">0x22</span>
                                                    </button>

                                                    <button
                                                        onClick={handleUdsEnterExtended}
                                                        disabled={busy}
                                                        className="w-full text-left px-2.5 py-1.5 bg-cyan-950/30 hover:bg-cyan-900/40 disabled:opacity-30 border border-cyan-800/40 text-cyan-300 font-bold text-[10px] uppercase rounded transition-all flex justify-between items-center"
                                                    >
                                                        <span>Enter Extended Session</span>
                                                        <span className="text-gray-500 text-[9px] font-mono">0x10 03</span>
                                                    </button>

                                                    <button
                                                        onClick={handleUdsRequestSeed}
                                                        disabled={busy || udsSession !== 'extended'}
                                                        className="w-full text-left px-2.5 py-1.5 bg-cyan-950/30 hover:bg-cyan-900/40 disabled:opacity-30 disabled:hover:bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 font-bold text-[10px] uppercase rounded transition-all flex justify-between items-center"
                                                    >
                                                        <span>Request Seed</span>
                                                        <span className="text-gray-500 text-[9px] font-mono">0x27 01</span>
                                                    </button>

                                                    <button
                                                        onClick={handleUdsSendKey}
                                                        disabled={busy || !udsSeedRequested || udsSecurity === 'unlocked'}
                                                        className="w-full text-left px-2.5 py-1.5 bg-cyan-950/30 hover:bg-cyan-900/40 disabled:opacity-30 disabled:hover:bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 font-bold text-[10px] uppercase rounded transition-all flex justify-between items-center"
                                                    >
                                                        <span>Send Key (0x27 02)</span>
                                                        <span className="text-gray-500 text-[9px] font-mono">0x27 02</span>
                                                    </button>

                                                    <div className="border-t border-gray-800 my-2 pt-2">
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Target ECU for Reset:</label>
                                                        <select
                                                            value={udsTargetEcu}
                                                            onChange={(e) => setUdsTargetEcu(e.target.value)}
                                                            className="w-full bg-gray-950 border border-gray-800 rounded p-1 text-[10px] text-gray-300 mb-2 font-mono"
                                                        >
                                                            {ECUS.filter(e => e.id !== 'gw' && e.id !== 'obd').map(e => (
                                                                <option key={e.id} value={e.id}>{e.name}</option>
                                                            ))}
                                                        </select>

                                                        <button
                                                            onClick={handleUdsEcuReset}
                                                            disabled={busy}
                                                            className="w-full text-left px-2.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 disabled:opacity-30 border border-red-900/40 text-red-400 font-bold text-[10px] uppercase rounded transition-all flex justify-between items-center"
                                                        >
                                                            <span className="flex items-center gap-1"><RefreshCw size={10} /> ECU Reset (0x11 01)</span>
                                                            <span className="text-gray-500 text-[9px] font-mono">0x11</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <Network size={11} /> Signal Modulator Panel
                                            </h3>
                                            
                                            {selectedECU.id === 'gw' || selectedECU.id.startsWith('zone_') ? (
                                                <p className="text-gray-600 text-xs italic">
                                                    {selectedECU.id === 'gw' 
                                                        ? 'Central hub routes all vehicle network bus frames. Select edge ECUs to modulate signals.' 
                                                        : 'Zone controllers aggregate signals from physically proximate ECUs to route onto the Ethernet backbone.'}
                                                </p>
                                            ) : (
                                                <div className="flex flex-col gap-1.5">
                                                    {selectedECU.signals.map(signal => {
                                                        const isOffline = (chassisCanFault && selectedECU.type === 'chassis') || offlineEcus.includes(selectedECU.id);
                                                        return (
                                                            <div key={signal} className="flex items-center justify-between bg-gray-950 border border-gray-800 rounded p-2 text-xs">
                                                                <span className="text-cyan-400 font-mono text-[10px] truncate max-w-[130px]" title={signal}>{signal}</span>
                                                                <button
                                                                    onClick={() => handleSimulateSignal(signal, selectedECU)}
                                                                    disabled={busy || isOffline}
                                                                    className="px-2 py-1 bg-cyan-900/30 hover:bg-cyan-900/60 disabled:opacity-30 disabled:hover:bg-cyan-900/30 border border-cyan-800/40 text-cyan-300 font-bold text-[9px] uppercase tracking-wide rounded transition-all"
                                                                >
                                                                    Transmit
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="border-t border-gray-800 p-5 text-[10px] text-gray-500 font-mono">
                                <b>Bus Domain:</b> {selectedECU.id === 'gw' ? 'Central Backbone' : selectedECU.id.startsWith('zone_') ? 'Backbone Ring' : getBusDomainName(selectedECU.type)}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                            <Network size={36} className="mb-3 opacity-20 text-cyan-400 animate-pulse" />
                            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Domain Details</h5>
                            <p className="text-[11px] text-gray-600">Select any ECU node or Zone Gateway on the grid map to modulate signals and test network routing rules.</p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Bottom Row: Bus Load Monitors & Diagnostic Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full items-stretch">
                
                {/* Bus Load Monitor (5 cols) */}
                <div className="lg:col-span-5 bg-[#0d1117] border border-gray-800 rounded-xl p-5 shadow-2xl flex flex-col gap-3">
                    <h4 className="font-bold text-gray-200 text-xs uppercase tracking-wider flex items-center gap-2">
                        <Activity className="text-cyan-400 animate-pulse" size={14} />
                        Bus Bandwidth Utilization
                    </h4>
                    
                    <div className="space-y-3 font-mono text-[10px]">
                        <div>
                            <div className="flex justify-between mb-1 text-gray-400">
                                <span>PT-CAN (High-Speed Engine Bus)</span>
                                <span className="text-red-400">{busLoads.pt}%</span>
                            </div>
                            <div className="w-full bg-gray-900 rounded-full h-1.5">
                                <div className="bg-red-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${busLoads.pt}%` }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1 text-gray-400">
                                <span>Chassis-CAN (Stability Bus)</span>
                                <span className={chassisCanFault ? "text-gray-500 font-bold" : "text-orange-400"}>
                                    {chassisCanFault ? "BUS OFF (0%)" : `${busLoads.chassis}%`}
                                </span>
                            </div>
                            <div className="w-full bg-gray-900 rounded-full h-1.5">
                                <div className={chassisCanFault ? "bg-red-800/20 h-1.5 rounded-full transition-all" : "bg-orange-500 h-1.5 rounded-full transition-all duration-500"} style={{ width: `${chassisCanFault ? 0 : busLoads.chassis}%` }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1 text-gray-400">
                                <span>Body-CAN (Low-Speed Comfort Bus)</span>
                                <span className="text-blue-400">{busLoads.body}%</span>
                            </div>
                            <div className="w-full bg-gray-900 rounded-full h-1.5">
                                <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${busLoads.body}%` }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1 text-gray-400">
                                <span>LIN Bus (Single-Wire Cabin Bus)</span>
                                <span className="text-cyan-400">{busLoads.lin}%</span>
                            </div>
                            <div className="w-full bg-gray-900 rounded-full h-1.5">
                                <div className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${busLoads.lin}%` }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1 text-gray-400">
                                <span>Automotive Ethernet (100Base-T1/Ring)</span>
                                <span className="text-purple-400">{busLoads.eth}%</span>
                            </div>
                            <div className="w-full bg-gray-900 rounded-full h-1.5">
                                <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${busLoads.eth}%` }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1 text-gray-400">
                                <span>ADAS-CAN-FD (Sensor Telemetry Bus)</span>
                                <span className="text-emerald-400">{busLoads.adas}%</span>
                            </div>
                            <div className="w-full bg-gray-900 rounded-full h-1.5">
                                <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${busLoads.adas}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Diagnostic Terminal (7 cols) */}
                <div className="lg:col-span-7 bg-[#0a0e13] border border-gray-800 rounded-xl p-5 shadow-2xl flex flex-col min-h-[220px]">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-800">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500/70" />
                            <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
                            <div className="w-2 h-2 rounded-full bg-green-500/70" />
                            <span className="text-[10px] font-mono text-gray-500 ml-1.5 flex items-center gap-1.5">
                                <Terminal size={11} /> network_gateway_diagnostics.log
                            </span>
                        </div>
                        <button
                            onClick={() => setLogs(['Diagnostics trace log cleared. Ready.'])}
                            className="text-[9px] uppercase tracking-wider text-gray-500 hover:text-gray-300 font-bold transition-all px-1.5 py-0.5 border border-gray-800 rounded bg-gray-950"
                        >
                            Clear Console
                        </button>
                    </div>

                    <div ref={terminalContainerRef} className="flex-1 overflow-y-auto font-mono text-[10px] leading-5 space-y-1 scrollbar-hide h-44">
                        {logs.map((l, i) => {
                            const isGw = l.includes('[Gateway]') || l.includes('[Central HPC]') || l.includes('[Backbone]');
                            const isEcu = l.includes('[ECU]');
                            const isZone = l.includes('[ZONE') || l.includes('[Zone FL]') || l.includes('[Zone FR]') || l.includes('[Zone RL]') || l.includes('[Zone RR]');
                            const isFault = l.includes('[FAULT]') || l.includes('[SYS/DTC]') || l.includes('[SYS/ALERT]');
                            const isUds = l.includes('[UDS]');
                            const isAttack = l.includes('[ATTACK]') || l.includes('[IDS/ALERT]') || l.includes('[SecOC]') || l.includes('[FIREWALL]');
                            
                            let textClass = 'text-gray-500';
                            if (isAttack) textClass = 'text-rose-400 font-bold';
                            else if (isFault) textClass = 'text-orange-500 font-bold';
                            else if (isUds) textClass = 'text-yellow-400';
                            else if (isGw) textClass = 'text-amber-400';
                            else if (isEcu) textClass = 'text-cyan-400 font-medium';
                            else if (isZone) textClass = 'text-purple-400';
                            
                            return (
                                <div key={i} className={textClass}>
                                    {l}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
