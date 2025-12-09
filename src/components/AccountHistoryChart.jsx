import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatCurrency } from '../utils/helpers';

const AccountHistoryChart = ({ transactions = [], transfers = [], accountId, theme, currentBalance, history = [] }) => {
    const [timeRange, setTimeRange] = useState('all'); // '1m', '3m', '6m', '1y', 'all'

    const processedData = useMemo(() => {
        if (!accountId) return [];

        // Helper to consistently get YYYY-MM-DD from a Date object (Local Time)
        const getLocalYMD = (date) => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        // Helper to extract YYYY-MM-DD from an ISO string or Date string
        const normalizeDateKey = (dateStr) => {
            if (!dateStr) return '';
            return dateStr.substring(0, 10);
        };

        // 1. Identify all events for this account
        const relevantTrans = transactions.filter(t => t.accountId === accountId);
        const relevantTransfersIn = transfers.filter(t => t.toAccount === accountId);
        const relevantTransfersOut = transfers.filter(t => t.fromAccount === accountId);

        // 2. Map to daily changes
        const dailyChanges = {};

        const addChange = (dateStr, amount) => {
            const dateKey = normalizeDateKey(dateStr);
            dailyChanges[dateKey] = (dailyChanges[dateKey] || 0) + amount;
        };

        relevantTrans.forEach(t => {
            // Income adds to balance (if we are looking forward), 
            // but for backward calc: Balance_Before = Balance_After - Change.
            // Change = +Amount for Income, -Amount for Expense.
            const sign = t.type === 'income' ? 1 : -1;
            addChange(t.date, t.amount * sign);
        });

        relevantTransfersIn.forEach(t => {
            addChange(t.date, t.amount); // Incoming transfer adds to balance
        });

        relevantTransfersOut.forEach(t => {
            addChange(t.date, -t.amount); // Outgoing transfer subtracts from balance
        });

        const hasActivity = Object.keys(dailyChanges).length > 0;

        // FALLBACK: If no transaction activity found for this account (legacy data?), use History snapshots
        if (!hasActivity && history && history.length > 0) {
            const historyPoints = history
                .filter(h => h.accountBalances && h.accountBalances[accountId] !== undefined)
                .map(h => {
                    const d = new Date(h.date);
                    return {
                        date: d.getTime(),
                        balance: parseFloat(h.accountBalances[accountId]),
                        displayDate: d.toLocaleDateString()
                    };
                })
                .sort((a, b) => a.date - b.date);

            if (historyPoints.length > 0) {
                // Filter by timeRange
                const cutOffDate = new Date();
                cutOffDate.setHours(0, 0, 0, 0);
                if (timeRange === '1m') cutOffDate.setMonth(cutOffDate.getMonth() - 1);
                else if (timeRange === '3m') cutOffDate.setMonth(cutOffDate.getMonth() - 3);
                else if (timeRange === '6m') cutOffDate.setMonth(cutOffDate.getMonth() - 6);
                else if (timeRange === '1y') cutOffDate.setFullYear(cutOffDate.getFullYear() - 1);
                else cutOffDate.setTime(0); // All time

                return historyPoints.filter(p => p.date >= cutOffDate.getTime());
            }
        }

        // 3. Determine Date Range
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today (Local)

        // Find earliest date from data
        let minDate = new Date(today);
        Object.keys(dailyChanges).forEach(d => {
            const parts = d.split('-');
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            if (date < minDate) minDate = date;
        });

        // Cap min date based on selected TimeRange
        let rangeStartDate = new Date();
        rangeStartDate.setHours(0, 0, 0, 0);

        if (timeRange === '1m') rangeStartDate.setMonth(today.getMonth() - 1);
        else if (timeRange === '3m') rangeStartDate.setMonth(today.getMonth() - 3);
        else if (timeRange === '6m') rangeStartDate.setMonth(today.getMonth() - 6);
        else if (timeRange === '1y') rangeStartDate.setFullYear(today.getFullYear() - 1);
        else rangeStartDate = minDate; // 'all'

        if (rangeStartDate < minDate) rangeStartDate = minDate;

        // 4. Backward Calculation
        const points = [];
        let runningBalance = parseFloat(currentBalance);

        // We iterate from Today backwards to rangeStartDate
        const currentIterDate = new Date(today);

        // Prevent infinite loop in case of bad dates
        let safeguard = 0;

        while (currentIterDate >= rangeStartDate && safeguard < 5000) {
            const dateKey = getLocalYMD(currentIterDate);

            // Point for "End of Day"
            points.push({
                date: currentIterDate.getTime(),
                balance: runningBalance,
                displayDate: currentIterDate.toLocaleDateString()
            });

            // Apply reverse change to get "End of Yesterday" (Start of Today)
            const change = dailyChanges[dateKey] || 0;
            runningBalance = runningBalance - change;

            // Move to yesterday
            currentIterDate.setDate(currentIterDate.getDate() - 1);
            safeguard++;
        }

        return points.reverse();
    }, [transactions, transfers, accountId, timeRange, currentBalance, history]);

    const ranges = [
        { label: '1M', value: '1m' },
        { label: '3M', value: '3m' },
        { label: '6M', value: '6m' },
        { label: '1Y', value: '1y' },
        { label: 'All', value: 'all' },
    ];

    if (processedData.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-2">
                <div className="italic">Not enough data to graph.</div>
            </div>
        );
    }

    const minVal = Math.min(...processedData.map(d => d.balance));
    const maxVal = Math.max(...processedData.map(d => d.balance));
    const padding = (maxVal - minVal) * 0.1 || 100;

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
                <div className="text-xs font-bold uppercase opacity-60">Balance History (Computed)</div>
                <div className="flex bg-black/5 rounded p-1 gap-1">
                    {ranges.map(r => (
                        <button
                            key={r.value}
                            onClick={() => setTimeRange(r.value)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${timeRange === r.value ? 'bg-white shadow text-black' : 'opacity-60 hover:opacity-100'}`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={processedData}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={theme.primary || '#10b981'} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={theme.primary || '#10b981'} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.borderColor || '#e5e7eb'} opacity={0.5} />
                        <XAxis
                            dataKey="date"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            scale="time"
                            tick={{ fontSize: 10, fill: theme.textMuted }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                            tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                        />
                        <YAxis
                            domain={[minVal - padding, maxVal + padding]}
                            tick={{ fontSize: 10, fill: theme.textMuted }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `$${val}`}
                            width={50}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: theme.cardBg,
                                borderColor: theme.borderColor,
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            formatter={(value) => [formatCurrency(value), 'Balance']}
                            labelStyle={{ color: theme.textMuted, fontSize: '12px', marginBottom: '4px' }}
                            labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        />
                        <Area
                            type="stepAfter"
                            dataKey="balance"
                            stroke={theme.primary || '#10b981'}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorBalance)"
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default AccountHistoryChart;
