import React, { useState, useEffect } from 'react';
import { FileCode, CheckCircle, Info, Sliders, LayoutGrid } from 'lucide-react';

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

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-1 text-gray-900">
            {/* Col 1: DBC Editor / Upload (4 cols) */}
            <div className="xl:col-span-4 bg-white border border-gray-200 rounded-xl p-5 shadow-lg flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase">
                        <FileCode size={16} className="text-cyan-600" />
                        DBC Syntax Input
                    </h4>
                    <div className="flex gap-1.5">
                        <button 
                            onClick={() => setDbcText(PRESET_DBC_ENGINE)}
                            className="text-[10px] bg-cyan-50 text-cyan-700 font-bold px-2 py-1 rounded hover:bg-cyan-100 border border-cyan-200"
                        >
                            Engine DBC
                        </button>
                        <button 
                            onClick={() => setDbcText(PRESET_DBC_BODY)}
                            className="text-[10px] bg-cyan-50 text-cyan-700 font-bold px-2 py-1 rounded hover:bg-cyan-100 border border-cyan-200"
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
                        className="w-full h-[300px] xl:h-[420px] font-mono text-xs border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none"
                    />
                </div>

                {parseError ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-start gap-2">
                        <Info size={16} className="flex-shrink-0 mt-0.5" />
                        <span>{parseError}</span>
                    </div>
                ) : (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] p-2.5 rounded-lg flex items-center gap-2 font-medium">
                        <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                        <span>DBC Parsed successfully! Message: <b>{parsedMessage?.name}</b></span>
                    </div>
                )}
            </div>

            {/* Col 2: 64-bit Grid Visualizer (4 cols) */}
            <div className="xl:col-span-4 bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between min-h-[400px]">
                <div className="flex justify-between items-center text-white border-b border-gray-800 pb-2 mb-4">
                    <h4 className="font-bold flex items-center gap-2 text-sm uppercase">
                        <LayoutGrid size={16} className="text-cyan-400" />
                        CAN Payload Bit Matrix (64 bits)
                    </h4>
                </div>

                {/* The 8x8 Grid */}
                <div className="flex-1 flex flex-col justify-center">
                    <div className="grid grid-cols-9 gap-1 text-center font-mono">
                        {/* Column labels (Bits 7 to 0) */}
                        <div className="text-[10px] text-gray-500 font-bold self-center">Byte</div>
                        {[7, 6, 5, 4, 3, 2, 1, 0].map(bit => (
                            <div key={bit} className="text-[9px] text-gray-500 font-bold">Bit {bit}</div>
                        ))}

                        {/* 8 rows representing Byte 0 to Byte 7 */}
                        {[0, 1, 2, 3, 4, 5, 6, 7].map(byteIdx => (
                            <React.Fragment key={byteIdx}>
                                {/* Row label (Byte index) */}
                                <div className="text-xs text-gray-400 font-bold flex items-center justify-center bg-gray-800/40 rounded border border-gray-800/20 py-1.5">
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
                                                    : 'bg-gray-950 border-gray-800 text-gray-700 hover:border-gray-700'
                                            }`}
                                            title={mappedSig ? `Signal: ${mappedSig.name}\nBit: ${bitIndex}\nVal: ${rawBitVal}` : `Unmapped bit: ${bitIndex}`}
                                        >
                                            <span className="text-xs font-bold">{rawBitVal}</span>
                                            <span className="text-[8px] opacity-40 leading-none">{bitIndex}</span>
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* 64-bit Hex output display */}
                <div className="mt-6 bg-gray-950 border border-gray-800 rounded-lg p-3 text-center font-mono">
                    <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Raw CAN Frame Payload Hex</span>
                    <div className="text-sm font-bold text-cyan-400 select-all tracking-wider flex justify-center gap-2">
                        {Array.from(rawPayload).map((b, i) => (
                            <span 
                                key={i}
                                className={`px-1.5 py-0.5 rounded transition-all duration-300 ${
                                    // Highlight byte if selected signal has bits in it
                                    selectedSignal && (
                                        selectedSignal.isIntel 
                                            ? (i >= Math.floor(selectedSignal.startBit/8) && i <= Math.floor((selectedSignal.startBit + selectedSignal.length - 1)/8))
                                            : (i <= Math.floor(selectedSignal.startBit/8) && i >= Math.floor((selectedSignal.startBit - selectedSignal.length + 1)/8))
                                    )
                                        ? 'bg-cyan-900/30 text-cyan-300 ring-1 ring-cyan-500'
                                        : ''
                                }`}
                            >
                                {b.toString(16).toUpperCase().padStart(2, '0')}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Col 3: Signal Sliders (4 cols) */}
            <div className="xl:col-span-4 bg-white border border-gray-200 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-2">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase">
                            <Sliders size={16} className="text-cyan-600" />
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
                                                ? 'border-cyan-500 bg-cyan-50/20' 
                                                : 'border-gray-100 hover:border-gray-200'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                {/* Small Color Dot */}
                                                <div className={`w-2.5 h-2.5 rounded-full ${sig.color.split(' ')[0]}`} />
                                                <span className="font-bold text-gray-800 text-xs font-mono">{sig.name}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono">
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
                                                className="flex-1 accent-cyan-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                                            />
                                            <span className="text-xs font-bold font-mono text-gray-700 w-16 text-right">
                                                {sig.value.toFixed(1).replace(/\.0$/, '')} {sig.unit}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-gray-400 italic text-center py-10 text-xs">No signals parsed. Correct any DBC errors.</div>
                    )}
                </div>

                {/* Selected Signal details card */}
                {selectedSignal && (
                    <div className="mt-6 bg-gradient-to-br from-blue-50 to-cyan-50 border border-cyan-200/50 rounded-xl p-4 text-xs text-gray-700 space-y-2">
                        <h5 className="font-bold text-gray-900 font-mono text-xs flex justify-between">
                            <span>Signal: {selectedSignal.name}</span>
                            <span className="text-[10px] font-sans font-normal text-gray-400 uppercase tracking-wide">Signal Details</span>
                        </h5>
                        <div className="grid grid-cols-2 gap-y-1.5 font-mono text-[10px]">
                            <div><b>Start Bit:</b> {selectedSignal.startBit}</div>
                            <div><b>Length:</b> {selectedSignal.length} bits</div>
                            <div><b>Factor:</b> {selectedSignal.factor}</div>
                            <div><b>Offset:</b> {selectedSignal.offset}</div>
                            <div><b>Min / Max:</b> {selectedSignal.min} / {selectedSignal.max} {selectedSignal.unit}</div>
                            <div><b>Byte Order:</b> {selectedSignal.isIntel ? 'Intel (Little Endian)' : 'Motorola (Big Endian)'}</div>
                            <div className="col-span-2"><b>Transmitted To:</b> {selectedSignal.receiver}</div>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed pt-2 border-t border-cyan-200/30">
                            <b>Formula:</b> Physical Value = (Raw Integer × {selectedSignal.factor}) + {selectedSignal.offset}. Moving the slider translates physical values directly into packed binary structures inside the CAN frame.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
