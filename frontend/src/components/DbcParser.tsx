import React, { useState, useEffect } from 'react';
import { FileCode, CheckCircle, Info, Sliders, LayoutGrid, Activity } from 'lucide-react';

interface Signal {
    name: string;
    startBit: number;
    length: number;
    isIntel: boolean; // true = Intel (Little Endian), false = Motorola (Big Endian)
    isSigned: boolean;
    factor: number;
    offset: number;
    min: number;
    max: number;
    unit: string;
    receiver: string;
    value: number; // current physical value
    color: string; // Tailwind color classes for grid mapping
}

interface Message {
    id: number;
    name: string;
    size: number;
    sender: string;
    signals: Signal[];
}

const PRESET_DBC_ENGINE = `BO_ 201 EEC1_Engine: 8 EngineECU
 SG_ ThrottlePosition : 8|8@1+ (0.392,0) [0|100] "%" Dashboard
 SG_ CoolantTemp : 16|8@1- (1,-40) [-40|215] "C" Dashboard
 SG_ EngineSpeed : 24|16@1+ (0.125,0) [0|8000] "rpm" Gateway
 SG_ EngineTorque : 40|8@1- (0.5,-125) [-125|125] "%" TCU`;

const PRESET_DBC_BODY = `BO_ 513 BCM_Status: 8 BodyControlECU
 SG_ HeadlightsActive : 0|1@1+ (1,0) [0|1] "" IPC
 SG_ TurnSignalsStatus : 2|2@1+ (1,0) [0|3] "" IPC
 SG_ DriverDoorOpen : 4|1@1+ (1,0) [0|1] "" IPC
 SG_ CabinTemperature : 8|8@1+ (0.5,-10) [-10|50] "C" HVAC
 SG_ WiperSpeedSetting : 16|3@1+ (1,0) [0|5] "" Gateway`;

const COLORS = [
    'bg-blue-500 border-blue-600 text-white',
    'bg-emerald-500 border-emerald-600 text-white',
    'bg-amber-500 border-amber-600 text-white',
    'bg-purple-500 border-purple-600 text-white',
    'bg-rose-500 border-rose-600 text-white',
    'bg-cyan-500 border-cyan-600 text-white',
];

