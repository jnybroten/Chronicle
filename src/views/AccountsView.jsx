import React, { useMemo } from 'react';
import { Card } from '../components/UIComponents';
import { Bank, CreditCard, Edit2, FileText, ArrowRightLeft, RefreshCw, TrendingUp } from '../components/Icons';
import { ACCOUNT_SUBTYPES, formatCurrency } from '../utils/helpers';


const AccountsView = ({
    accounts, theme, setViewingAccount, setAccountGraphOpen, setEditingAccount,
    setAccountModalOpen, setTransferHistoryOpen, setTransferModalOpen, metrics, setReconcileModalOpen, history
}) => {
    const groupedAssets = useMemo(() => {
        const assets = accounts.filter(a => a.type === 'asset');
        const groups = { cash: [], checking: [], savings: [], investment: [], tangible: [], other: [] };

        assets.forEach(acc => {
            const sub = acc.subtype && groups[acc.subtype] ? acc.subtype : 'other';
            groups[sub].push(acc);
        });

        return groups;
    }, [accounts]);

    const renderAccountCard = (acc) => (
        <Card key={acc.id} className={`relative group transition-all hover:-translate-y-1 hover:shadow-lg overflow-hidden cursor-pointer ${acc.type === 'asset' ? 'hover:ring-2 ring-emerald-500/20' : 'hover:ring-2 ring-red-500/20'}`} theme={theme}>
            <div className="p-6 flex flex-col h-full justify-between min-h-[180px] relative z-10"
                onClick={() => {
                    if (acc.type === 'asset') { setViewingAccount(acc); setAccountGraphOpen(true); }
                    else { setEditingAccount(acc); setAccountModalOpen(true); }
                }}>
                <div className="flex justify-between items-start mb-2">
                    <div className={`p-2 rounded-lg border-2 ${acc.type === 'asset' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
                        {acc.type === 'asset' ? <Bank size={20} /> : <CreditCard size={20} />}
                    </div>
                    <div className="text-[10px] uppercase font-bold opacity-50 border px-1.5 py-0.5 rounded tracking-wider">
                        {ACCOUNT_SUBTYPES[acc.subtype] || 'Other'}
                    </div>
                </div>
                <div className="flex-1 mt-2"><h3 className="text-lg font-bold font-cinzel whitespace-normal break-words leading-tight">{acc.name}</h3></div>
                <div className="mt-4 pt-4 pb-6 border-t border-dashed flex justify-between items-end" style={{ borderColor: theme.borderColor }}>
                    <div className="text-xl font-bold">{formatCurrency(acc.balance)}</div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setEditingAccount(acc); setAccountModalOpen(true); }} className="p-1.5 hover:bg-black/5 rounded" title="Edit"><Edit2 size={14} /></button>
                    </div>
                </div>
            </div>
        </Card>
    );

    const renderGroup = (key, list) => {
        if (list.length === 0) return null;
        return (
            <div key={key} className="space-y-3 mb-6">
                <h4 className="text-sm font-bold uppercase tracking-widest opacity-60 border-b pb-1" style={{ borderColor: theme.borderColor }}>{ACCOUNT_SUBTYPES[key]}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {list.map(renderAccountCard)}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold font-cinzel" style={{ color: theme.text }}>Accounts</h2>
                <div className="flex gap-2">
                    <button onClick={() => setTransferHistoryOpen(true)} className="px-3 py-2 rounded border-2 border-dashed font-bold text-xs flex items-center gap-2 hover:bg-black/5 transition-colors" style={{ borderColor: theme.borderColor, color: theme.textMuted }}>
                        <FileText size={16} /> History
                    </button>
                    <button onClick={() => setReconcileModalOpen(true)} className="px-3 py-2 rounded border-2 border-dashed font-bold text-xs flex items-center gap-2 hover:bg-black/5 transition-colors" style={{ borderColor: theme.borderColor, color: theme.textMuted }}>
                        <RefreshCw size={16} /> Reconcile
                    </button>
                    <button onClick={() => setTransferModalOpen(true)} className="old-book-btn px-4 py-2 rounded font-bold text-xs flex items-center gap-2">
                        <ArrowRightLeft size={16} /> Transfer Funds
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-4 sm:p-6 text-center" theme={theme}>
                    <div className="text-sm font-bold uppercase tracking-wider opacity-70">Net Worth</div>
                    <div className={`font-bold font-cinzel mt-2 whitespace-nowrap overflow-hidden text-ellipsis ${String(Math.ceil(metrics.netWorth)).length > 9 ? 'text-lg' : String(Math.ceil(metrics.netWorth)).length > 7 ? 'text-xl' : 'text-3xl'}`}>
                        {formatCurrency(Math.ceil(metrics.netWorth), 0)}
                    </div>
                </Card>
                <Card className="p-4 sm:p-6 text-center" theme={theme}>
                    <div className="text-sm font-bold uppercase tracking-wider opacity-70">Assets</div>
                    <div className={`font-bold font-cinzel mt-2 text-emerald-600 whitespace-nowrap overflow-hidden text-ellipsis ${String(Math.ceil(metrics.assets)).length > 9 ? 'text-lg' : String(Math.ceil(metrics.assets)).length > 7 ? 'text-xl' : 'text-3xl'}`}>
                        {formatCurrency(Math.ceil(metrics.assets), 0)}
                    </div>
                </Card>
                <Card className="p-4 sm:p-6 text-center" theme={theme}>
                    <div className="text-sm font-bold uppercase tracking-wider opacity-70">Liabilities</div>
                    <div className={`font-bold font-cinzel mt-2 text-red-600 whitespace-nowrap overflow-hidden text-ellipsis ${String(Math.ceil(metrics.liabilities)).length > 9 ? 'text-lg' : String(Math.ceil(metrics.liabilities)).length > 7 ? 'text-xl' : 'text-3xl'}`}>
                        {formatCurrency(Math.ceil(metrics.liabilities), 0)}
                    </div>
                </Card>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold font-cinzel border-b-2 pb-2" style={{ borderColor: theme.borderColor, color: '#10b981' }}>Assets</h3>
                {renderGroup('cash', groupedAssets.cash)}
                {renderGroup('checking', groupedAssets.checking)}
                {renderGroup('savings', groupedAssets.savings)}
                {renderGroup('investment', groupedAssets.investment)}
                {renderGroup('tangible', groupedAssets.tangible)}
                {renderGroup('other', groupedAssets.other)}

                {Object.values(groupedAssets).every(arr => arr.length === 0) && (
                    <div className="text-center opacity-50 italic py-8">No assets recorded.</div>
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold font-cinzel border-b-2 pb-2" style={{ borderColor: theme.borderColor, color: '#ef4444' }}>Liabilities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accounts.filter(a => a.type === 'liability').map(renderAccountCard)}
                </div>
                {accounts.filter(a => a.type === 'liability').length === 0 && (
                    <div className="text-center opacity-50 italic py-8">No liabilities recorded.</div>
                )}
            </div>
        </div>
    );
};

export default AccountsView;
