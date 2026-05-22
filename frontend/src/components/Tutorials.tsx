import React, { useState, useEffect } from 'react';
import { BookOpen, Award, CheckCircle2, Play, HelpCircle, Code, ShieldAlert, Wifi, RefreshCw } from 'lucide-react';

interface Lesson {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const LESSONS: Lesson[] = [
    {
        id: 'can',
        title: 'CAN Bus Essentials',
        description: 'Learn arbitration, differential signaling, frame formats, and bit stuffing.',
        icon: <Code size={20} />,
        color: 'text-rose-500 bg-rose-50 border-rose-200'
    },
    {
        id: 'uds',
        title: 'UDS Diagnostics',
        description: 'Master diagnostic sessions, DID reading, clearing DTCs, and seed-key handshakes.',
        icon: <ShieldAlert size={20} />,
        color: 'text-amber-500 bg-amber-50 border-amber-200'
    },
    {
        id: 'someip',
        title: 'SOME/IP & Ethernet',
        description: 'Compare signal buses to dynamic middleware, RPC, and eventgroups.',
        icon: <BookOpen size={20} />,
        color: 'text-purple-500 bg-purple-50 border-purple-200'
    },
    {
        id: 'mqtt',
        title: 'MQTT & Connected Vehicles',
        description: 'Understand telematics gateways, cloud brokers, and wildcard topic matching.',
        icon: <Wifi size={20} />,
        color: 'text-cyan-500 bg-cyan-50 border-cyan-200'
    }
];

export const Tutorials: React.FC = () => {
    const [selectedLesson, setSelectedLesson] = useState<string>('can');
    const [activeTab, setActiveTab] = useState<'theory' | 'interactive' | 'quiz'>('theory');
    const [completedLessons, setCompletedLessons] = useState<string[]>([]);
    
    // Quiz states
    const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizPassed, setQuizPassed] = useState(false);

    // Interactive element states
    // CAN arbitration state
    const [arbStep, setArbStep] = useState(0);
    const [arbLog, setArbLog] = useState<string[]>([]);
    const [isArbitrating, setIsArbitrating] = useState(false);
    
    // UDS Seed Key state
    const [udsSeed, setUdsSeed] = useState<number | null>(null);
    const [udsKeyInput, setUdsKeyInput] = useState('');
    const [udsUnlocked, setUdsUnlocked] = useState(false);
    const [udsFeedback, setUdsFeedback] = useState('');

    // SOME/IP Matching game state
    const [someipMatches, setSomeipMatches] = useState<Record<string, string>>({});
    const [someipFeedback, setSomeipFeedback] = useState('');

