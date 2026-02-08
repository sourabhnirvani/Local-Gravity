import { Files, Search, GitBranch, Sparkles, Settings, User } from 'lucide-react';
import { ViewType } from '../App';

interface ActivityBarProps {
    activeView: ViewType;
    onViewChange: (view: ViewType) => void;
}

function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
    const topIcons = [
        { id: 'explorer' as const, icon: Files, label: 'Explorer' },
        { id: 'search' as const, icon: Search, label: 'Search' },
        { id: 'git' as const, icon: GitBranch, label: 'Source Control' },
        { id: 'ai' as const, icon: Sparkles, label: 'AI Assistant' },
    ];

    return (
        <div className="w-12 bg-[#333333] flex flex-col items-center py-1">
            {/* Top Icons */}
            <div className="flex flex-col">
                {topIcons.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={`activity-icon ${activeView === item.id ? 'active' : ''}`}
                        title={item.label}
                    >
                        <item.icon size={24} strokeWidth={1.5} />
                    </div>
                ))}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom Icons */}
            <div className="flex flex-col">
                <div className="activity-icon" title="Account">
                    <User size={24} strokeWidth={1.5} />
                </div>
                <div className="activity-icon" title="Settings">
                    <Settings size={24} strokeWidth={1.5} />
                </div>
            </div>
        </div>
    );
}

export default ActivityBar;
