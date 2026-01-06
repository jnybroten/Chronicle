import { X, ChevronLeft, ChevronRightIcon } from './Icons';

const DEFAULT_THEME = {
    name: 'light', primary: '#3d5a4a', secondary: '#8b5e3c', bg: '#f4ecd8', cardBg: '#fdfbf2',
    text: '#4a3a2a', textMuted: '#8c7b65', borderColor: '#dcd2b5', income: '#3d5a4a', expense: '#a05555'
};

export const Card = ({ children, className = "", title, action, theme = DEFAULT_THEME }) => (
    <div className={`rounded-lg border-2 transition-all ${className}`} style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor, color: theme.text, boxShadow: `4px 4px 0px ${theme.borderColor}` }}>
        {(title || action) && <div className="px-6 py-4 border-b-2 flex justify-between items-center" style={{ borderColor: theme.borderColor }}><div>{title && <h3 className="font-bold text-lg font-cinzel">{title}</h3>}</div>{action}</div>}
        <div className="p-6">{children}</div>
    </div>
);

export const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed, theme = DEFAULT_THEME }) => (
    <button onClick={onClick} className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-3 rounded-lg transition-all shrink-0 group ${active ? 'font-bold shadow-sm' : 'hover:bg-opacity-10'}`} style={{ backgroundColor: active ? theme.primary : 'transparent', color: active ? (theme.name === 'dark' ? '#1a1d1a' : '#fdfbf2') : theme.textMuted, boxShadow: active ? `2px 2px 0px ${theme.text}` : 'none' }} title={collapsed ? label : ''}>
        <Icon size={24} style={{ minWidth: '24px' }} className="shrink-0" />{!collapsed && <span className="font-cinzel">{label}</span>}
    </button>
);

export const KPICard = ({ label, value, subtext, trend, theme = DEFAULT_THEME }) => (
    <div className="p-5 flex flex-col justify-between h-full rounded-lg border-2" style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor, boxShadow: `4px 4px 0px ${theme.borderColor}` }}>
        <div className="text-sm font-bold uppercase tracking-wider mb-1 font-cinzel" style={{ color: theme.textMuted }}>{label}</div>
        <div className="text-3xl font-bold mb-1" style={{ color: theme.text }}>{value}</div>
        {subtext && <div className={`text-sm font-medium ${trend === 'positive' ? 'text-[#10b981]' : trend === 'negative' ? 'text-[#ef4444]' : ''}`} style={{ color: trend === 'neutral' ? theme.textMuted : undefined }}>{subtext}</div>}
    </div>
);

export const ProgressBar = ({ current, max, color, theme = DEFAULT_THEME }) => (
    <div className="h-4 w-full rounded-full overflow-hidden border shadow-inner" style={{ backgroundColor: theme.borderColor, borderColor: theme.secondary }}>
        <div className={`h-full transition-all duration-700 ease-out relative ${current > max ? 'bg-rose-500' : ''}`} style={{ width: `${Math.min((current / max) * 100, 100)}%`, backgroundColor: current > max ? undefined : color }}>
            <div className="absolute inset-0 bg-white/20"></div>
        </div>
    </div>
);

export const Modal = ({ title, onClose, children, theme = DEFAULT_THEME }) => (
    <div className="fixed inset-0 flex items-center justify-center z-[100] px-4 backdrop-blur-sm animate-in fade-in duration-200" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="w-full max-w-lg rounded-lg flex flex-col max-h-[90vh] border-4 shadow-2xl" style={{ borderColor: theme.secondary, backgroundColor: theme.cardBg }}>
            <div className="px-6 py-4 border-b-2 flex justify-between items-center" style={{ borderColor: theme.borderColor, backgroundColor: theme.bg }}>
                <h3 className="font-bold text-xl" style={{ color: theme.text }}>{title}</h3>
                <button onClick={onClose} className="p-2 hover:bg-opacity-10 rounded-full" style={{ color: theme.textMuted }}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto" style={{ color: theme.text }}>{children}</div>
        </div>
    </div>
);

export const MonthSelector = ({ currentMonth, onChange, theme = DEFAULT_THEME, abbreviated = false }) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const dateObj = new Date(year, month - 1, 1);

    const handlePrev = () => {
        let newM = month - 1;
        let newY = year;
        if (newM < 1) { newM = 12; newY -= 1; }
        onChange(`${newY}-${String(newM).padStart(2, '0')}`);
    };

    const handleNext = () => {
        let newM = month + 1;
        let newY = year;
        if (newM > 12) { newM = 1; newY += 1; }
        onChange(`${newY}-${String(newM).padStart(2, '0')}`);
    };

    return (
        <div className="flex items-center rounded-lg border-2" style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor, boxShadow: `2px 2px 0px ${theme.borderColor}` }}>
            <button onClick={handlePrev} className="p-2 sm:p-3 hover:bg-black/5 rounded-l-lg" style={{ color: theme.textMuted }}><ChevronLeft size={abbreviated ? 16 : 20} /></button>
            <div className={`${abbreviated ? 'w-24 text-sm' : 'w-48 text-lg'} font-bold text-center font-cinzel transition-all`} style={{ color: theme.text }}>
                {dateObj.toLocaleDateString('en-US', { month: abbreviated ? 'short' : 'long', year: 'numeric' })}
            </div>
            <button onClick={handleNext} className="p-2 sm:p-3 hover:bg-black/5 rounded-r-lg" style={{ color: theme.textMuted }}><ChevronRightIcon size={abbreviated ? 16 : 20} /></button>
        </div>
    );
};
