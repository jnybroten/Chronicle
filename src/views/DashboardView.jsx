import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';
import { Card, KPICard, MonthSelector } from '../components/UIComponents';
import BookshelfChart from '../components/BookshelfChart';
import { ChevronLeft, ChevronRightIcon, Trash2, Edit2, Check, X } from '../components/Icons';
import { CATEGORY_COLORS, formatCurrency } from '../utils/helpers';

const DashboardView = ({
    selectedMonth, setSelectedMonth, setViewAllTime, theme = {}, metrics, history, accounts,
    categoryPieData, cashFlowDate, cashFlowView, setCashFlowView, shiftCashFlow, trendData,
    transactions, onResolveDebt, onProcessScribe
}) => {
    const [chartSize, setChartSize] = useState({ inner: 70, outer: 130, fontSize: 12 });
    const [inboxItems, setInboxItems] = useState([]);
    const [editingInboxId, setEditingInboxId] = useState(null);
    const [editInboxText, setEditInboxText] = useState('');

    useEffect(() => {
        const loadInbox = () => {
            const items = JSON.parse(localStorage.getItem('chronicle_inbox') || '[]');
            setInboxItems(items);
        };
        loadInbox();
        window.addEventListener('focus', loadInbox);
        return () => window.removeEventListener('focus', loadInbox);
    }, []);

    const clearInboxItem = (id) => {
        const updated = inboxItems.filter(i => i.id !== id);
        setInboxItems(updated);
        localStorage.setItem('chronicle_inbox', JSON.stringify(updated));
    };

    const startEditingInbox = (item) => {
        setEditingInboxId(item.id);
        setEditInboxText(item.text);
    };

    const saveInboxEdit = (id) => {
        const updated = inboxItems.map(i => i.id === id ? { ...i, text: editInboxText } : i);
        setInboxItems(updated);
        localStorage.setItem('chronicle_inbox', JSON.stringify(updated));
        setEditingInboxId(null);
        setEditInboxText('');
    };

    const handleProcessItem = async (item) => {
        if (onProcessScribe) {
            await onProcessScribe(item.text);
            clearInboxItem(item.id);
        }
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 640) {
                setChartSize({ inner: 40, outer: 80, fontSize: 10 });
            } else {
                setChartSize({ inner: 70, outer: 130, fontSize: 12 });
            }
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const renderCustomizedLabel = (props) => {
        const { cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value, fill } = props;
        const RADIAN = Math.PI / 180;
        const radius = outerRadius + 20;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const sin = Math.sin(-midAngle * RADIAN);
        const cos = Math.cos(-midAngle * RADIAN);
        const sx = cx + (outerRadius + 10) * cos;
        const sy = cy + (outerRadius + 10) * sin;
        const mx = cx + (outerRadius + 30) * cos;
        const my = cy + (outerRadius + 30) * sin;
        const ex = mx + (cos >= 0 ? 1 : -1) * 22;
        const ey = my;
        const textAnchor = cos >= 0 ? 'start' : 'end';

        return (
            <g>
                <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
                <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
                <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill={theme.text} dy={chartSize.fontSize / 2 - 2} fontSize={chartSize.fontSize} fontWeight="bold">
                    {`${name} (${(percent * 100).toFixed(0)}%)`}
                </text>
            </g>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in">


            {inboxItems.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4" style={{ backgroundColor: theme.cardBg, borderColor: theme.primary }}>
                    <h3 className="font-bold text-lg mb-2" style={{ color: theme.primary }}>Review Pending Transactions</h3>
                    <div className="space-y-2">
                        {inboxItems.map(item => (
                            <div
                                key={item.id}
                                className="flex justify-between items-center p-2 bg-black/5 rounded group hover:bg-black/10 transition-colors cursor-pointer"
                                onClick={() => editingInboxId !== item.id && handleProcessItem(item)}
                            >
                                {editingInboxId === item.id ? (
                                    <div className="flex-1 flex gap-2 mr-2" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            value={editInboxText}
                                            onChange={(e) => setEditInboxText(e.target.value)}
                                            className="flex-1 p-1 rounded border"
                                            autoFocus
                                        />
                                        <button onClick={() => saveInboxEdit(item.id)} className="text-green-600 hover:text-green-700"><Check size={16} /></button>
                                        <button onClick={() => setEditingInboxId(null)} className="text-red-500 hover:text-red-600"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <div className="flex-1">
                                        <p className="font-medium">{item.text}</p>
                                        <p className="text-xs opacity-60">{new Date(item.date).toLocaleString()}</p>
                                    </div>
                                )}
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    {!editingInboxId && (
                                        <button
                                            onClick={() => startEditingInbox(item)}
                                            className="p-1 hover:bg-black/10 text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Edit Description"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => clearInboxItem(item.id)}
                                        className="p-1 hover:bg-red-100 text-red-600 rounded"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Card className="p-4 sm:p-8 min-h-[300px]" theme={theme}>
                <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-2 font-cinzel" style={{ color: theme.textMuted }}>Total Net Worth</h2>
                        <div className="text-4xl sm:text-6xl font-bold font-cinzel" style={{ color: theme.primary }}>{formatCurrency(metrics.netWorth)}</div>
                    </div>
                    <div className="italic text-xs opacity-60 max-w-xs text-right hidden md:block">
                        "A library of wealth, built one book at a time."
                    </div>
                </div>
                <div className="mt-8 pt-4 border-t border-dashed border-opacity-20" style={{ borderColor: theme.borderColor }}>
                    <BookshelfChart history={history} accounts={accounts} currentAssets={metrics.assets} currentLiabilities={metrics.liabilities} theme={theme} />
                </div>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard label="Total Income" value={formatCurrency(metrics.income)} trend="positive" theme={theme} />
                <KPICard label="Total Expenses" value={formatCurrency(metrics.expense)} trend="negative" theme={theme} />
                <KPICard label="Net Income" value={formatCurrency(metrics.cashFlow)} trend={metrics.cashFlow >= 0 ? 'positive' : 'negative'} theme={theme} />
                <KPICard label="Savings Rate" value={`${metrics.savingsRate.toFixed(2)}%`} trend="neutral" theme={theme} />
            </div>
            <div className="grid grid-cols-1 gap-6">
                <Card title="Monthly Spending" subTitle="By Category" theme={theme}>
                    <div className="h-96 w-full">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={categoryPieData}
                                    innerRadius={chartSize.inner}
                                    outerRadius={chartSize.outer}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={renderCustomizedLabel}
                                    labelLine={false}
                                >
                                    {categoryPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || theme.textMuted} />)}
                                </Pie>
                                <Tooltip formatter={(value, name) => {
                                    const total = categoryPieData.reduce((sum, item) => sum + item.value, 0);
                                    const percent = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                                    return [`${formatCurrency(value)} (${percent}%)`, name];
                                }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card className="relative" theme={theme}>
                    <div className="flex flex-col justify-between mb-4 border-b pb-2" style={{ borderColor: theme.borderColor }}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg font-cinzel">Cash Flow Trend</h3>
                            <div className="text-xs opacity-60">
                                {cashFlowDate ? cashFlowDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex bg-black/5 rounded p-1 gap-1">
                                <button onClick={() => setCashFlowView('week')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${cashFlowView === 'week' ? 'bg-white shadow text-black' : 'opacity-60 hover:opacity-100'}`}>Week</button>
                                <button onClick={() => setCashFlowView('month')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${cashFlowView === 'month' ? 'bg-white shadow text-black' : 'opacity-60 hover:opacity-100'}`}>Month</button>
                                <button onClick={() => setCashFlowView('6month')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${cashFlowView === '6month' ? 'bg-white shadow text-black' : 'opacity-60 hover:opacity-100'}`}>6 Mo</button>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => shiftCashFlow(-1)} className="p-1.5 rounded hover:bg-black/5 border" style={{ borderColor: theme.borderColor }}><ChevronLeft size={16} /></button>
                                <button onClick={() => shiftCashFlow(1)} className="p-1.5 rounded hover:bg-black/5 border" style={{ borderColor: theme.borderColor }}><ChevronRightIcon size={16} /></button>
                            </div>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer>
                            <BarChart data={trendData}>
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={cashFlowView === 'month' ? 6 : 0} />
                                <YAxis tick={{ fontSize: 10 }} width={40} tickFormatter={(val) => `$${val}`} />
                                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor, borderRadius: '8px' }} />
                                <Bar dataKey="Income" fill={theme.income} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Expense" fill={theme.expense} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div >
    );
};

export default DashboardView;
