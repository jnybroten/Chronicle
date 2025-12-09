import React, { useState, useMemo } from 'react';
import { Card } from '../components/UIComponents';
import { User, ScrollText, Search, Filter, ArrowUpDown, Edit2, ArrowRightLeft } from '../components/Icons';
import { formatCurrency } from '../utils/helpers';

const ReceivablesView = ({ transactions, onResolve, onEdit, theme }) => {
    const [filterStatus, setFilterStatus] = useState('open'); // open, repaid, forgiven, all
    const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, amount-desc, amount-asc, name-asc
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Flatten transactions to get all receivable/payable splits
    const allItems = useMemo(() => {
        return transactions.flatMap(t => {
            if (!t.splits) return [];
            return t.splits.map((split, index) => ({
                ...split,
                originalTransaction: t,
                splitIndex: index,
                date: t.date,
                status: split.status || 'open' // ensure status exists
            }));
        }).filter(s => s.category === 'receivable' || s.category === 'payable');
    }, [transactions]);

    // 2. Filter and Sort
    const filteredItems = useMemo(() => {
        return allItems.filter(item => {
            // Status Filter
            if (filterStatus !== 'all' && item.status !== filterStatus) return false;

            // Search Filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const target = (item.target || '').toLowerCase();
                const note = (item.note || '').toLowerCase();
                const desc = (item.originalTransaction.description || '').toLowerCase();
                if (!target.includes(term) && !note.includes(term) && !desc.includes(term)) return false;
            }

            return true;
        }).sort((a, b) => {
            switch (sortBy) {
                case 'date-desc': return new Date(b.date) - new Date(a.date);
                case 'date-asc': return new Date(a.date) - new Date(b.date);
                case 'amount-desc': return parseFloat(b.amount) - parseFloat(a.amount);
                case 'amount-asc': return parseFloat(a.amount) - parseFloat(b.amount);
                case 'name-asc': return (a.target || '').localeCompare(b.target || '');
                default: return 0;
            }
        });
    }, [allItems, filterStatus, sortBy, searchTerm]);

    const receivables = filteredItems.filter(i => i.category === 'receivable');
    const payables = filteredItems.filter(i => i.category === 'payable');

    // 3. Calculate Metrics
    const metrics = useMemo(() => {
        return {
            totalOutstanding: allItems.filter(r => r.category === 'receivable' && r.status === 'open').reduce((sum, r) => sum + parseFloat(r.amount), 0),
            totalDebt: allItems.filter(r => r.category === 'payable' && r.status === 'open').reduce((sum, r) => sum + parseFloat(r.amount), 0),
            totalRepaid: allItems.filter(r => r.status === 'repaid').reduce((sum, r) => sum + parseFloat(r.amount), 0),
            totalForgiven: allItems.filter(r => r.status === 'forgiven').reduce((sum, r) => sum + parseFloat(r.amount), 0),
            countOpen: allItems.filter(r => r.status === 'open').length
        };
    }, [allItems]);

    const renderCard = (item, isPayable) => (
        <div
            key={`${item.originalTransaction.id}-${item.splitIndex}`}
            onClick={() => item.status === 'open' && onResolve(item)}
            className={`relative group text-left transition-all hover:-translate-y-1 ${item.status !== 'open' ? 'opacity-60 grayscale cursor-default' : 'cursor-pointer'}`}
        >
            <div className={`absolute inset-0 rotate-1 rounded shadow-sm group-hover:rotate-2 transition-transform ${item.status === 'open' ? (isPayable ? 'bg-indigo-100' : 'bg-amber-100') : 'bg-gray-200'}`}></div>
            <div className={`relative p-4 border-2 rounded flex flex-col items-center text-center shadow-md group-hover:shadow-lg transition-shadow h-full ${item.status === 'open' ? `bg-[#fdfbf7] ${isPayable ? 'border-indigo-900/20' : 'border-amber-900/20'}` : 'bg-gray-50 border-gray-300'}`} style={item.status === 'open' ? { backgroundImage: 'radial-gradient(#d4c5a5 1px, transparent 1px)', backgroundSize: '20px 20px' } : {}}>
                <div className={`w-full border-b-2 pb-2 mb-2 ${item.status === 'open' ? (isPayable ? 'border-indigo-900/10' : 'border-amber-900/10') : 'border-gray-300'}`}>
                    <div className={`font-cinzel font-bold text-xl uppercase tracking-widest ${item.status === 'open' ? (isPayable ? 'text-indigo-900' : 'text-amber-900') : 'text-gray-500'}`}>
                        {item.status === 'open' ? (isPayable ? 'Debt' : 'Wanted') : item.status}
                    </div>
                </div>

                {onEdit && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(item.originalTransaction); }}
                        className={`absolute top-2 right-2 p-1.5 rounded hover:bg-black/10 z-10 transition-colors ${item.status === 'open' ? (isPayable ? 'text-indigo-900/40 hover:text-indigo-900' : 'text-amber-900/40 hover:text-amber-900') : 'text-gray-400 hover:text-gray-600'}`}
                        title="Edit Original Transaction"
                    >
                        <Edit2 size={14} />
                    </button>
                )}

                <div className="my-2 flex-1 flex flex-col justify-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 mb-2 mx-auto ${item.status === 'open' ? (isPayable ? 'bg-indigo-200/50 border-indigo-900/20' : 'bg-amber-200/50 border-amber-900/20') : 'bg-gray-200 border-gray-300'}`}>
                        {isPayable ? <ArrowRightLeft size={32} className={item.status === 'open' ? 'text-indigo-900/60' : 'text-gray-400'} /> : <User size={32} className={item.status === 'open' ? 'text-amber-900/60' : 'text-gray-400'} />}
                    </div>
                    <div className={`font-bold text-lg ${item.status === 'open' ? (isPayable ? 'text-indigo-900' : 'text-amber-900') : 'text-gray-600'}`}>{item.target}</div>
                    <div className={`text-xs font-mono ${item.status === 'open' ? (isPayable ? 'text-indigo-800/60' : 'text-amber-800/60') : 'text-gray-400'}`}>{item.date.substring(0, 10)}</div>
                </div>

                <div className={`w-full border-t-2 pt-2 mt-2 ${item.status === 'open' ? (isPayable ? 'border-indigo-900/10' : 'border-amber-900/10') : 'border-gray-300'}`}>
                    <div className={`font-cinzel font-bold text-2xl ${item.status === 'open' ? (isPayable ? 'text-indigo-900' : 'text-amber-900') : 'text-gray-600'}`}>{formatCurrency(item.amount)}</div>

                    {/* Description Display */}
                    <div className={`text-sm mt-1 font-bold ${item.status === 'open' ? (isPayable ? 'text-indigo-900' : 'text-amber-900') : 'text-gray-500'}`}>
                        {item.originalTransaction.description}
                    </div>
                    {item.note && item.note !== item.originalTransaction.description && (
                        <div className={`text-xs italic ${item.status === 'open' ? (isPayable ? 'text-indigo-800/60' : 'text-amber-800/60') : 'text-gray-400'}`}>{item.note}</div>
                    )}
                </div>

                {item.status === 'open' && (
                    <div className={`absolute -top-2 -right-2 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity ${isPayable ? 'bg-indigo-600' : 'bg-red-600'}`}>
                        {isPayable ? 'PAY' : 'RESOLVE'}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-24">
            {/* Header & Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-amber-50 border-amber-200">
                    <div className="text-xs font-bold uppercase text-amber-800 opacity-70">Bounties (Owed to You)</div>
                    <div className="text-2xl font-cinzel font-bold text-amber-900">{formatCurrency(metrics.totalOutstanding)}</div>
                </Card>
                <Card className="bg-indigo-50 border-indigo-200">
                    <div className="text-xs font-bold uppercase text-indigo-800 opacity-70">Debts (You Owe)</div>
                    <div className="text-2xl font-cinzel font-bold text-indigo-900">{formatCurrency(metrics.totalDebt)}</div>
                </Card>
                <Card className="bg-emerald-50 border-emerald-200">
                    <div className="text-xs font-bold uppercase text-emerald-800 opacity-70">Total Repaid</div>
                    <div className="text-2xl font-cinzel font-bold text-emerald-900">{formatCurrency(metrics.totalRepaid)}</div>
                </Card>
                <Card className="bg-red-50 border-red-200">
                    <div className="text-xs font-bold uppercase text-red-800 opacity-70">Total Forgiven</div>
                    <div className="text-2xl font-cinzel font-bold text-red-900">{formatCurrency(metrics.totalForgiven)}</div>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border-2" style={{ borderColor: theme.borderColor }}>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        <input
                            placeholder="Search bounties & debts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 p-2 border rounded-lg bg-gray-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
                        <Filter size={14} className="opacity-50" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                        >
                            <option value="open">Open (Unpaid)</option>
                            <option value="repaid">Repaid</option>
                            <option value="forgiven">Forgiven</option>
                            <option value="all">All History</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
                        <ArrowUpDown size={14} className="opacity-50" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                        >
                            <option value="date-desc">Newest First</option>
                            <option value="date-asc">Oldest First</option>
                            <option value="amount-desc">Highest Amount</option>
                            <option value="amount-asc">Lowest Amount</option>
                            <option value="name-asc">Name (A-Z)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Bounties Section */}
            {receivables.length > 0 && (
                <div>
                    <h3 className="text-xl font-cinzel font-bold text-amber-900 mb-4 flex items-center gap-2">
                        <User size={24} /> Bounties
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {receivables.map((item) => renderCard(item, false))}
                    </div>
                </div>
            )}

            {/* Payables Section */}
            {payables.length > 0 && (
                <div>
                    <h3 className="text-xl font-cinzel font-bold text-indigo-900 mb-4 flex items-center gap-2 border-t pt-8">
                        <ArrowRightLeft size={24} /> Debts
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {payables.map((item) => renderCard(item, true))}
                    </div>
                </div>
            )}

            {filteredItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <ScrollText size={64} className="mb-4 text-gray-400" />
                    <div className="text-xl font-bold text-gray-500">No records found</div>
                    <p className="text-sm text-gray-400">Try adjusting your filters</p>
                </div>
            )}
        </div>
    );
};

export default ReceivablesView;
