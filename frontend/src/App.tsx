import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Dashboard } from './components/Dashboard';
import { Controls } from './components/Controls';
import { UDSTester } from './components/UDSTester';
import { ArchitectureExplorer } from './components/ArchitectureExplorer';
import { Tutorials } from './components/Tutorials';
import { Community } from './components/Community';
import { CANLog } from './components/CANLog';
import { LoadingOverlay } from './components/LoadingOverlay';
import type { CANMessage } from './types';
import { Car, Users } from 'lucide-react';

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
  const [activeUsers, setActiveUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Start 30-second loading timer
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 30000);

    // Progress animation (increment every second)
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) return 100;
        return prev + (100 / 30); // Increment over 30 seconds
      });
    }, 1000);

    newSocket.on('connect', () => {
      console.log('Connected to CAN Simulator Server');
      // Clear loading after successful connection
      clearTimeout(loadingTimer);
      clearInterval(progressInterval);
      setIsLoading(false);
    });

    newSocket.on('user-count', (count: number) => {
      setActiveUsers(count);
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
      clearTimeout(loadingTimer);
      clearInterval(progressInterval);
      newSocket.disconnect();
    };
  }, []);


  const handleControl = (action: string, pressed?: boolean, value?: any) => {
    if (socket) {
      socket.emit('control', { action, pressed, value });
    }
  };

  return (
    <>
      {/* Loading Overlay */}
      {isLoading && <LoadingOverlay progress={loadingProgress} />}

      <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-cyan-500 selection:text-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-3 md:p-4 sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-1.5 md:p-2 rounded-lg shadow-lg shadow-cyan-500/20">
                <Car size={20} className="text-white md:w-6 md:h-6" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-bold text-gray-900">
                  AutoLearn Studio
                </h1>
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest hidden sm:block">Interactive Protocol Simulator</p>
              </div>
            </div>
            <div className="flex gap-2 md:gap-4 text-xs md:text-sm font-medium text-gray-400 overflow-x-auto scrollbar-hide flex-nowrap">
              <span
                onClick={() => setActiveView('simulator')}
                className={`px-3 md:px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${activeView === 'simulator'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                Simulator
              </span>
              <span
                onClick={() => setActiveView('diagnostics')}
                className={`px-3 md:px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${activeView === 'diagnostics'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                Diagnostics
              </span>
              <span
                onClick={() => setActiveView('architecture')}
                className={`px-3 md:px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${activeView === 'architecture'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                Architecture
              </span>
              <span
                onClick={() => setActiveView('tutorials')}
                className={`px-3 md:px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${activeView === 'tutorials'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                Tutorials
              </span>
              <span
                onClick={() => setActiveView('community')}
                className={`px-3 md:px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${activeView === 'community'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                <span>Community</span>
              </span>

              {/* Active Users Counter (show only if >= 5 and on larger screens) */}
              {activeUsers >= 5 && (
                <div className="hidden lg:flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full ml-4 flex-shrink-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <Users size={14} className="text-green-600" />
                  <span className="text-green-700 font-semibold text-sm">
                    {activeUsers} online
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto p-3 md:p-6 h-[calc(100vh-60px)] md:h-[calc(100vh-80px)]">

          {activeView === 'simulator' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6 h-full">
              {/* Left Column: Dashboard & Controls */}
              <div className="lg:col-span-2 flex flex-col gap-3 md:gap-6">
                <Dashboard speed={speed} rpm={rpm} gear={gear} headlights={headlights} turnSignals={turnSignals} />
                <Controls onControl={handleControl} currentGear={gear} currentHeadlights={headlights} currentTurnSignals={turnSignals} />

                {/* Info Card */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4 md:p-6 shadow-sm">
                  <h3 className="text-blue-900 text-xs md:text-sm font-bold uppercase tracking-wider mb-2 md:mb-3">How it works</h3>
                  <p className="text-gray-700 text-xs md:text-sm leading-relaxed">
                    Press and hold <span className="text-emerald-600 font-bold">Accelerate</span> to increase engine RPM and vehicle speed.
                    The backend simulates the vehicle physics and broadcasts <span className="text-blue-600 font-mono font-semibold">CAN Frames</span> via WebSocket.
                    Watch the traffic log to see the raw data changing in real-time.
                  </p>
                </div>
              </div>

              {/* Right Column: CAN Log */}
              <div className="lg:col-span-1 h-full min-h-[300px] md:min-h-[400px]">
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
    </>
  );
}

export default App;
