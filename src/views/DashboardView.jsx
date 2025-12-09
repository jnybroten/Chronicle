import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Card, KPICard, MonthSelector } from '../components/UIComponents';
import BookshelfChart from '../components/BookshelfChart';
import { ChevronLeft, ChevronRightIcon } from '../components/Icons';
import { CATEGORY_COLORS, formatCurrency } from '../utils/helpers';

const DashboardView = ({
    selectedMonth, setSelectedMonth, setViewAllTime, theme = {}, metrics, history, accounts,
    categoryPieData, cashFlowDate, cashFlowView, setCashFlowView, shiftCashFlow, trendData,
    transactions, onResolveDebt // Added props
}) => {
    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
                <MonthSelector currentMonth={selectedMonth} onChange={(m) => { setSelectedMonth(m); setViewAllTime(false); }} theme={theme} />
            </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Monthly Spending" subTitle="By Category" theme={theme}>
                    <div className="h-64 w-full">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={categoryPieData} innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => { const displayName = name === 'quest_chest' ? 'Quest' : name; return `${displayName} ${(percent * 100).toFixed(0)}%`; }}>
                                    {categoryPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || theme.textMuted} />)}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
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