export const DbcParser: React.FC = () => {
    const [dbcText, setDbcText] = useState(PRESET_DBC_ENGINE);
    const [parsedMessage, setParsedMessage] = useState<Message | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
    const [rawPayload, setRawPayload] = useState<Uint8Array>(new Uint8Array(8));

    // Parse DBC when text changes
    useEffect(() => {
        try {
            setParseError(null);
            const lines = dbcText.split('\n');
            let currentMsg: Message | null = null;
            let signalIndex = 0;

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;

                // Match Message: BO_ 201 EEC1_Engine: 8 EngineECU
                const msgMatch = line.match(/^BO_\s+(\d+)\s+(\w+)\s*:\s*(\d+)\s+(\w+)/);
                if (msgMatch) {
                    currentMsg = {
                        id: parseInt(msgMatch[1], 10),
                        name: msgMatch[2],
                        size: parseInt(msgMatch[3], 10),
                        sender: msgMatch[4],
                        signals: []
                    };
                    continue;
                }

                // Match Signal: SG_ ThrottlePosition : 8|8@1+ (0.392,0) [0|100] "%" Dashboard
                // Pattern explanation:
                // SG_ [Name] : [StartBit]|[Len]@[Endian][Sign] ([Factor],[Offset]) [[Min]|[Max]] "[Unit]" [Receiver]
                const sigMatch = line.match(/^SG_\s+(\w+)\s*(?:[Mm]\d*)?\s*:\s*(\d+)\|(\d+)@([01])([\+-])\s*\(([^,]+),([^)]+)\)\s*\[([^|]+)\|([^\]]+)\]\s*"([^"]*)"\s*(\w+)/);
                if (sigMatch && currentMsg) {
                    const min = parseFloat(sigMatch[8]);
                    const max = parseFloat(sigMatch[9]);
                    
                    const signal: Signal = {
                        name: sigMatch[1],
                        startBit: parseInt(sigMatch[2], 10),
                        length: parseInt(sigMatch[3], 10),
                        isIntel: sigMatch[4] === '1', // 1 = Intel, 0 = Motorola
                        isSigned: sigMatch[5] === '-',
                        factor: parseFloat(sigMatch[6]),
                        offset: parseFloat(sigMatch[7]),
                        min,
                        max,
                        unit: sigMatch[10],
                        receiver: sigMatch[11],
                        value: min, // initialize at minimum
                        color: COLORS[signalIndex % COLORS.length]
                    };
                    currentMsg.signals.push(signal);
                    signalIndex++;
                }
            }

            if (currentMsg) {
                setParsedMessage(currentMsg);
                if (currentMsg.signals.length > 0) {
                    setSelectedSignal(currentMsg.signals[0]);
                } else {
                    setSelectedSignal(null);
                }
            } else {
                setParsedMessage(null);
                setParseError("Could not find any valid Message definition (starting with BO_).");
            }
        } catch (e: any) {
            setParseError(`Parsing error: ${e.message}`);
        }
    }, [dbcText]);

    // Recalculate raw frame bytes whenever signals or values change
    useEffect(() => {
        if (!parsedMessage) return;

        const buffer = new Uint8Array(parsedMessage.size);

        parsedMessage.signals.forEach(sig => {
            // Physical value to raw integer value
            let rawVal = Math.round((sig.value - sig.offset) / sig.factor);
            
            // Boundary checks for raw values based on length
            const maxRaw = Math.pow(2, sig.length) - 1;
            if (rawVal < 0) rawVal = 0;
            if (rawVal > maxRaw) rawVal = maxRaw;

            // Pack bits into the 8-byte buffer
            // Intel (Little Endian) format packing:
            // Start bit is the LSB. Bits are placed sequentially upwards.
            if (sig.isIntel) {
                for (let i = 0; i < sig.length; i++) {
                    const currentBit = sig.startBit + i;
                    const byteIdx = Math.floor(currentBit / 8);
                    const bitIdx = currentBit % 8;

                    if (byteIdx < buffer.length) {
                        const bitValue = (rawVal >> i) & 1;
                        if (bitValue === 1) {
                            buffer[byteIdx] |= (1 << bitIdx);
                        } else {
                            buffer[byteIdx] &= ~(1 << bitIdx);
                        }
                    }
                }
            } else {
                // Motorola (Big Endian) packing:
                // Start bit is the MSB of the first byte. Bits pack downwards.
                // Simplified Motorola mapping for visual educational purpose
                for (let i = 0; i < sig.length; i++) {
                    const currentBit = sig.startBit - i;
                    const byteIdx = Math.floor(currentBit / 8);
                    const bitIdx = currentBit % 8;

                    if (byteIdx >= 0 && byteIdx < buffer.length) {
                        const bitValue = (rawVal >> (sig.length - 1 - i)) & 1;
                        if (bitValue === 1) {
                            buffer[byteIdx] |= (1 << bitIdx);
                        } else {
                            buffer[byteIdx] &= ~(1 << bitIdx);
                        }
                    }
                }
            }
        });

        setRawPayload(buffer);
    }, [parsedMessage, parsedMessage?.signals.map(s => s.value).join(',')]);

    const handleSignalValueChange = (sigName: string, val: number) => {
        if (!parsedMessage) return;
        setParsedMessage(prev => {
            if (!prev) return null;
            return {
                ...prev,
                signals: prev.signals.map(s => {
                    if (s.name === sigName) {
                        // Clamp value
                        const clamped = Math.max(s.min, Math.min(s.max, val));
                        return { ...s, value: clamped };
                    }
                    return s;
                })
            };
        });
    };

    // Helper to check if a specific bit belongs to a signal
    const getSignalForBit = (bitIndex: number): Signal | null => {
        if (!parsedMessage) return null;
        for (let sig of parsedMessage.signals) {
            if (sig.isIntel) {
                if (bitIndex >= sig.startBit && bitIndex < sig.startBit + sig.length) {
                    return sig;
                }
            } else {
                // Motorola: bitIndex goes downwards from start bit
                if (bitIndex <= sig.startBit && bitIndex > sig.startBit - sig.length) {
                    return sig;
                }
            }
        }
        return null;
    };

    // Helper to build path strings for oscilloscope (CAN_H / CAN_L)
    const buildOscilloscopePaths = () => {
        let pathH = '';
        let pathL = '';
        const xStep = 12.8;
        const xOffset = 60;
        
        for (let i = 0; i < 64; i++) {
            const byteIdx = Math.floor(i / 8);
            const bitOffset = 7 - (i % 8); // Display bits standard MSB-first in oscilloscope
            const bitVal = (rawPayload[byteIdx] >> bitOffset) & 1;
            
            // CAN physical voltage levels:
            // Dominant (0): CAN_H = 3.5V (y = 20), CAN_L = 1.5V (y = 70)
            // Recessive (1): CAN_H = 2.5V (y = 45), CAN_L = 2.5V (y = 45)
            const yH = bitVal === 0 ? 20 : 45;
            const yL = bitVal === 0 ? 70 : 45;
            
            const xStart = i * xStep + xOffset;
            const xEnd = (i + 1) * xStep + xOffset;
            
            if (i === 0) {
                pathH += `M ${xStart} ${yH} L ${xEnd} ${yH}`;
                pathL += `M ${xStart} ${yL} L ${xEnd} ${yL}`;
            } else {
                pathH += ` L ${xStart} ${yH} L ${xEnd} ${yH}`;
                pathL += ` L ${xStart} ${yL} L ${xEnd} ${yL}`;
            }
        }
        return { pathH, pathL };
    };

    const renderOscilloscopeHighlights = () => {
        const xStep = 12.8;
        const xOffset = 60;
        const highlights: React.ReactNode[] = [];
        
        for (let i = 0; i < 64; i++) {
            const byteIdx = Math.floor(i / 8);
            const bitOffset = 7 - (i % 8);
            const bitIndex = byteIdx * 8 + bitOffset;
            const sig = getSignalForBit(bitIndex);
            
            if (sig && selectedSignal && sig.name === selectedSignal.name) {
                const xStart = i * xStep + xOffset;
                highlights.push(
                    <rect
                        key={i}
                        x={xStart}
                        y={10}
                        width={xStep}
                        height={70}
                        fill="#fb923c"
                        opacity={0.16}
                    />
                );
            }
        }
        return highlights;
    };

    const { pathH, pathL } = buildOscilloscopePaths();

    return (
        <div className="flex flex-col bg-gray-950 p-4 gap-6 text-gray-100 min-h-full">
            {/* Top Row: 3-column layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch w-full">
                
                {/* Col 1: DBC Editor / Upload (4 cols) */}
                <div className="xl:col-span-4 bg-[#0d1117] border border-gray-800 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <h4 className="font-bold text-gray-200 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <FileCode size={16} className="text-amber-400" />
                            DBC Syntax Input
                        </h4>
                        <div className="flex gap-1.5">
                            <button 
                                onClick={() => setDbcText(PRESET_DBC_ENGINE)}
                                className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-1 rounded hover:bg-amber-500/20 border border-amber-500/20 transition-all"
                            >
                                Engine DBC
                            </button>
                            <button 
                                onClick={() => setDbcText(PRESET_DBC_BODY)}
                                className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-1 rounded hover:bg-amber-500/20 border border-amber-500/20 transition-all"
                            >
                                Body DBC
                            </button>
                        </div>
                    </div>

                    <div className="relative flex-1">
                        <textarea
                            value={dbcText}
                            onChange={e => setDbcText(e.target.value)}
                            placeholder="Paste CAN DBC syntax here..."
                            className="w-full h-[300px] xl:h-[420px] font-mono text-xs border border-gray-800 rounded-lg p-3 bg-gray-950 focus:bg-gray-900 text-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
                        />
                    </div>

                    {parseError ? (
                        <div className="bg-red-950/30 border border-red-900/50 text-red-400 text-xs p-3 rounded-lg flex items-start gap-2">
                            <Info size={16} className="flex-shrink-0 mt-0.5" />
                            <span>{parseError}</span>
                        </div>
                    ) : (
                        <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-[11px] p-2.5 rounded-lg flex items-center gap-2 font-medium">
                            <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                            <span>DBC Parsed successfully! Message: <b>{parsedMessage?.name}</b></span>
                        </div>
                    )}

                    {/* DBC Syntax Reference Legend */}
                    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-3.5 text-xs">
                        <h5 className="font-bold text-amber-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                            <Info size={12} />
                            DBC Syntax Legend
                        </h5>
                        <div className="space-y-2 text-[10px] font-mono text-gray-400">
                            <div>
                                <span className="text-gray-300 font-bold">BO_ [ID] [Name]: [Size] [Sender]</span>
                                <p className="text-[9px] text-gray-500 font-sans mt-0.5 leading-relaxed">Defines a Message. E.g. Message ID 201 sent by EngineECU.</p>
                            </div>
                            <div>
                                <span className="text-gray-300 font-bold">SG_ [Name] : [Start]|[Len]@[Endian][Sign] ...</span>
                                <p className="text-[9px] text-gray-500 font-sans mt-0.5 leading-relaxed">Defines a Signal. E.g. 8|8@1+ means start bit 8, length 8 bits, Intel layout (@1), unsigned (+).</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Col 2: 64-bit Grid Visualizer (4 cols) */}
                <div className="xl:col-span-4 bg-[#0d1117] border border-gray-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between min-h-[400px]">
                    <div className="flex justify-between items-center text-white border-b border-gray-800 pb-2 mb-4">
                        <h4 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wide text-gray-200">
                            <LayoutGrid size={16} className="text-cyan-400" />
                            CAN Payload Bit Matrix (64 bits)
                        </h4>
                    </div>

                    {/* The 8x8 Grid */}
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="grid grid-cols-9 gap-1 text-center font-mono">
                            {/* Column labels (Bits 7 to 0) */}
                            <div className="text-[9px] text-gray-500 font-bold self-center">Byte</div>
                            {[7, 6, 5, 4, 3, 2, 1, 0].map(bit => (
                                <div key={bit} className="text-[8px] text-gray-500 font-bold">Bit {bit}</div>
                            ))}

                            {/* 8 rows representing Byte 0 to Byte 7 */}
                            {[0, 1, 2, 3, 4, 5, 6, 7].map(byteIdx => (
                                <React.Fragment key={byteIdx}>
                                    {/* Row label (Byte index) */}
                                    <div className="text-[10px] text-gray-400 font-bold flex items-center justify-center bg-gray-900/60 rounded border border-gray-800/40 py-1.5">
                                        Byte {byteIdx}
                                    </div>
                                    {/* Bits inside the byte (from 7 down to 0) */}
                                    {[7, 6, 5, 4, 3, 2, 1, 0].map(bitOffset => {
                                        const bitIndex = byteIdx * 8 + bitOffset;
                                        const mappedSig = getSignalForBit(bitIndex);
                                        const isHovered = selectedSignal && mappedSig?.name === selectedSignal.name;
                                        const rawBitVal = (rawPayload[byteIdx] >> bitOffset) & 1;

                                        return (
                                            <div
                                                key={bitOffset}
                                                onClick={() => mappedSig && setSelectedSignal(mappedSig)}
                                                className={`h-8 border rounded flex flex-col items-center justify-center font-mono cursor-pointer transition-all ${
                                                    mappedSig 
                                                        ? `${mappedSig.color} ${isHovered ? 'scale-105 ring-2 ring-white border-white z-10' : 'opacity-85 border-transparent'}`
                                                        : 'bg-gray-950 border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
                                                }`}
                                                title={mappedSig ? `Signal: ${mappedSig.name}\nBit: ${bitIndex}\nVal: ${rawBitVal}` : `Unmapped bit: ${bitIndex}`}
                                            >
                                                <span className="text-xs font-bold">{rawBitVal}</span>
                                                <span className="text-[7px] opacity-40 leading-none">{bitIndex}</span>
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Standard CAN 2.0A Frame Visualizer */}
                    <div className="mt-6 bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-xs">
                        <span className="text-[9px] font-bold text-gray-500 uppercase block mb-2">CAN 2.0A Frame Structure</span>
                        <div className="flex flex-wrap gap-1 text-[9px] text-center">
                            <div className="flex-1 min-w-[28px] p-1.5 bg-gray-900 border border-gray-800 rounded">
                                <div className="text-gray-600 text-[7px] uppercase">SOF</div>
                                <div className="text-gray-300 font-bold">0</div>
                            </div>
                            <div className="flex-[3] min-w-[65px] p-1.5 bg-cyan-950/40 border border-cyan-800/40 rounded">
                                <div className="text-cyan-400 text-[7px] uppercase font-bold">CAN ID</div>
                                <div className="text-cyan-300 font-bold">0x{parsedMessage?.id.toString(16).toUpperCase()}</div>
                            </div>
                            <div className="flex-1 min-w-[32px] p-1.5 bg-gray-900 border border-gray-800 rounded">
                                <div className="text-gray-600 text-[7px] uppercase">DLC</div>
                                <div className="text-gray-300 font-bold">{parsedMessage?.size ?? 8}</div>
                            </div>
                            <div className="flex-[8] min-w-[140px] p-1.5 bg-emerald-950/30 border border-emerald-800/30 rounded">
                                <div className="text-emerald-400 text-[7px] uppercase font-bold">Data (64-bit)</div>
                                <div className="text-emerald-300 font-bold truncate">
                                    {Array.from(rawPayload).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}
                                </div>
                            </div>
                            <div className="flex-2 min-w-[45px] p-1.5 bg-gray-900 border border-gray-800 rounded">
                                <div className="text-gray-600 text-[7px] uppercase font-bold">CRC</div>
                                <div className="text-gray-400 font-bold">0x3FCA</div>
                            </div>
                            <div className="flex-1 min-w-[30px] p-1.5 bg-gray-900 border border-gray-800 rounded">
                                <div className="text-gray-600 text-[7px] uppercase">ACK</div>
                                <div className="text-emerald-500 font-bold">OK</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Col 3: Signal Sliders (4 cols) */}
                <div className="xl:col-span-4 bg-[#0d1117] border border-gray-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between w-full">
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center border-b border-gray-800 pb-2 mb-2">
                            <h4 className="font-bold text-gray-200 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Sliders size={16} className="text-amber-400" />
                                Signal Modulator Panel
                            </h4>
                        </div>

                        {parsedMessage && parsedMessage.signals.length > 0 ? (
                            <div className="space-y-4">
                                {parsedMessage.signals.map(sig => {
                                    const isSelected = selectedSignal && selectedSignal.name === sig.name;
                                    return (
                                        <div 
                                            key={sig.name}
                                            onClick={() => setSelectedSignal(sig)}
                                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                                isSelected 
                                                    ? 'border-amber-500 bg-amber-500/10' 
                                                    : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-2">
                                                    {/* Small Color Dot */}
                                                    <div className={`w-2.5 h-2.5 rounded-full ${sig.color.split(' ')[0]}`} />
                                                    <span className="font-bold text-gray-200 text-xs font-mono">{sig.name}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-500 font-mono">
                                                    bit {sig.startBit}:{sig.length}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 mt-2">
                                                <input 
                                                    type="range"
                                                    min={sig.min}
                                                    max={sig.max}
                                                    step={sig.factor}
                                                    value={sig.value}
                                                    onChange={e => handleSignalValueChange(sig.name, parseFloat(e.target.value))}
                                                    className="flex-1 accent-amber-500 cursor-pointer h-1 bg-gray-700 rounded-full appearance-none"
                                                />
                                                <span className="text-xs font-bold font-mono text-gray-300 w-16 text-right">
                                                    {sig.value.toFixed(1).replace(/\.0$/, '')} {sig.unit}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-gray-500 italic text-center py-10 text-xs">No signals parsed. Correct any DBC errors.</div>
                        )}
                    </div>

                    {/* Selected Signal details card */}
                    {selectedSignal && (
                        <div className="mt-6 bg-gradient-to-br from-gray-900 to-amber-950/20 border border-amber-900/20 rounded-xl p-4 text-xs text-gray-400 space-y-2">
                            <h5 className="font-bold text-amber-400 font-mono text-xs flex justify-between">
                                <span>Signal: {selectedSignal.name}</span>
                                <span className="text-[9px] font-sans font-normal text-gray-500 uppercase tracking-wide">Signal Details</span>
                            </h5>
                            <div className="grid grid-cols-2 gap-y-1.5 font-mono text-[9px] text-gray-400">
                                <div><b>Start Bit:</b> {selectedSignal.startBit}</div>
                                <div><b>Length:</b> {selectedSignal.length} bits</div>
                                <div><b>Factor:</b> {selectedSignal.factor}</div>
                                <div><b>Offset:</b> {selectedSignal.offset}</div>
                                <div><b>Min / Max:</b> {selectedSignal.min} / {selectedSignal.max} {selectedSignal.unit}</div>
                                <div><b>Byte Order:</b> {selectedSignal.isIntel ? 'Intel (LE)' : 'Motorola (BE)'}</div>
                                <div className="col-span-2"><b>Transmitted To:</b> {selectedSignal.receiver}</div>
                            </div>
                            <p className="text-[9px] text-gray-500 leading-relaxed pt-2 border-t border-gray-800">
                                <b>Formula:</b> Physical Value = (Raw Integer × {selectedSignal.factor}) + {selectedSignal.offset}. Moving the slider packs physical values into raw binaries.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Oscilloscope Panel (CAN Logic Analyzer) */}
            <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-5 shadow-2xl w-full flex flex-col gap-3">
                <div>
                    <h4 className="font-bold text-gray-200 text-sm uppercase tracking-wide flex items-center gap-2">
                        <Activity className="text-amber-400" size={16} />
                        CAN Bus Logic Analyzer (Physical Layer Waveform)
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Visualizing differential **CAN_H** (High) and **CAN_L** (Low) signals on the copper wire based on your 64-bit frame payload. 
                        Dominant state (logical 0) drives the lines apart (3.5V / 1.5V), while recessive state (logical 1) returns the lines to the 2.5V idle state.
                        The highlighted orange segments show where the selected signal **{selectedSignal?.name}** is situated inside the serial packet stream.
                    </p>
                </div>

                <div className="w-full overflow-x-auto bg-gray-950 rounded-xl border border-gray-800 p-2.5 scrollbar-hide">
                    <div style={{ minWidth: 920 }}>
                        <svg viewBox="0 0 920 100" className="w-full h-[100px]" preserveAspectRatio="none">
                            <defs>
                                <filter id="glow-H"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                                <filter id="glow-L"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                            </defs>

                            {/* Voltage Grid Lines */}
                            <line x1={60} y1={20} x2={900} y2={20} stroke="#1f2937" strokeWidth="0.5" strokeDasharray="3 3" />
                            <line x1={60} y1={45} x2={900} y2={45} stroke="#374151" strokeWidth="0.75" />
                            <line x1={60} y1={70} x2={900} y2={70} stroke="#1f2937" strokeWidth="0.5" strokeDasharray="3 3" />

                            {/* Voltage Markers */}
                            <text x={10} y={23} fill="#10b981" fontSize="7.5" fontWeight="bold" fontFamily="monospace">CAN_H 3.5V</text>
                            <text x={10} y={48} fill="#6b7280" fontSize="7.5" fontWeight="bold" fontFamily="monospace">Idle 2.5V</text>
                            <text x={10} y={73} fill="#f43f5e" fontSize="7.5" fontWeight="bold" fontFamily="monospace">CAN_L 1.5V</text>

                            {/* Selected Signal Highlights */}
                            {renderOscilloscopeHighlights()}

                            {/* Serial Grid bit boundaries */}
                            {Array.from({ length: 65 }).map((_, i) => {
                                const x = i * 12.8 + 60;
                                return (
                                    <line key={i} x1={x} y1={10} x2={x} y2={80} stroke="#111827" strokeWidth={i % 8 === 0 ? "1.5" : "0.5"} />
                                );
                            })}

                            {/* Byte Markers */}
                            {Array.from({ length: 8 }).map((_, i) => {
                                const x = i * 8 * 12.8 + 60 + 51;
                                return (
                                    <text key={i} x={x} y={8} textAnchor="middle" fill="#4b5563" fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                                        Byte {i}
                                    </text>
                                );
                            })}

                            {/* The CAN_H Waveform (Green) */}
                            <path d={pathH} fill="none" stroke="#10b981" strokeWidth="2.5" filter="url(#glow-H)" strokeLinecap="round" strokeLinejoin="round" />

                            {/* The CAN_L Waveform (Rose) */}
                            <path d={pathL} fill="none" stroke="#f43f5e" strokeWidth="2.5" filter="url(#glow-L)" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>

                <div className="flex gap-6 justify-end items-center font-mono text-[9px] text-gray-500 pr-2">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#10b981] rounded" /> CAN_H</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#f43f5e] rounded" /> CAN_L</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#fb923c]/20 border border-[#fb923c] rounded" /> Selected Signal Bits</span>
                </div>
            </div>
        </div>
    );
};
