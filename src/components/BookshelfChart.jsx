import { useState, useMemo } from 'react';
import { formatCurrency, round } from '../utils/helpers';

const BookshelfChart = ({ history, accounts, currentAssets, currentLiabilities, theme }) => {
    const today = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const dStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const dEnd = new Date(today.getFullYear(), today.getMonth(), 1);

    const [startMonth, setStartMonth] = useState(fmt(dStart));
    const [endMonth, setEndMonth] = useState(fmt(dEnd));

    const dataGroups = useMemo(() => {
        const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
        const runningBalances = {};
        accounts.forEach(acc => { runningBalances[acc.id] = 0; });

        const [sY, sM] = startMonth.split('-').map(Number);
        const startTime = new Date(sY, sM - 1, 1).getTime();

        sortedHistory.forEach(h => {
            if (new Date(h.date).getTime() < startTime) {
                if (h.accountBalances) {
                    Object.entries(h.accountBalances).forEach(([id, val]) => {
                        runningBalances[id] = val;
                    });
                }
            }
        });

        const groups = [];
        const [eY, eM] = endMonth.split('-').map(Number);
        const start = new Date(sY, sM - 1, 1);
        const end = new Date(eY, eM - 1, 1);

        let current = new Date(start);
        let safety = 0;

        while (current <= end && safety < 100) {
            safety++;
            const year = current.getFullYear();
            const month = current.getMonth();
            const now = new Date();
            const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

            const group = {
                monthName: current.toLocaleString('default', { month: 'short' }).toUpperCase(),
                yearLabel: current.toLocaleString('default', { year: '2-digit' }),
                points: []
            };

            const startOfMonth = new Date(year, month, 1, 0, 0, 0);
            const midMonth = new Date(year, month, 14, 23, 59, 59);
            const startSecondHalf = new Date(year, month, 15, 0, 0, 0);
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

            const processBlock = (blockStart, blockEnd, label, type) => {
                const pointsInBlock = sortedHistory.filter(h => {
                    const d = new Date(h.date);
                    return d >= blockStart && d <= blockEnd;
                });

                const blockSums = {};
                const blockCounts = {};

                pointsInBlock.forEach(h => {
                    if (h.accountBalances) {
                        Object.entries(h.accountBalances).forEach(([id, val]) => {
                            if (!blockSums[id]) { blockSums[id] = 0; blockCounts[id] = 0; }
                            blockSums[id] += val;
                            blockCounts[id]++;
                        });
                    }
                });

                Object.keys(blockSums).forEach(id => {
                    runningBalances[id] = round(blockSums[id] / blockCounts[id]);
                });

                let totalAssets = 0;
                let totalLiabilities = 0;
                accounts.forEach(acc => {
                    const val = runningBalances[acc.id] || 0;
                    if (acc.type === 'asset') totalAssets += val;
                    else totalLiabilities += val;
                });
                const isPast = blockEnd < now;
                const val = isPast ? totalAssets : (totalAssets - totalLiabilities);
                group.points.push({ label, type, value: round(val) });
            };

            if (midMonth <= now || (midMonth > now && isCurrentMonth)) {
                processBlock(startOfMonth, midMonth, '14th', 'mid');
            }
            if (endOfMonth <= now || (endOfMonth > now && isCurrentMonth)) {
                const isFuture = endOfMonth > now;
                processBlock(startSecondHalf, endOfMonth, isFuture ? 'Now' : 'End', isFuture ? 'now' : 'end');
            }
            if (group.points.length > 0) groups.push(group);
            current.setMonth(current.getMonth() + 1);
        }
        return groups;
    }, [startMonth, endMonth, history, accounts, currentAssets, currentLiabilities]);

    const allValues = dataGroups.flatMap(g => g.points.map(p => p.value));
    const minVal = Math.min(...allValues, 0);
    const maxVal = Math.max(...allValues, minVal + 1);
    const range = maxVal - minVal || 1;
    const BOOK_COLORS = ['#7f1d1d', '#1e3a8a', '#14532d', '#451a03', '#581c87', '#3f6212'];
    let globalIndex = 0;

    return (
        <div className="w-full">
            <div className="flex flex-wrap sm:flex-nowrap justify-end gap-2 sm:gap-4 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-70 w-full sm:w-auto justify-between sm:justify-start">
                    <label>From:</label>
                    <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="bg-transparent border-b-2 outline-none cursor-pointer font-cinzel w-32 sm:w-auto" style={{ borderColor: theme.secondary, color: theme.text }} />
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-70 w-full sm:w-auto justify-between sm:justify-start">
                    <label>To:</label>
                    <input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="bg-transparent border-b-2 outline-none cursor-pointer font-cinzel w-32 sm:w-auto" style={{ borderColor: theme.secondary, color: theme.text }} />
                </div>
            </div>
            <div className="relative w-full h-64 sm:h-80 px-4 sm:px-8">
                <div className="absolute bottom-10 left-0 right-0 h-4 bg-[#5D4037] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] rounded-sm z-10"></div>
                <div className="absolute bottom-6 left-[-4px] right-[-4px] h-6 bg-[#3E2723] rounded-sm shadow-2xl z-0"></div>
                {dataGroups.length === 0 ? (
                    <div className="w-full text-center pb-20 opacity-50 text-sm italic pt-32">Record more history to populate the library.</div>
                ) : (
                    <div className="flex items-end justify-center w-full h-full gap-2 overflow-x-auto scrollbar-hide relative z-20">
                        {dataGroups.map((group, gIndex) => (
                            <div key={gIndex} className="relative flex flex-col items-center justify-end h-full flex-1 min-w-[50px] max-w-[80px]">
                                <div className="flex items-end justify-center w-full flex-1 gap-0 mb-14 shadow-lg">
                                    {group.points.map((item, pIndex) => {
                                        const heightPercent = 20 + ((item.value - minVal) / range) * 80;
                                        const color = BOOK_COLORS[globalIndex % BOOK_COLORS.length];
                                        globalIndex++;
                                        const isMidMonth = item.type === 'mid';
                                        return (
                                            <div key={pIndex} className="group relative flex-1 w-full min-w-[12px] transition-all duration-300 hover:-translate-y-2 hover:z-20 cursor-pointer flex items-end" style={{ height: `${heightPercent}%` }}>
                                                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#1a1a1a]/95 backdrop-blur-md text-[#e5e5e5] px-2 py-1.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 text-[10px] sm:text-xs border border-[#4a4a4a]">
                                                    <div className="font-cinzel text-amber-500 font-bold">{group.monthName} {item.label}</div>
                                                    <div className="font-mono border-t border-white/10 mt-1 pt-0.5">{formatCurrency(item.value)}</div>
                                                </div>
                                                <div className={`w-full h-full relative shadow-md border-t border-white/5 overflow-hidden ${pIndex === 0 ? 'rounded-tl-sm border-l border-white/10' : ''} ${pIndex === group.points.length - 1 ? 'rounded-tr-sm border-r border-black/30' : 'border-r border-black/20'}`} style={{ backgroundColor: color, backgroundImage: isMidMonth ? 'linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.05) 75%, transparent 75%, transparent)' : 'none', backgroundSize: isMidMonth ? '4px 4px' : 'auto', boxShadow: 'inset 2px 0 5px rgba(255,255,255,0.1), inset -2px 0 5px rgba(0,0,0,0.3)' }}>
                                                    <div className="absolute inset-0 flex flex-col justify-center items-center z-10 opacity-70 pointer-events-none pb-2">
                                                        <span className="font-cinzel text-[10px] sm:text-xs font-bold text-yellow-100/90 tracking-widest whitespace-nowrap drop-shadow-sm" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>{group.monthName}</span>
                                                        <span className="absolute bottom-1 font-cinzel text-[8px] sm:text-[9px] font-bold text-yellow-100/60 tracking-widest">'{group.yearLabel}</span>
                                                    </div>
                                                    <div className="absolute top-4 left-0 right-0 h-[1px] bg-yellow-500/40 shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div>
                                                    <div className="absolute bottom-8 left-0 right-0 h-[1px] bg-yellow-500/40 shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div>
                                                    <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 pointer-events-none"></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookshelfChart;
