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
      }

      // Add to log (keep last 50 messages)
      setMessages((prev) => [...prev.slice(-49), msg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleControl = (action: 'accelerate' | 'brake', pressed: boolean) => {
    if (socket) {
      socket.emit('control', { action, pressed });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-cyan-500 selection:text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-lg shadow-lg shadow-cyan-500/20">
              <Car size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                AutoLearn Studio
              </h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Interactive Protocol Simulator</p>
            </div>
          </div>
          <div className="flex gap-4 text-sm font-medium text-gray-400">
            <span
              onClick={() => setActiveView('simulator')}
              className={`cursor-pointer transition-colors ${activeView === 'simulator' ? 'text-cyan-400' : 'hover:text-white'}`}
            >
              Simulator
            </span>
            <span
              onClick={() => setActiveView('diagnostics')}
              className={`cursor-pointer transition-colors ${activeView === 'diagnostics' ? 'text-cyan-400' : 'hover:text-white'}`}
            >
              Diagnostics
            </span>
            <span
              onClick={() => setActiveView('architecture')}
              className={`cursor-pointer transition-colors ${activeView === 'architecture' ? 'text-cyan-400' : 'hover:text-white'}`}
            >
              Architecture
            </span>
            <span
              onClick={() => setActiveView('tutorials')}
              className={`cursor-pointer transition-colors ${activeView === 'tutorials' ? 'text-cyan-400' : 'hover:text-white'}`}
            >
              Tutorials
            </span>
            <span
              onClick={() => setActiveView('community')}
              className={`cursor-pointer transition-colors ${activeView === 'community' ? 'text-cyan-400' : 'hover:text-white'}`}
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
              <Dashboard speed={speed} rpm={rpm} />
              <Controls onControl={handleControl} />

              {/* Info Card */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">How it works</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Press and hold <span className="text-emerald-400 font-bold">Accelerate</span> to increase engine RPM and vehicle speed.
                  The backend simulates the vehicle physics and broadcasts <span className="text-yellow-400 font-mono">CAN Frames</span> via WebSocket.
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
