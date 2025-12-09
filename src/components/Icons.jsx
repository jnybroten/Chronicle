import questChestImg from '../assets/quest_chest_v2.png';
import {
    LayoutDashboard, CreditCard, Wallet, ArrowRightLeft, Sparkles, Repeat, Calendar, Settings,
    TrendingUp, TrendingDown, Search, Plus, X, Menu, ChevronRight, ChevronLeft, ChevronDown,
    Upload, BarChart3, Target, Edit2, Trash2, Save, Check, FileText, Tag, Filter, XCircle,
    Download, Database, Image as ImageIcon, Sun, Moon, Code, MessageSquare, User, LogOut, Mic, ArrowRight, Scroll, ArrowUpDown, AlertTriangle, RefreshCw
} from 'lucide-react';

export {
    LayoutDashboard, CreditCard, Wallet, ArrowRightLeft, Sparkles, Repeat, Calendar, Settings,
    TrendingUp, TrendingDown, Search, Plus, X, Menu, ChevronRight, ChevronLeft, ChevronDown,
    Upload, BarChart3, Target, Edit2, Trash2, Save, Check, FileText, Tag, Filter, XCircle,
    Download, Database, ImageIcon, Sun, Moon, Code, MessageSquare, User, LogOut, Mic, ArrowRight, Scroll, Scroll as ScrollText, ArrowUpDown, AlertTriangle, RefreshCw
};

export const ChevronRightIcon = ChevronRight;

export const Bank = ({ size = 24, className, style, onClick }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className} onClick={onClick}>
        <path d="M2 9.5L12 3L22 9.5H2Z" strokeLinejoin="round" />
        <rect x="2" y="19" width="20" height="2" />
        <rect x="4" y="17" width="16" height="2" />
        <path d="M6 10v7" strokeWidth="2.5" />
        <path d="M10 10v7" strokeWidth="2.5" />
        <path d="M14 10v7" strokeWidth="2.5" />
        <path d="M18 10v7" strokeWidth="2.5" />
        <circle cx="12" cy="6.5" r="1.5" strokeWidth="1" />
        <path d="M12 6v1" strokeWidth="1" />
    </svg>
);

export const LongFeather = ({ size = 24, className, onClick }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} onClick={onClick}>
        <path d="M22 2 L12 14" />
        <path d="M12 14 L9 11 C7 9, 3 10, 2 13 C 2 17, 5 20, 9 22 C 12 21, 14 18, 16 16" />
        <path d="M2 22 L 3.5 20.5" strokeWidth="1.5" />
    </svg>
);


export const ChestIcon = ({ size = 40, isGlowing = false, className, onClick }) => (
    <img
        src={questChestImg}
        alt="Quest Chest"
        width={size}
        height={size}
        className={`transition-all duration-500 object-contain ${isGlowing ? 'drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]' : ''} ${className || ''}`}
        onClick={onClick}
    />
);
