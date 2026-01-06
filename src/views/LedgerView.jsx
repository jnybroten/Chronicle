import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, MonthSelector } from '../components/UIComponents';
import { Search, Filter, Download, Repeat, Plus, Edit2, ChevronLeft, ChevronRightIcon } from '../components/Icons';
import { CATEGORY_COLORS, formatCurrency } from '../utils/helpers';

const LedgerView = ({
    filteredTotals, filteredTransactions, ITEMS_PER_PAGE, currentPage, setCurrentPage,
    viewAllTime, setViewAllTime, filterStartDate, setFilterStartDate, filterEndDate, setFilterEndDate,
    selectedMonth, setSelectedMonth, theme, searchTerm, setSearchTerm, showAdvancedFilters, setShowAdvancedFilters,
    sortBy, setSortBy, filterMinAmount, setFilterMinAmount, filterMaxAmount, setFilterMaxAmount,
    filterCategory, setFilterCategory, filterAccount, setFilterAccount, accounts, categories, resetFilters, runExport, allTags, filterTag, setFilterTag,
    setEditingTransaction, setTransactionModalOpen, setEditingSubscription, setSubscriptionModalOpen, subscriptions, transactions
}) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showAllTagsList, setShowAllTagsList] = useState(false);
    const searchRef = useRef(null);

    // Close suggestions on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Autocomplete Logic
    useEffect(() => {
        if (!searchTerm || searchTerm.length < 2) {
            setSuggestions([]);
            return;
        }
        const term = searchTerm.toLowerCase();
        // Get unique matches
        const matches = new Set();
        const results = [];

        // 1. Tags matching
        allTags.forEach(tag => {
            if (tag.toLowerCase().includes(term)) {
                results.push({ type: 'tag', value: tag });
                matches.add(tag.toLowerCase());
            }
        });

        // 2. Descriptions matching (limit to top matches)
        // Sort transactions by date first to show recent matches
        const sortedForSearch = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        for (const t of sortedForSearch) {
            if (results.length >= 10) break;
            const desc = t.description;
            if (desc.toLowerCase().includes(term) && !matches.has(desc.toLowerCase())) {
                results.push({ type: 'history', value: desc });
                matches.add(desc.toLowerCase());
            }
        }

        setSuggestions(results);
        setShowSuggestions(true);
    }, [searchTerm, allTags, transactions]);

    // Tag Analysis
    const { recentTags, mostUsedTags } = useMemo(() => {
        if (!transactions || transactions.length === 0) return { recentTags: [], mostUsedTags: [] };

        // Sort by date desc for Recency
        const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        const recent = new Set();
        for (const t of sorted) {
            if (t.tags) t.tags.forEach(tag => recent.add(tag));
            if (recent.size >= 25) break;
        }

        const stats = {};
        transactions.forEach(t => {
            if (t.tags) t.tags.forEach(tag => {
                stats[tag] = (stats[tag] || 0) + 1;
            });
        });

        const mostUsed = Object.entries(stats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 25)
            .map(([tag]) => tag);

        return { recentTags: Array.from(recent), mostUsedTags: mostUsed };
    }, [transactions]);

    const net = filteredTotals.income - filteredTotals.expense;
    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-cinzel">Ledger</h2>
                    {viewAllTime && <span className="px-3 py-1 rounded border bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold shadow-sm animate-in fade-in">All Time View</span>}
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-2 sm:p-4 rounded-lg border-2 flex flex-col items-center justify-center" style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}>
                    <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-60">Filtered Income</div>
                    <div className="text-sm sm:text-2xl font-bold font-cinzel text-emerald-600">+{formatCurrency(filteredTotals.income)}</div>
                </div>
                <div className="p-2 sm:p-4 rounded-lg border-2 flex flex-col items-center justify-center" style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}>
                    <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-60">Filtered Expenses</div>
                    <div className="text-sm sm:text-2xl font-bold font-cinzel text-red-600">-{formatCurrency(filteredTotals.expense)}</div>
                </div>
                <div className="p-2 sm:p-4 rounded-lg border-2 flex flex-col items-center justify-center" style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}>
                    <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-60">Net Result</div>
                    <div className={`text-sm sm:text-2xl font-bold font-cinzel ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{net > 0 ? '+' : ''}{formatCurrency(net)}</div>
                </div>
            </div>
            <div className="p-4 sm:p-6 rounded-lg border-2 space-y-4 shadow-sm" style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative group" ref={searchRef}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 group-focus-within:opacity-100 transition-opacity" size={18} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => { if (searchTerm.length >= 2) setShowSuggestions(true); }}
                            placeholder="Search by description, amount, or tags..."
                            className="w-full pl-10 p-3 old-book-input rounded-lg outline-none transition-shadow focus:ring-2 ring-opacity-50"
                            style={{ '--tw-ring-color': theme.primary }}
                        />
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full mt-1 left-0 right-0 rounded-lg border-2 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto" style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}>
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setSearchTerm(s.value); setShowSuggestions(false); }}
                                        className="w-full text-left p-3 hover:bg-black/5 flex items-center gap-3 transition-colors text-sm border-b last:border-0"
                                        style={{ borderColor: theme.borderColor }}
                                    >
                                        <div className={`p-1.5 rounded-full ${s.type === 'tag' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {s.type === 'tag' ? <Filter size={12} /> : <Search size={12} />}
                                        </div>
                                        <span className="font-medium truncate">{s.value}</span>
                                        {s.type === 'tag' && <span className="text-[10px] uppercase opacity-50 border px-1 rounded ml-auto" style={{ borderColor: theme.text }}>Tag</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`px-4 py-2 rounded-lg border-2 font-cinzel text-sm font-bold flex items-center gap-2 transition-all ${showAdvancedFilters ? 'bg-black/5 shadow-inner' : 'hover:bg-black/5'}`} style={{ borderColor: theme.borderColor }}><Filter size={16} /> Filters</button>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 old-book-input rounded-lg text-sm font-medium outline-none cursor-pointer"><option value="date-desc">Recent First</option><option value="date-asc">Oldest First</option><option value="amount-desc">Highest Amount</option><option value="amount-asc">Lowest Amount</option></select>
                    </div>
                </div>
                {showAdvancedFilters && (
                    <div className="pt-4 border-t-2 border-dashed space-y-4 animate-in slide-in-from-top-2 fade-in duration-200" style={{ borderColor: theme.borderColor }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            <div className="space-y-1">
                                <div className="flex justify-between items-center h-5"><label className="text-xs font-bold uppercase opacity-60 ml-1">Date Range</label><button onClick={() => { setViewAllTime(true); setFilterStartDate(''); setFilterEndDate(''); }} className={`text-[10px] font-bold hover:underline ${viewAllTime ? 'text-emerald-600 underline' : 'text-emerald-600'}`}>All Time</button></div>
                                <div className={`flex gap-2 items-center transition-opacity ${viewAllTime ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                    <input type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setViewAllTime(false); }} onClick={(e) => e.target.showPicker && e.target.showPicker()} className="w-full p-2 old-book-input rounded text-sm min-w-0 cursor-pointer" />
                                    <span className="opacity-50">-</span>
                                    <input type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setViewAllTime(false); }} onClick={(e) => e.target.showPicker && e.target.showPicker()} className="w-full p-2 old-book-input rounded text-sm min-w-0 cursor-pointer" />
                                </div>
                            </div>
                            <div className="space-y-1"><div className="h-5 flex items-center"><label className="text-xs font-bold uppercase opacity-60 ml-1">Amount ($)</label></div><div className="flex gap-2 items-center"><input type="number" placeholder="Min" value={filterMinAmount} onChange={(e) => setFilterMinAmount(e.target.value)} className="w-full p-2 old-book-input rounded text-sm min-w-0" /><span className="opacity-50">-</span><input type="number" placeholder="Max" value={filterMaxAmount} onChange={(e) => setFilterMaxAmount(e.target.value)} className="w-full p-2 old-book-input rounded text-sm min-w-0" /></div></div>
                            <div className="space-y-1"><div className="h-5 flex items-center"><label className="text-xs font-bold uppercase opacity-60 ml-1">Account</label></div><select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="w-full p-2 old-book-input rounded text-sm"><option value="all">All Accounts</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                            <div className="space-y-1"><div className="h-5 flex items-center"><label className="text-xs font-bold uppercase opacity-60 ml-1">Category</label></div><select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full p-2 old-book-input rounded text-sm"><option value="all">All Categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            <div className="flex items-end gap-2"><button onClick={() => { resetFilters(); setViewAllTime(false); }} className="flex-1 p-2 rounded border-2 border-dashed hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors text-sm font-bold opacity-70 hover:opacity-100" style={{ borderColor: theme.borderColor }}>Clear All</button><button onClick={runExport} className="flex-1 p-2 rounded border-2 hover:bg-black/5 transition-colors text-sm font-bold flex items-center justify-center gap-2" style={{ borderColor: theme.borderColor }}><Download size={14} /> CSV</button></div>
                        </div>
                        {allTags.length > 0 && (
                            <div className="space-y-4 pt-4 border-t-2 border-dashed" style={{ borderColor: theme.borderColor }}>
                                {/* Recent Tags */}
                                {recentTags.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase opacity-60 ml-1 flex items-center gap-2">Recent Tags</label>
                                        <div className="flex flex-wrap gap-2">
                                            {recentTags.map(t => (
                                                <button key={t} onClick={() => setFilterTag(filterTag === t ? 'all' : t)} className={`px-2 py-0.5 rounded text-[10px] transition-all border ${filterTag === t ? 'font-bold ring-1 ring-offset-1' : 'opacity-70 hover:opacity-100 hover:bg-black/5'}`} style={{ backgroundColor: filterTag === t ? theme.primary : 'transparent', color: filterTag === t ? (theme.name === 'dark' ? '#000' : '#fff') : theme.text, borderColor: theme.borderColor }}>
                                                    #{t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Most Used Tags */}
                                {mostUsedTags.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase opacity-60 ml-1 flex items-center gap-2">Popular Tags</label>
                                        <div className="flex flex-wrap gap-2">
                                            {mostUsedTags.map(t => (
                                                <button key={t} onClick={() => setFilterTag(filterTag === t ? 'all' : t)} className={`px-2 py-0.5 rounded text-[10px] transition-all border ${filterTag === t ? 'font-bold ring-1 ring-offset-1' : 'opacity-70 hover:opacity-100 hover:bg-black/5'}`} style={{ backgroundColor: filterTag === t ? theme.primary : 'transparent', color: filterTag === t ? (theme.name === 'dark' ? '#000' : '#fff') : theme.text, borderColor: theme.borderColor }}>
                                                    #{t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* All Tags Accordion */}
                                <div className="space-y-1">
                                    <button
                                        onClick={() => setShowAllTagsList(!showAllTagsList)}
                                        className="w-full flex justify-between items-center text-[10px] font-bold uppercase opacity-60 hover:opacity-100 transition-opacity ml-1 py-1"
                                    >
                                        <span>All Tags ({allTags.length})</span>
                                        <ChevronRightIcon size={14} className={`transition-transform duration-200 ${showAllTagsList ? 'rotate-90' : ''}`} />
                                    </button>

                                    {showAllTagsList && (
                                        <div className="flex flex-wrap gap-2 pt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                                            {allTags.sort().map(t => (
                                                <button key={t} onClick={() => setFilterTag(filterTag === t ? 'all' : t)} className={`px-2 py-0.5 rounded text-[10px] transition-all border ${filterTag === t ? 'font-bold ring-1 ring-offset-1' : 'opacity-70 hover:opacity-100 hover:bg-black/5'}`} style={{ backgroundColor: filterTag === t ? theme.primary : 'transparent', color: filterTag === t ? (theme.name === 'dark' ? '#000' : '#fff') : theme.text, borderColor: theme.borderColor }}>
                                                    #{t}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <Card theme={theme} className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead style={{ backgroundColor: theme.bg, color: theme.textMuted, borderBottom: `2px solid ${theme.borderColor}` }}>
                            <tr><th className="p-1 sm:p-4 font-cinzel font-bold text-[10px] sm:text-sm">Date</th><th className="p-1 sm:p-4 font-cinzel font-bold text-[10px] sm:text-sm">Description</th><th className="p-1 sm:p-4 font-cinzel font-bold text-[10px] sm:text-sm">Category</th><th className="p-1 sm:p-4 font-cinzel font-bold text-[10px] sm:text-sm text-right">Amount</th></tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: theme.borderColor }}>
                            {paginatedTransactions.length === 0 ? (<tr><td colSpan="4" className="p-8 text-center opacity-50 italic">No parchments found matching your query.</td></tr>) : (
                                paginatedTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-black/5 transition-colors group cursor-pointer" onClick={() => { setEditingTransaction(t); setTransactionModalOpen(true); }}>
                                        <td className="p-1 sm:p-4 text-[10px] sm:text-sm opacity-80 align-middle">
                                            <div className="flex flex-col sm:hidden leading-tight">
                                                <span className="font-bold">
                                                    {new Date(t.date).toLocaleString('default', { month: 'short' })} {t.date.substring(8, 10)}
                                                </span>
                                                <span className="opacity-60 text-[9px] font-mono">
                                                    {t.date.substring(0, 4)}
                                                </span>
                                            </div>
                                            <div className="hidden sm:block font-mono whitespace-nowrap">
                                                {t.date.substring(0, 10)}
                                            </div>
                                        </td>
                                        <td className="p-1 sm:p-4 text-[10px] sm:text-sm max-w-[120px] sm:max-w-none whitespace-normal break-words"><div className="font-bold flex items-center gap-2 flex-wrap">{t.description} {t.isRecurring && <span title="Recurring Subscription" className="text-blue-500 opacity-70"><Repeat size={14} /></span>}</div>{t.tags && t.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{t.tags.map(tag => <span key={tag} className="text-[9px] sm:text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border opacity-60 whitespace-nowrap" style={{ borderColor: theme.textMuted }}>#{tag}</span>)}</div>}</td>
                                        <td className="p-1 sm:p-4 text-[10px] sm:text-sm">
                                            {(() => {
                                                let displayCatId = t.category;
                                                let isSplit = false;
                                                if (t.splits && t.splits.length > 0) {
                                                    isSplit = true;
                                                    const myPortion = t.splits.find(s => s.category !== 'receivable');
                                                    if (myPortion) displayCatId = myPortion.category;
                                                }
                                                const catName = categories.find(c => c.id === displayCatId)?.name || displayCatId;
                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-1 rounded-full text-[9px] sm:text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-80 whitespace-nowrap" style={{ backgroundColor: `${CATEGORY_COLORS[displayCatId] || theme.textMuted}20`, color: CATEGORY_COLORS[displayCatId] || theme.text }}>
                                                            {catName}
                                                        </span>
                                                        {isSplit && <span className="text-[9px] uppercase font-bold opacity-50 border px-1 rounded">Split</span>}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className={`p-1 sm:p-4 text-right font-bold font-mono text-[10px] sm:text-sm ${t.type === 'income' ? 'text-emerald-600' : ''}`}>{t.type === 'income' ? '+' : ''}{formatCurrency(t.amount)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 select-none" style={{ borderColor: theme.borderColor }}>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={`px-3 py-1 rounded border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5'}`} style={{ borderColor: theme.borderColor }}><ChevronLeft size={14} /> Prev</button>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={`px-3 py-1 rounded border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${currentPage === totalPages || totalPages === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5'}`} style={{ borderColor: theme.borderColor }}>Next <ChevronRightIcon size={14} /></button>
                    </div>
                    <div className="text-xs font-cinzel font-bold opacity-70">Page {currentPage} of {totalPages || 1}</div>
                    <div className="text-xs opacity-60 font-mono">Total Value: {formatCurrency(filteredTotals.income - filteredTotals.expense)}</div>
                </div>
            </Card>
            <div className="pt-8">
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-cinzel font-bold">Subscriptions & Recurring</h2><button onClick={() => { setEditingTransaction({ isRecurring: true }); setTransactionModalOpen(true); }} className="old-book-btn px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2"><Plus size={14} /> Add Subscription</button></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subscriptions.length === 0 ? (<div className="col-span-full p-8 border-2 border-dashed rounded text-center opacity-50 italic" style={{ borderColor: theme.borderColor }}>No subscriptions recorded. Add one to automate your monthly expenses.</div>) : (
                        subscriptions.map(sub => (
                            <div key={sub.id} className="p-4 rounded border-2 flex justify-between items-start group hover:shadow-md transition-all" style={{ borderColor: theme.borderColor, backgroundColor: theme.cardBg }}>
                                <div><div className="font-bold flex items-center gap-2">{sub.name}<span className="text-xs px-1.5 rounded border opacity-60" style={{ borderColor: theme.text }}>Day {sub.dayOfMonth}</span></div><div className="text-sm opacity-70 mt-1">{categories.find(c => c.id === sub.category)?.name || sub.category}</div><div className="text-xs mt-2 opacity-50 font-mono">Last charged: {sub.lastProcessed ? sub.lastProcessed.substring(0, 10) : 'Never'}</div></div>
                                <div className="text-right"><div className="font-bold font-mono text-lg">{formatCurrency(sub.amount)}</div><div className="flex gap-2 justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingSubscription(sub); setSubscriptionModalOpen(true) }} className="p-1 hover:bg-black/5 rounded" title="Edit"><Edit2 size={14} /></button></div></div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default LedgerView;
