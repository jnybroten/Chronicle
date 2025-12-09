import React from 'react';
import { Card } from './UIComponents';
import { formatCurrency } from '../utils/helpers';
import { User, ScrollText } from './Icons';

const ReceivablesBoard = ({ transactions, onResolve, theme }) => {
    // Flatten transactions to find all open receivables
    const receivables = transactions.flatMap(t => {
        if (!t.splits) return [];
        return t.splits.map((split, index) => ({ ...split, originalTransaction: t, splitIndex: index }));
    }).filter(s => s.type === 'receivable' && s.status !== 'paid' && s.status !== 'forgiven');

    if (receivables.length === 0) {
        return (
            <Card title="The Bounty Board" subTitle="Outstanding Debts" theme={theme} className="mb-8 opacity-60">
                <div className="flex flex-col items-center justify-center py-8 text-center opacity-50">
                    <ScrollText size={48} className="mb-4" />
                    <div className="font-cinzel font-bold text-xl">No Bounties Posted</div>
                    <p className="text-sm italic mt-2">"All debts are settled... for now."</p>
                </div>
            </Card>
        );
    }

    return (
        <Card title="The Bounty Board" subTitle="Outstanding Debts" theme={theme} className="mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {receivables.map((item, idx) => (
                    <button
                        key={`${item.originalTransaction.id}-${item.splitIndex}`}
                        onClick={() => onResolve(item)}
                        className="relative group text-left transition-transform hover:-translate-y-1"
                    >
                        <div className="absolute inset-0 bg-amber-100 rotate-1 rounded shadow-sm group-hover:rotate-2 transition-transform"></div>
                        <div className="relative bg-[#fdfbf7] p-4 border-2 border-amber-900/20 rounded flex flex-col items-center text-center shadow-md group-hover:shadow-lg transition-shadow" style={{ backgroundImage: 'radial-gradient(#d4c5a5 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                            <div className="w-full border-b-2 border-amber-900/10 pb-2 mb-2">
                                <div className="font-cinzel font-bold text-xl uppercase tracking-widest text-amber-900">Wanted</div>
                            </div>

                            <div className="my-2">
                                <div className="w-16 h-16 bg-amber-200/50 rounded-full flex items-center justify-center border-2 border-amber-900/20 mb-2 mx-auto">
                                    <User size={32} className="text-amber-900/60" />
                                </div>
                                <div className="font-bold text-lg text-amber-900">{item.target}</div>
                                <div className="text-xs font-mono text-amber-800/60">{item.originalTransaction.date.substring(0, 10)}</div>
                            </div>

                            <div className="w-full border-t-2 border-amber-900/10 pt-2 mt-2">
                                <div className="font-cinzel font-bold text-2xl text-amber-900">{formatCurrency(item.amount)}</div>
                                <div className="text-xs italic text-amber-800/60 mt-1 line-clamp-1">{item.note || item.originalTransaction.description}</div>
                            </div>

                            <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                RESOLVE
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </Card>
    );
};

export default ReceivablesBoard;
