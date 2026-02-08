import { useState, useEffect } from 'react';
import { GitBranch, Bell, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { checkOllamaStatus } from '../services/ollama';

function StatusBar() {
    const [isOllamaConnected, setIsOllamaConnected] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Check status immediately
        checkStatus();

        // Poll every 5 seconds
        const interval = setInterval(checkStatus, 5000);

        return () => clearInterval(interval);
    }, []);

    const checkStatus = async () => {
        const connected = await checkOllamaStatus();
        setIsOllamaConnected(connected);
        setIsChecking(false);
    };

    return (
        <div className="h-6 bg-[#007acc] flex items-center justify-between text-white text-xs">
            {/* Left Side */}
            <div className="flex items-center h-full">
                <div className="status-item">
                    <GitBranch size={14} className="mr-1" />
                    <span>main</span>
                </div>
                <div className="status-item">
                    <CheckCircle size={14} className="mr-1" />
                    <span>0</span>
                    <AlertCircle size={14} className="ml-2 mr-1" />
                    <span>0</span>
                </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center h-full">
                <div className="status-item">
                    {isChecking ? (
                        <>
                            <Wifi size={14} className="mr-1 text-yellow-300 animate-pulse" />
                            <span>Connecting...</span>
                        </>
                    ) : isOllamaConnected ? (
                        <>
                            <Wifi size={14} className="mr-1 text-green-300" />
                            <span>Ollama Connected</span>
                        </>
                    ) : (
                        <>
                            <WifiOff size={14} className="mr-1 text-red-300" />
                            <span>Ollama Not Running</span>
                        </>
                    )}
                </div>
                <div className="status-item">
                    <span>Gemma3 4B</span>
                </div>
                <div className="status-item">
                    <span>TypeScript</span>
                </div>
                <div className="status-item">
                    <span>UTF-8</span>
                </div>
                <div className="status-item">
                    <span>LF</span>
                </div>
                <div className="status-item">
                    <Bell size={14} />
                </div>
            </div>
        </div>
    );
}

export default StatusBar;