    // MQTT Matcher state
    const [mqttMatchFeedback, setMqttMatchFeedback] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('autolearn_completed_lessons');
        if (stored) {
            setCompletedLessons(JSON.parse(stored));
        }
    }, []);

    // Reset tab and quiz when switching lessons
    useEffect(() => {
        setActiveTab('theory');
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizPassed(false);
        
        // Reset interactives
        setArbStep(0);
        setArbLog([]);
        setIsArbitrating(false);
        setUdsSeed(null);
        setUdsKeyInput('');
        setUdsUnlocked(false);
        setUdsFeedback('');
        setSomeipMatches({});
        setSomeipFeedback('');
        setMqttMatchFeedback('');
    }, [selectedLesson]);

    const completeLesson = (id: string) => {
        if (!completedLessons.includes(id)) {
            const nextCompleted = [...completedLessons, id];
            setCompletedLessons(nextCompleted);
            localStorage.setItem('autolearn_completed_lessons', JSON.stringify(nextCompleted));
        }
    };

    // Quiz Questions Data
    const quizData: Record<string, { q: string, options: string[], correct: number, explanation: string }[]> = {
        can: [
            {
                q: "What voltage state represents a dominant '0' on a CAN High/Low differential bus?",
                options: [
                    "CAN High and CAN Low voltages are equal (2.5V)",
                    "CAN High goes to 3.5V and CAN Low drops to 1.5V",
                    "CAN High goes to 5.0V and CAN Low goes to 0V",
                    "The bus enters a high-impedance floating state"
                ],
                correct: 1,
                explanation: "Differential dominant '0' occurs when the transceiver actively drives CAN_H to 3.5V and CAN_L to 1.5V (a 2.0V delta). Recessive '1' leaves both at 2.5V."
            },
            {
                q: "During arbitration, how does a winning node maintain transmission?",
                options: [
                    "It has a higher baud rate than the other nodes",
                    "It sends a recessive bit which overrides dominant bits",
                    "It sends a dominant bit (logical 0) which overrides recessive bits (logical 1)",
                    "It requests permission from the central gateway module"
                ],
                correct: 2,
                explanation: "Arbitration is non-destructive. If one node writes a dominant '0' while another writes a recessive '1', the bus state becomes '0'. The node sending '1' detects the mismatch and drops off."
            },
            {
                q: "What is the primary purpose of 'Bit Stuffing' in CAN?",
                options: [
                    "To increase the data rate of transmission",
                    "To ensure enough edge transitions for transceiver clock synchronization",
                    "To pad the data length code (DLC) to a full 8 bytes",
                    "To encrypt the payload for safety security"
                ],
                explanation: "CAN has no clock line. To sync clocks, transceivers look for voltage changes. If 5 identical consecutive bits are sent, a bit of opposite polarity is stuffed to force an edge transition.",
                correct: 1
            }
        ],
        uds: [
            {
                q: "Which Service ID (SID) is used to clear Diagnostic Trouble Codes (DTCs)?",
                options: [
                    "Service 0x10",
                    "Service 0x14",
                    "Service 0x19",
                    "Service 0x22"
                ],
                correct: 1,
                explanation: "UDS Service 0x14 is 'Clear Diagnostic Information' which deletes logged DTCs from the ECU non-volatile memory."
            },
            {
                q: "If an ECU responds with 7F 22 24, what occurred?",
                options: [
                    "Positive Response confirming sensor state",
                    "Negative Response (0x7F) for Read DID (0x22) due to Request Sequence Error (0x24)",
                    "A security access seed-key match was unlocked",
                    "The gateway dropped the packet due to wrong length"
                ],
                correct: 1,
                explanation: "0x7F indicates a Negative Response. The next byte is the service requested (0x22 = Read Data by Identifier). The third byte is the Negative Response Code (0x24 = Request Sequence Error)."
            },
            {
                q: "Why does an ECU require Service 0x27 Security Access?",
                options: [
                    "To read basic telemetry like vehicle speed or VIN",
                    "To restrict critical operations like ECU flashing, actuator testing, or configuration writing to authorized tools",
                    "To encrypt CAN frames on the physical wire",
                    "To switch the powertrain relay on or off"
                ],
                correct: 1,
                explanation: "Security Access (0x27) locks down operations that could compromise safety or security. It requires a challenge-response (seed-key) exchange to unlock higher sessions."
            }
        ],
        someip: [
            {
                q: "How does SOME/IP differ fundamentally from traditional CAN communication?",
                options: [
                    "SOME/IP uses dynamic service discovery and point-to-point IP packets, while CAN uses static broadcast frames",
                    "SOME/IP requires a broker, while CAN requires a centralized server gateway",
                    "SOME/IP is signal-based, while CAN is event-based",
                    "SOME/IP runs over single-wire LIN buses"
                ],
                correct: 0,
                explanation: "CAN is signal-based and statically broadcasts data frames. SOME/IP is middleware over Ethernet that dynamically offers, finds, and subscribes to service interfaces."
            },
            {
                q: "What is the role of SOME/IP-SD (Service Discovery)?",
                options: [
                    "To measure Ethernet wire length and ping latency",
                    "To allow clients to discover active service instances and manage eventgroup subscriptions in real time",
                    "To translate J1939 messages into JSON payloads",
                    "To assign IP addresses to new ECUs plugged into the vehicle"
                ],
                correct: 1,
                explanation: "Service Discovery allows servers to offer services, clients to search for services, and clients to subscribe to event notification groups dynamically."
            },
            {
                q: "Which SOME/IP Message Type represents a notification event?",
                options: [
                    "Type 0x00",
                    "Type 0x01",
                    "Type 0x02",
                    "Type 0x80"
                ],
                correct: 2,
                explanation: "0x00 represents a Request, 0x80 represents a Response, and 0x02 represents a Notification (used in publish-subscribe event streams)."
            }
        ],
        mqtt: [
            {
                q: "Which MQTT wildcard matches multiple levels of a topic hierarchy?",
                options: [
                    "The '+' character",
                    "The '*' character",
                    "The '#' character",
                    "The '$' character"
                ],
                correct: 2,
                explanation: "The hash '#' symbol is a multi-level wildcard matching any number of sub-topics (e.g. 'car/#' matches 'car/speed' and 'car/engine/temp/sensor1'). The plus '+' is single-level."
            },
            {
                q: "Why is MQTT preferred over HTTP for vehicle-to-cloud telematics?",
                options: [
                    "MQTT supports differential signaling on CAN buses",
                    "MQTT is lightweight, bidirectional, and uses a publish-subscribe architecture well-suited for high latency, low bandwidth networks",
                    "MQTT does not require a TCP connection",
                    "MQTT automatically translates signals into diagnostics DTCs"
                ],
                correct: 1,
                explanation: "MQTT's publish-subscribe paradigm, minimal headers, and keep-alive features make it ideal for telematics where mobile networks can be patchy."
            },
            {
                q: "What QoS level guarantees that a message is delivered exactly once?",
                options: [
                    "QoS 0",
                    "QoS 1",
                    "QoS 2",
                    "QoS 3"
                ],
                correct: 2,
                explanation: "QoS 0 is 'at most once' (no guarantee), QoS 1 is 'at least once' (guarantees delivery but allows duplicates), and QoS 2 is 'exactly once' (guarantees delivery and prevents duplicates using a 4-way handshake)."
            }
        ]
    };

    const handleQuizAnswer = (qIdx: number, optIdx: number) => {
        setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
    };

    const handleQuizSubmit = () => {
        const questions = quizData[selectedLesson];
        let correctCount = 0;
        
        questions.forEach((q, idx) => {
            if (quizAnswers[idx] === q.correct) {
                correctCount++;
            }
        });

        const passed = correctCount === questions.length;
        setQuizPassed(passed);
        setQuizSubmitted(true);

        if (passed) {
            completeLesson(selectedLesson);
        }
    };

    // INTERACTIVE: CAN Arbitration Simulation
    const runArbitration = async () => {
        if (isArbitrating) return;
        setIsArbitrating(true);
        setArbStep(0);
        setArbLog([]);

        const nodeA_ID = '01111100011'; // 0x3E3 (lower priority, bits 10 to 0)
        const nodeB_ID = '01111010011'; // 0x3D3 (higher priority, lower ID)
        
        const logs: string[] = ['[Start] Node A (0x3E3) & Node B (0x3D3) attempt to transmit simultaneously...'];
        setArbLog([...logs]);

        for (let i = 0; i < 11; i++) {
            await new Promise(resolve => setTimeout(resolve, 800));
            setArbStep(i + 1);

            const bitA = nodeA_ID[i];
            const bitB = nodeB_ID[i];
            
            if (bitA === bitB) {
                logs.push(`Bit ${i + 1}: Both nodes transmit bit ${bitA}. Mismatch not detected.`);
            } else {
                // Mismatch! B transmitted '0' (dominant), A transmitted '1' (recessive)
                logs.push(`Bit ${i + 1}: Node A transmits Recessive '1' | Node B transmits Dominant '0'.`);
                logs.push(`-> Bus goes DOMINANT (0) due to Node B.`);
                logs.push(`-> Node A detects Tx mismatch (sent 1, read 0) and loses arbitration!`);
                logs.push(`-> Node B wins arbitration and continues transmitting.`);
                setArbLog([...logs]);
                setIsArbitrating(false);
                return;
            }
            setArbLog([...logs]);
        }
        setIsArbitrating(false);
    };

    // INTERACTIVE: UDS Seed-Key Unlocker
    const handleRequestSeed = () => {
        const seed = Math.floor(0x1000 + Math.random() * 0x8FFF);
        setUdsSeed(seed);
        setUdsUnlocked(false);
        setUdsFeedback(`Received Seed: 0x${seed.toString(16).toUpperCase()}. Algorithim rule: Key = (Seed + 0x0123) & 0xFFFF. Calculate and enter key in Hex.`);
    };

    const handleVerifyKey = () => {
        if (udsSeed === null) return;
        const expected = (udsSeed + 0x0123) & 0xFFFF;
        const inputVal = parseInt(udsKeyInput.replace(/^0x/i, ''), 16);

        if (inputVal === expected) {
            setUdsUnlocked(true);
            setUdsFeedback('SUCCESS: Key is valid! Security Session Unlocked (Level 1).');
            completeLesson('uds'); // Unlock counts as completion
        } else {
            setUdsFeedback(`ERROR: Key 0x${udsKeyInput} is invalid. Expected 0x${expected.toString(16).toUpperCase()}. Try again!`);
        }
    };

    // INTERACTIVE: SOME/IP Matching
    const handleMatchOption = (key: string, val: string) => {
        const newMatches = { ...someipMatches, [key]: val };
        setSomeipMatches(newMatches);

        if (Object.keys(newMatches).length === 4) {
            // Verify
            const isCorrect = 
                newMatches['Service ID'] === 'Identifies the application service interface (e.g. HVAC, Infotainment)' &&
                newMatches['Method ID'] === 'Identifies the specific function or RPC API to invoke' &&
                newMatches['Message Type'] === 'Distinguishes between Requests, Responses, and Notifications' &&
                newMatches['Return Code'] === 'Reports success or error codes back to the client';

            if (isCorrect) {
                setSomeipFeedback('All matches are correct! Excellent knowledge of SOME/IP frame structures.');
                completeLesson('someip');
            } else {
                setSomeipFeedback('One or more matches are incorrect. Click reset and try again.');
            }
        }
    };

    // INTERACTIVE: MQTT Wildcard Topic Matching Puzzle
    const handleMqttTopicPuzzle = (topic: string, subscription: string, expectedMatch: boolean) => {
        // Let's check matching
        let matches = false;
        if (subscription === 'vehicle/telematics/+') {
            matches = topic.startsWith('vehicle/telematics/') && topic.split('/').length === 3;
        } else if (subscription === 'vehicle/#') {
            matches = topic.startsWith('vehicle/');
        }

        if (matches === expectedMatch) {
            setMqttMatchFeedback(`Correct! "${subscription}" ${expectedMatch ? 'DOES' : 'DOES NOT'} match "${topic}".`);
            completeLesson('mqtt');
        } else {
            setMqttMatchFeedback(`Oops! Try again. Remember: '+' matches exactly one level, while '#' matches recursively.`);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full p-4 md:p-0">
            {/* Sidebar selector */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
                {/* Progress Card */}
                <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-xl p-5 border border-gray-800 text-white shadow-xl">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                            <Award className="text-amber-400" size={18} />
                            Progress Center
                        </h3>
                        <span className="text-xs bg-cyan-900/40 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800/40">
                            {completedLessons.length} / 4 Badges
                        </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-cyan-400 transition-all duration-500" 
                            style={{ width: `${(completedLessons.length / 4) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Lesson Buttons */}
                <div className="flex flex-col gap-2">
                    {LESSONS.map(l => {
                        const active = selectedLesson === l.id;
                        const done = completedLessons.includes(l.id);
                        return (
                            <button
                                key={l.id}
                                onClick={() => setSelectedLesson(l.id)}
                                className={`p-4 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                                    active 
                                        ? 'bg-cyan-500 border-cyan-600 text-white shadow-lg' 
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <div className="space-y-1">
                                    <h4 className="font-bold text-sm flex items-center gap-2">
                                        {l.icon}
                                        {l.title}
                                    </h4>
                                    <p className={`text-xs leading-relaxed ${active ? 'text-cyan-100' : 'text-gray-500'}`}>
                                        {l.description}
                                    </p>
                                </div>
                                {done && (
                                    <CheckCircle2 size={18} className={active ? 'text-white flex-shrink-0' : 'text-emerald-500 flex-shrink-0'} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Lesson Content */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-lg flex flex-col overflow-hidden min-h-[500px]">
                {/* Tabs Selector */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('theory')}
                        className={`flex-1 py-3 text-xs font-bold uppercase transition-colors border-b-2 ${
                            activeTab === 'theory' 
                                ? 'border-cyan-500 text-cyan-600 bg-cyan-50/10' 
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        1. Theoretical Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('interactive')}
                        className={`flex-1 py-3 text-xs font-bold uppercase transition-colors border-b-2 ${
                            activeTab === 'interactive' 
                                ? 'border-cyan-500 text-cyan-600 bg-cyan-50/10' 
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        2. Interactive Challenge
                    </button>
                    <button
                        onClick={() => setActiveTab('quiz')}
                        className={`flex-1 py-3 text-xs font-bold uppercase transition-colors border-b-2 ${
                            activeTab === 'quiz' 
                                ? 'border-cyan-500 text-cyan-600 bg-cyan-50/10' 
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        3. Review Quiz
                    </button>
                </div>

                {/* Tab content area */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* LESSON 1: CAN BUS */}
                    {selectedLesson === 'can' && (
                        <>
                            {activeTab === 'theory' && (
                                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                                    <h3 className="text-xl font-bold text-gray-900">Controller Area Network (CAN) Fundamentals</h3>
                                    <p>
                                        Developed by Bosch in 1983, the **CAN Bus** is a robust vehicle bus standard designed to allow microcontrollers and devices to communicate with each other's applications without a host computer.
                                    </p>
                                    <h4 className="font-bold text-gray-900 mt-4">Key Characteristics:</h4>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><b>Differential Signaling:</b> CAN uses two wires, CAN High (CAN_H) and CAN Low (CAN_L), to suppress common-mode noise.</li>
                                        <li><b>Dominant vs Recessive:</b> A dominant bit represents logical 0 (actively driven voltages). A recessive bit represents logical 1 (floating idle voltage). If one node sends a 0 and another sends a 1, the bus voltage results in 0.</li>
                                        <li><b>Bit Stuffing:</b> After 5 consecutive identical bits, the transmitter automatically inserts a stuffed bit of the opposite polarity to guarantee voltage edge transitions for receiver clock syncing.</li>
                                    </ul>
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs text-gray-600">
                                        <b>Typical CAN Frame:</b><br />
                                        SOF (1 bit) | Arbitration ID (11 bits) | RTR (1 bit) | Control/DLC (6 bits) | Data (0-8 Bytes) | CRC (16 bits) | ACK (2 bits) | EOF (7 bits)
                                    </div>
                                </div>
                            )}

                            {activeTab === 'interactive' && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-gray-900">CAN Arbitration Simulation Challenge</h3>
                                        <p className="text-xs text-gray-500">
                                            In CAN, the message ID determines its priority. When two nodes transmit at once, they arbitrate bit-by-bit. The node with the lower numerical ID has the higher priority. Let's watch Node A (0x3E3) and Node B (0x3D3) send their IDs onto the bus simultaneously.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                            <h4 className="font-bold text-gray-800 text-xs uppercase mb-2">Node A (ID: 0x3E3)</h4>
                                            <div className="font-mono text-sm tracking-wider flex gap-1">
                                                {'01111100011'.split('').map((bit, idx) => (
                                                    <span 
                                                        key={idx} 
                                                        className={`px-1.5 py-0.5 rounded ${
                                                            arbStep > idx ? 'bg-rose-100 text-rose-800' : 'bg-gray-200 text-gray-500'
                                                        }`}
                                                    >
                                                        {bit}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                            <h4 className="font-bold text-gray-800 text-xs uppercase mb-2">Node B (ID: 0x3D3)</h4>
                                            <div className="font-mono text-sm tracking-wider flex gap-1">
                                                {'01111010011'.split('').map((bit, idx) => (
                                                    <span 
                                                        key={idx} 
                                                        className={`px-1.5 py-0.5 rounded ${
                                                            arbStep > idx ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-500'
                                                        }`}
                                                    >
                                                        {bit}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={runArbitration}
                                            disabled={isArbitrating}
                                            className="px-4 py-2 bg-gray-900 text-white rounded font-bold text-xs hover:bg-gray-800 flex items-center gap-1.5"
                                        >
                                            <Play size={12} />
                                            Start Arbitration
                                        </button>
                                    </div>

                                    <div className="bg-gray-950 text-emerald-400 font-mono text-xs p-4 rounded-lg h-[180px] overflow-y-auto space-y-1">
                                        {arbLog.map((log, idx) => (
                                            <div key={idx}>{log}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* LESSON 2: UDS DIAGNOSTICS */}
                    {selectedLesson === 'uds' && (
                        <>
                            {activeTab === 'theory' && (
                                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                                    <h3 className="text-xl font-bold text-gray-900">Unified Diagnostic Services (UDS - ISO 14229)</h3>
                                    <p>
                                        UDS is the diagnostic protocol used by almost all automotive manufacturers. It runs on top of CAN, Ethernet, or other physical buses.
                                    </p>
                                    <h4 className="font-bold text-gray-900 mt-4">Essential Services & Session Layers:</h4>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><b>Diagnostic Session Control (0x10):</b> Toggles between Default Session, Programming Session, and Extended Session.</li>
                                        <li><b>Security Access (0x27):</b> Many operations require authorization. The scan tool sends a request for a "Seed", calculates a cryptographic "Key" using a shared algorithm, and writes it back to unlock the ECU.</li>
                                        <li><b>Data by Identifier (0x22):</b> Reads sensors, serial numbers, VIN, and parameters indexed by 16-bit DIDs.</li>
                                    </ul>
                                </div>
                            )}

                            {activeTab === 'interactive' && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-gray-900">Challenge: Seed-Key Security Handshake</h3>
                                        <p className="text-xs text-gray-500">
                                            Simulate an ECU programming unlock. Request a seed from the ECU, calculate the correct key according to the algorithm rule, send it, and unlock the programming mode.
                                        </p>
                                    </div>

                                    <div className="p-5 border border-gray-200 rounded-xl bg-gray-50 space-y-4">
                                        <div className="flex gap-4">
                                            <button
                                                onClick={handleRequestSeed}
                                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-xs"
                                            >
                                                Request Seed (Service 0x27, Sub 0x01)
                                            </button>
                                        </div>

                                        {udsSeed !== null && (
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    value={udsKeyInput}
                                                    onChange={e => setUdsKeyInput(e.target.value)}
                                                    placeholder="Enter Key in Hex (e.g. A2B4)"
                                                    className="border border-gray-300 rounded p-2 text-xs font-mono w-48"
                                                />
                                                <button
                                                    onClick={handleVerifyKey}
                                                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded font-bold text-xs"
                                                >
                                                    Send Key (Sub 0x02)
                                                </button>
                                            </div>
                                        )}

                                        {udsFeedback && (
                                            <div className={`p-3 rounded text-xs font-mono ${
                                                udsUnlocked ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                                            }`}>
                                                {udsFeedback}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* LESSON 3: SOME/IP */}
                    {selectedLesson === 'someip' && (
                        <>
                            {activeTab === 'theory' && (
                                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                                    <h3 className="text-xl font-bold text-gray-900">SOME/IP & Service-Oriented Architecture (SOA)</h3>
                                    <p>
                                        Traditional vehicle buses rely on **signal-based** broadcasts. Every ECU continuously pushes physical signals onto the bus, even if no other module is reading them.
                                    </p>
                                    <p>
                                        Modern software-defined vehicles (SDVs) use high-speed **Ethernet** networks running **Service-Oriented Middlewares** like **SOME/IP** (Scalable service-Oriented MiddlewarE over IP).
                                    </p>
                                    <h4 className="font-bold text-gray-900 mt-4">Core Concepts:</h4>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><b>Service Instances:</b> Servers register and advertise their services dynamically. Clients discover them and only consume data when requested.</li>
                                        <li><b>RPC Method Calls:</b> Request/Response transactions resembling standard software APIs (like calling `getOdometer()`).</li>
                                        <li><b>Publish/Subscribe Events:</b> Clients subscribe to eventgroups, and the server notifies them only when values change (reducing network load).</li>
                                    </ul>
                                </div>
                            )}

                            {activeTab === 'interactive' && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-gray-900">SOME/IP Header Definition Matcher</h3>
                                        <p className="text-xs text-gray-500">
                                            Match the SOME/IP message frame header term on the left with its corresponding description on the right.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-xs uppercase text-gray-400">Header Term</h4>
                                            {['Service ID', 'Method ID', 'Message Type', 'Return Code'].map(term => (
                                                <div key={term} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                                                    <span className="font-bold text-xs font-mono text-gray-800">{term}</span>
                                                    <select
                                                        onChange={e => handleMatchOption(term, e.target.value)}
                                                        className="text-[11px] border border-gray-300 rounded p-1 max-w-[200px]"
                                                        value={someipMatches[term] || ''}
                                                    >
                                                        <option value="">-- Choose definition --</option>
                                                        <option value="Identifies the application service interface (e.g. HVAC, Infotainment)">Identifies the service interface</option>
                                                        <option value="Identifies the specific function or RPC API to invoke">Identifies the function API</option>
                                                        <option value="Distinguishes between Requests, Responses, and Notifications">Distinguishes message types</option>
                                                        <option value="Reports success or error codes back to the client">Reports success or error codes</option>
                                                    </select>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-col justify-between">
                                            <div>
                                                <h4 className="font-bold text-xs uppercase text-gray-400 mb-2">Instructions</h4>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    SOME/IP headers are fixed at 16 bytes. Match all four items correctly to test your understanding of serialization headers.
                                                </p>
                                            </div>
                                            
                                            {someipFeedback && (
                                                <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded font-mono text-xs">
                                                    {someipFeedback}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* LESSON 4: MQTT */}
                    {selectedLesson === 'mqtt' && (
                        <>
                            {activeTab === 'theory' && (
                                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                                    <h3 className="text-xl font-bold text-gray-900">MQTT in Connected Vehicles</h3>
                                    <p>
                                        **MQTT** (Message Queuing Telemetry Transport) is a lightweight publish-subscribe network protocol used in telematics, IoT, and V2G (Vehicle-to-Grid) interactions.
                                    </p>
                                    <h4 className="font-bold text-gray-900 mt-4">Publish/Subscribe Topologies:</h4>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><b>Topic Hierarchies:</b> Messages are published to paths (e.g. `vehicle/VIN1234/gps`).</li>
                                        <li><b>Wildcard Subscriptions:</b> Subscribers can listen to topics using wildcards:
                                            <ul className="list-circle pl-5 mt-1 space-y-1">
                                                <li><b>Single-level (+):</b> Matches one level. e.g. `vehicle/+/speed` matches `vehicle/ECU1/speed`.</li>
                                                <li><b>Multi-level (#):</b> Matches recursively. e.g. `vehicle/#` matches `vehicle/ECU1/speed`, `vehicle/cabin/temp`, etc.</li>
                                            </ul>
                                        </li>
                                        <li><b>QoS Levels:</b> QoS 0 (at most once), QoS 1 (at least once), and QoS 2 (exactly once).</li>
                                    </ul>
                                </div>
                            )}

                            {activeTab === 'interactive' && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-gray-900">Wildcard Topic Matcher Challenge</h3>
                                        <p className="text-xs text-gray-500">
                                            Test your understanding of MQTT topic wildcards. Select whether the published topic matches the subscription configuration.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                                                <div className="text-xs text-gray-500 font-bold uppercase">Scenario A</div>
                                                <div className="font-mono text-xs">
                                                    Subscription: <b>vehicle/telematics/+</b><br />
                                                    Published Topic: <b>vehicle/telematics/speed/raw</b>
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    <button 
                                                        onClick={() => handleMqttTopicPuzzle('vehicle/telematics/speed/raw', 'vehicle/telematics/+', false)}
                                                        className="px-3 py-1.5 bg-gray-900 text-white rounded text-xs hover:bg-gray-800"
                                                    >
                                                        Does Not Match
                                                    </button>
                                                    <button 
                                                        onClick={() => handleMqttTopicPuzzle('vehicle/telematics/speed/raw', 'vehicle/telematics/+', true)}
                                                        className="px-3 py-1.5 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-500"
                                                    >
                                                        Matches
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                                                <div className="text-xs text-gray-500 font-bold uppercase">Scenario B</div>
                                                <div className="font-mono text-xs">
                                                    Subscription: <b>vehicle/#</b><br />
                                                    Published Topic: <b>vehicle/cabin/hvac/temp</b>
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    <button 
                                                        onClick={() => handleMqttTopicPuzzle('vehicle/cabin/hvac/temp', 'vehicle/#', false)}
                                                        className="px-3 py-1.5 bg-gray-900 text-white rounded text-xs hover:bg-gray-800"
                                                    >
                                                        Does Not Match
                                                    </button>
                                                    <button 
                                                        onClick={() => handleMqttTopicPuzzle('vehicle/cabin/hvac/temp', 'vehicle/#', true)}
                                                        className="px-3 py-1.5 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-500"
                                                    >
                                                        Matches
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center min-h-[150px]">
                                            {mqttMatchFeedback ? (
                                                <div className="text-center font-mono text-xs p-3 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded">
                                                    {mqttMatchFeedback}
                                                </div>
                                            ) : (
                                                <div className="text-gray-400 italic text-xs">Select match conditions to verify.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* QUIZ PANEL (SHARED BY ALL LESSONS) */}
                    {activeTab === 'quiz' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <HelpCircle size={20} className="text-cyan-500" />
                                Review Quiz: {LESSONS.find(l => l.id === selectedLesson)?.title}
                            </h3>

                            <div className="space-y-6">
                                {quizData[selectedLesson].map((q, qIdx) => {
                                    const selectedOpt = quizAnswers[qIdx];
                                    return (
                                        <div key={qIdx} className="space-y-2 border-b border-gray-100 pb-4">
                                            <h4 className="font-bold text-sm text-gray-800">
                                                {qIdx + 1}. {q.q}
                                            </h4>
                                            <div className="grid grid-cols-1 gap-2 pl-2">
                                                {q.options.map((opt, optIdx) => {
                                                    const isChecked = selectedOpt === optIdx;
                                                    return (
                                                        <label 
                                                            key={optIdx} 
                                                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer select-none text-xs transition-colors ${
                                                                isChecked 
                                                                    ? 'bg-cyan-50 border-cyan-300 text-cyan-900 font-semibold' 
                                                                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`q-${qIdx}`}
                                                                checked={isChecked}
                                                                onChange={() => handleQuizAnswer(qIdx, optIdx)}
                                                                disabled={quizSubmitted}
                                                                className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500 border-gray-300"
                                                            />
                                                            {opt}
                                                        </label>
                                                    );
                                                })}
                                            </div>

                                            {/* Explanation feedback */}
                                            {quizSubmitted && (
                                                <div className={`mt-2 p-2.5 rounded text-[11px] font-mono leading-relaxed ${
                                                    selectedOpt === q.correct 
                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                                        : 'bg-red-50 text-red-800 border border-red-200'
                                                }`}>
                                                    <b>{selectedOpt === q.correct ? '✓ Correct:' : '✗ Incorrect:'}</b> {q.explanation}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex gap-4 items-center">
                                {!quizSubmitted ? (
                                    <button
                                        onClick={handleQuizSubmit}
                                        disabled={Object.keys(quizAnswers).length < quizData[selectedLesson].length}
                                        className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white disabled:bg-gray-300 disabled:cursor-not-allowed rounded font-bold text-xs uppercase"
                                    >
                                        Submit Answers
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-4 w-full justify-between">
                                        <div className="text-sm">
                                            {quizPassed ? (
                                                <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                                                    <CheckCircle2 size={16} />
                                                    Congratulations! Lesson complete. Badge awarded!
                                                </span>
                                            ) : (
                                                <span className="text-red-500 font-bold">
                                                    Some answers were incorrect. Review explanations and try again.
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setQuizSubmitted(false);
                                                setQuizAnswers({});
                                            }}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded font-bold text-xs uppercase hover:bg-gray-50 flex items-center gap-1.5"
                                        >
                                            <RefreshCw size={12} />
                                            Try Again
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
