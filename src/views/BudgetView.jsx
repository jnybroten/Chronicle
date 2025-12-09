import React, { useMemo } from 'react';
import { Card, MonthSelector, ProgressBar } from '../components/UIComponents';
import { ChestIcon, TrendingDown, Settings, ChevronDown } from '../components/Icons';
import { CATEGORY_COLORS, formatCurrency } from '../utils/helpers';

const BudgetView = ({
    categories, selectedMonth, setSelectedMonth, monthlyBudgets, transactions, theme,
    getEffectiveBudget, setCategoryManagerOpen, expandedBudgetCategory, setExpandedBudgetCategory,
    budgetSortOrder, setBudgetSortOrder, handleSaveBudget, editingBudget, setEditingBudget
}) => {
    const sortedCategories = useMemo(() => {
        return categories.filter(c => c.id !== 'income').sort((a, b) => {
            const budgetA = getEffectiveBudget(a.id, selectedMonth);
            const budgetB = getEffectiveBudget(b.id, selectedMonth);
            return budgetB - budgetA;
        });
    }, [categories, selectedMonth, monthlyBudgets]);

    const monthlyIncome = useMemo(() => {
        const prevDate = new Date(selectedMonth + '-01');
        const nextDate = new Date(new Date(prevDate).setMonth(prevDate.getMonth() + 1)).toISOString();
        return transactions
            .filter(t => t.date >= `${selectedMonth}-01` && t.date < nextDate && t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions, selectedMonth]);

    const daysRemaining = useMemo(() => {
        const now = new Date();
        const localNowStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 7);
        if (selectedMonth < localNowStr) return 0;
        const [y, m] = selectedMonth.split('-').map(Number);
        const totalDays = new Date(y, m, 0).getDate();
        if (selectedMonth > localNowStr) return totalDays;
        return Math.max(1, totalDays - now.getDate() + 1);
    }, [selectedMonth]);

    const questChestData = useMemo(() => {
        const income = transactions
            .filter(t => t.type === 'income' && !t.date.startsWith(selectedMonth))
            .reduce((acc, t) => acc + t.amount, 0);

        const expense = transactions
            .filter(t => {
                const isCurrentMonth = t.date.startsWith(selectedMonth);
                if (t.type !== 'expense') return false;
                if (isCurrentMonth && t.category !== 'quest_chest') return false;
                return true;
            })
            .reduce((acc, t) => acc + t.amount, 0);

        const spentThisMonth = transactions
            .filter(t => t.date.startsWith(selectedMonth) && t.category === 'quest_chest' && t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);

        const value = income - expense;
        return { value, isPositive: value > 0, spentThisMonth };
    }, [transactions, selectedMonth]);

    const totalStats = useMemo(() => {
        let spent = 0;
        const validCategoryIds = new Set(sortedCategories.map(c => c.id));

        transactions.forEach(t => {
            if (!t.date.startsWith(selectedMonth) || t.type !== 'expense') return;

            if (t.splits && t.splits.length > 0) {
                t.splits.forEach(s => {
                    if (validCategoryIds.has(s.category)) {
                        spent += (parseFloat(s.amount) || 0);
                    }
                });
            } else {
                if (validCategoryIds.has(t.category)) {
                    spent += t.amount;
                }
            }
        });

        const budgeted = sortedCategories.reduce((a, c) => a + getEffectiveBudget(c.id, selectedMonth), 0);
        return { spent, budgeted };
    }, [transactions, selectedMonth, sortedCategories, getEffectiveBudget]);

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`relative col-span-1 md:col-span-2 p-5 rounded-lg border-2 flex items-center justify-between gap-4 transition-all duration-500 overflow-hidden ${questChestData.isPositive ? 'bg-amber-50 border-amber-200' : 'bg-stone-100 border-stone-300'}`} style={{ color: theme.text }}>
                    {questChestData.isPositive && <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-amber-200/20 to-transparent pointer-events-none"></div>}
                    <div className="flex items-center gap-4 z-10">
                        <div className="hidden sm:block"><ChestIcon size={120} isOpen={questChestData.isPositive} isGlowing={questChestData.isPositive} /></div>
                        <div>
                            <h2 className="font-cinzel font-bold text-lg tracking-widest uppercase text-amber-700">The Quest Chest</h2>
                            <div className={`text-xl font-bold font-cinzel ${questChestData.isPositive ? 'text-emerald-600' : 'text-stone-500'}`}>{formatCurrency(Math.max(0, questChestData.value))}</div>
                            {questChestData.spentThisMonth > 0 && (
                                <div className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1 opacity-80">
                                    <TrendingDown size={12} /> Spent this month: {formatCurrency(questChestData.spentThisMonth)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-right z-10"><div className="text-xs font-bold uppercase opacity-50 mb-1">Status</div><div className={`font-bold font-cinzel text-sm px-3 py-1 rounded-full border ${questChestData.isPositive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-stone-200 text-stone-600 border-stone-300'}`}>{questChestData.isPositive ? 'Abundant' : 'Depleted'}</div></div>
                </div>
                <Card theme={theme}><div className="flex justify-between items-center mb-2"><h2 className="text-3xl font-bold font-cinzel">Monthly Budget</h2></div><div className="flex items-center gap-4"><MonthSelector currentMonth={selectedMonth} onChange={setSelectedMonth} theme={theme} /></div></Card>
                <Card theme={theme}>{(() => {
                    const prevDate = new Date(selectedMonth + '-01'); prevDate.setMonth(prevDate.getMonth() - 1);
                    const prevMonthKey = prevDate.toISOString().slice(0, 7);
                    const prevIncome = transactions.filter(t => t.date.startsWith(prevMonthKey) && t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
                    const prevExpense = transactions.filter(t => t.date.startsWith(prevMonthKey) && t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
                    const leftover = prevIncome - prevExpense; const isPositive = leftover >= 0;
                    return (<div className="flex flex-col justify-center h-full"><div className="text-sm font-bold uppercase tracking-wider font-cinzel mb-1" style={{ color: theme.textMuted }}>Leftover from Last Month</div><div className={`text-3xl font-bold font-cinzel ${isPositive ? 'text-[#3d5a4a]' : 'text-[#a05555]'}`}>{isPositive ? '+' : ''}{formatCurrency(leftover)}</div></div>);
                })()}</Card>
            </div>
            <Card theme={theme}>
                <div className="flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                        <div className="flex flex-col">
                            <span className="text-xs opacity-60 uppercase font-bold">Total Budgeted</span>
                            <span className="font-bold text-xl">{formatCurrency(totalStats.budgeted)}</span>
                        </div>
                        <div className="h-8 w-px bg-current opacity-10"></div>
                        <div className="flex flex-col">
                            <span className="text-xs opacity-60 uppercase font-bold">Total Spent</span>
                            <div className="flex items-baseline gap-2">
                                <span className={`font-bold text-xl ${totalStats.spent > totalStats.budgeted ? 'text-red-600' : ''}`}>{formatCurrency(totalStats.spent)}</span>
                                <span className={`text-xs font-bold ${totalStats.spent > totalStats.budgeted ? 'text-red-600' : 'opacity-50'}`}>
                                    ({totalStats.budgeted > 0 ? ((totalStats.spent / totalStats.budgeted) * 100).toFixed(1) : 0}%)
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setCategoryManagerOpen(true)} className="old-book-btn px-2 py-2 sm:px-4 sm:py-2 rounded text-xs font-bold flex items-center gap-2"><Settings size={14} /> <span className="hidden sm:inline">Manage Categories</span></button>
                </div>
            </Card>
            <div className="grid gap-6">
                {sortedCategories.map(c => {
                    // Calculate spent amount including splits
                    let spent = 0;
                    const categoryTransactions = [];

                    transactions.forEach(t => {
                        if (!t.date.startsWith(selectedMonth) || t.type !== 'expense') return;

                        if (t.splits && t.splits.length > 0) {
                            // Check for splits matching this category
                            const relevantSplits = t.splits.filter(s => s.category === c.id);
                            if (relevantSplits.length > 0) {
                                const splitTotal = relevantSplits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
                                spent += splitTotal;
                                categoryTransactions.push({
                                    ...t,
                                    amount: splitTotal, // Show only the relevant portion
                                    description: `${t.description} (Split)`,
                                    originalId: t.id
                                });
                            }
                        } else {
                            // Normal transaction
                            if (t.category === c.id) {
                                spent += t.amount;
                                categoryTransactions.push(t);
                            }
                        }
                    });
                    const budget = getEffectiveBudget(c.id, selectedMonth);
                    const remaining = budget - spent;
                    const daily = (remaining > 0 && daysRemaining > 0) ? remaining / daysRemaining : 0;
                    const isOver = spent > budget;
                    const isExpanded = expandedBudgetCategory === c.id;

                    let percent = 0;
                    let labelText = `(${percent.toFixed(1)}%)`;

                    if (c.id === 'savings') {
                        percent = monthlyIncome > 0 ? (spent / monthlyIncome) * 100 : 0;
                        labelText = `(${percent.toFixed(1)}% of Income)`;
                    } else {
                        percent = budget > 0 ? (spent / budget) * 100 : 0;
                        labelText = `(${percent.toFixed(1)}%)`;
                    }

                    const sortedTransactions = [...categoryTransactions].sort((a, b) => {
                        if (budgetSortOrder === 'amount') return b.amount - a.amount;
                        if (budgetSortOrder === 'date') return new Date(b.date) - new Date(a.date);
                        return 0;
                    });

                    return (
                        <Card key={c.id} theme={theme} className={`transition-all duration-300 ${isExpanded ? 'ring-2 ring-opacity-50' : ''}`} style={{ '--tw-ring-color': theme.secondary }}>
                            <div className="cursor-pointer" onClick={() => setExpandedBudgetCategory(isExpanded ? null : c.id)}>
                                <div className="flex justify-between items-start mb-4">
                                    <div><h3 className="font-bold text-xl font-cinzel flex items-center gap-2">{c.name} <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'} opacity-50`}><ChevronDown size={16} /></span></h3><div className="mt-1 text-sm font-mono opacity-80"><span className={isOver && c.id !== 'savings' ? 'text-red-600 font-bold' : ''}>{formatCurrency(spent)}</span><span className="mx-1 opacity-50">/</span><span>{formatCurrency(budget)}</span><span className={`ml-2 text-xs font-bold ${isOver && c.id !== 'savings' ? 'text-red-600' : 'opacity-60'}`}>{labelText}</span></div></div>
                                    <div className="flex flex-col items-end gap-2"><div className="flex items-center gap-3">{editingBudget === c.id ? (<form onClick={e => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); handleSaveBudget(c.id, e.target[0].value, selectedMonth); }}><input defaultValue={budget} className="w-24 p-2 old-book-input rounded" autoFocus /></form>) : (<div onClick={(e) => { e.stopPropagation(); setEditingBudget(c.id); }} className="cursor-pointer font-bold text-lg border-b border-dashed border-transparent hover:border-current transition-colors" title="Edit Budget">{formatCurrency(budget)}</div>)}</div>{remaining > 0 && daysRemaining > 0 && c.id !== 'savings' && (<div className="text-xs font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm flex items-center gap-1">{formatCurrency(daily)} <span className="text-[10px] uppercase opacity-70">/ day</span></div>)}{remaining <= 0 && budget > 0 && c.id !== 'savings' && (<div className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-800 border border-red-200 shadow-sm">Budget Exceeded</div>)}</div>
                                </div>
                                <ProgressBar current={spent} max={budget || 1} color={CATEGORY_COLORS[c.id] || theme.textMuted} theme={theme} />
                            </div>
                            {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-dashed animate-in slide-in-from-top-2 fade-in duration-300" style={{ borderColor: theme.borderColor }}>
                                    <div className="flex justify-between items-center mb-2 px-1"><span className="text-xs font-bold uppercase opacity-50 tracking-widest">Breakdown</span><div className="flex items-center gap-2"><span className="text-[10px] opacity-60 uppercase font-bold">Sort By:</span><select value={budgetSortOrder} onChange={(e) => setBudgetSortOrder(e.target.value)} className="text-xs p-1 rounded border bg-transparent outline-none cursor-pointer font-bold" onClick={(e) => e.stopPropagation()} style={{ borderColor: theme.borderColor, color: theme.text }}><option value="amount">Highest Amount</option><option value="date">Most Recent</option></select></div></div>
                                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1 scrollbar-hide">
                                        {sortedTransactions.length === 0 ? (<div className="text-center text-xs opacity-40 italic py-2">No expenses recorded yet.</div>) : (
                                            sortedTransactions.map(t => (
                                                <div key={t.id} className="flex justify-between items-center p-2 rounded hover:bg-black/5 transition-colors text-sm">
                                                    <div className="flex flex-col"><span className="font-bold">{t.description}</span><span className="text-[10px] opacity-60 font-mono">{t.date.substring(0, 10)}</span></div><div className="font-mono font-bold">{formatCurrency(t.amount)}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default BudgetView;
