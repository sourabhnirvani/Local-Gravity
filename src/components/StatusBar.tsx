import { useState, useEffect } from 'react';
import { GitBranch, Bell, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { checkOllamaStatus } from '../services/ollama';
import { OpenFile } from '../types';
import { AppSettings } from '../services/settingsService';

interface StatusBarProps {
    activeFile?: OpenFile;
    settings?: AppSettings;
}

function StatusBar({ activeFile, settings }: StatusBarProps) {
    const [isOllamaConnected, setIsOllamaConnected] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            const connected = await checkOllamaStatus();
            setIsOllamaConnected(connected);
            setIsChecking(false);
        };
        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-6 bg-[#007acc] flex items-center justify-between text-white text-xs select-none">
            {/* Left */}
            <div className="flex items-center h-full">
                <div className="status-item">
                    <GitBranch size={13} className="mr-1" />
                    <span>main</span>
                </div>
                <div className="status-item">
                    <CheckCircle size={13} className="mr-1" />
                    <span>0</span>
                    <AlertCircle size={13} className="ml-2 mr-1" />
                    <span>0</span>
                </div>
            </div>

            {/* Right */}
            <div className="flex items-center h-full">
                {activeFile && (
                    <>
                        <div className="status-item">{activeFile.language}</div>
                        <div className="status-item">UTF-8</div>
                        <div className="status-item">LF</div>
                        {settings && (
                            <div className="status-item">Spaces: {settings.tabSize}</div>
                        )}
                    </>
                )}
                <div className="status-item">
                    {isChecking ? (
                        <>
                            <Wifi size={13} className="mr-1 text-yellow-200 animate-pulse" />
                            <span>Connecting...</span>
                        </>
                    ) : isOllamaConnected ? (
                        <>
                            <Wifi size={13} className="mr-1 text-green-200" />
                            <span>Ollama Connected</span>
                        </>
                    ) : (
                        <>
                            <WifiOff size={13} className="mr-1 text-red-200" />
                            <span>Ollama Offline</span>
                        </>
                    )}
                </div>
                <div className="status-item">
                    <Bell size={13} />
                </div>
            </div>
        </div>
    );
}

export default StatusBar;
