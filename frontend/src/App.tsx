import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Dashboard } from './components/Dashboard';
import { Controls } from './components/Controls';
import { UDSTester } from './components/UDSTester';
import { ArchitectureExplorer } from './components/ArchitectureExplorer';
import { Tutorials } from './components/Tutorials';
import { Community } from './components/Community';
import { CANLog } from './components/CANLog';
import type { CANMessage } from './types';
import { Car } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeView, setActiveView] = useState<'simulator' | 'diagnostics' | 'architecture' | 'tutorials' | 'community'>('simulator');
  const [speed, setSpeed] = useState(0);
  const [rpm, setRpm] = useState(0);
  const [gear, setGear] = useState('P');
  const [headlights, setHeadlights] = useState('off');
  const [turnSignals, setTurnSignals] = useState('off');
  const [messages, setMessages] = useState<CANMessage[]>([]);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to CAN Simulator Server');
    });

    newSocket.on('can-message', (msg: CANMessage) => {
      // Update state based on message ID
      if (msg.id === 0x123) {
        setSpeed(msg.data.speed);
      } else if (msg.id === 0x456) {
        setRpm(msg.data.rpm);
      } else if (msg.id === 0xABC && msg.data.gear) {
        setGear(String(msg.data.gear));
      } else if (msg.id === 0xDEF && msg.data.headlights) {
        setHeadlights(String(msg.data.headlights));
      } else if (msg.id === 0x321 && msg.data.signals) {
        setTurnSignals(String(msg.data.signals));
      }

      // Add to log (keep last 50 messages)
      setMessages((prev) => [...prev.slice(-49), msg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);


  const handleControl = (action: string, pressed?: boolean, value?: any) => {
    if (socket) {
      socket.emit('control', { action, pressed, value });
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-lg shadow-lg shadow-cyan-500/20">
              <Car size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                AutoLearn Studio
              </h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Interactive Protocol Simulator</p>
            </div>
          </div>
          <div className="flex gap-4 text-sm font-medium text-gray-400">
            <span
              onClick={() => setActiveView('simulator')}
              className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${activeView === 'simulator'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              Simulator
            </span>
            <span
              onClick={() => setActiveView('diagnostics')}
              className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${activeView === 'diagnostics'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              Diagnostics
            </span>
            <span
              onClick={() => setActiveView('architecture')}
              className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${activeView === 'architecture'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              Architecture
            </span>
            <span
              onClick={() => setActiveView('tutorials')}
              className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${activeView === 'tutorials'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              Tutorials
            </span>
            <span
              onClick={() => setActiveView('community')}
              className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${activeView === 'community'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              Community
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6 h-[calc(100vh-80px)]">

        {activeView === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left Column: Dashboard & Controls */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Dashboard speed={speed} rpm={rpm} gear={gear} headlights={headlights} turnSignals={turnSignals} />
              <Controls onControl={handleControl} currentGear={gear} currentHeadlights={headlights} currentTurnSignals={turnSignals} />

              {/* Info Card */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-blue-900 text-sm font-bold uppercase tracking-wider mb-3">How it works</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Press and hold <span className="text-emerald-600 font-bold">Accelerate</span> to increase engine RPM and vehicle speed.
                  The backend simulates the vehicle physics and broadcasts <span className="text-blue-600 font-mono font-semibold">CAN Frames</span> via WebSocket.
                  Watch the traffic log to see the raw data changing in real-time.
                </p>
              </div>
            </div>

            {/* Right Column: CAN Log */}
            <div className="lg:col-span-1 h-full min-h-[400px]">
              <CANLog messages={messages} />
            </div>
          </div>
        )}

        {activeView === 'diagnostics' && <UDSTester socket={socket} />}
        {activeView === 'architecture' && <ArchitectureExplorer />}
        {activeView === 'tutorials' && <Tutorials />}
        {activeView === 'community' && <Community />}

      </main>
    </div>
  );
}

export default App;
