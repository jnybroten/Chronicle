import React, { useState, useMemo } from 'react';
import { Modal } from './UIComponents';
import { Search, Save, Trash2, Edit2, X, AlertTriangle } from './Icons';
import { formatCurrency } from '../utils/helpers';

const HistoryManagerModal = ({ isOpen, onClose, history, accountId, theme, onUpdateHistory }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [editValue, setEditValue] = useState('');

    // Filter history for this account
    const accountHistory = useMemo(() => {
        if (!history || !accountId) return [];
        return history
            .filter(h => h.accountBalances && h.accountBalances[accountId] !== undefined)
            .map(h => ({
                id: h.id,
                date: new Date(h.date),
                balance: h.accountBalances[accountId],
                original: h
            }))
            .sort((a, b) => b.date - a.date); // Newest first
    }, [history, accountId]);

    const filteredHistory = useMemo(() => {
        return accountHistory.filter(item => {
            const dateStr = item.date.toLocaleDateString().toLowerCase();
            const valStr = item.balance.toString();
            const term = searchTerm.toLowerCase();
            return dateStr.includes(term) || valStr.includes(term);
        });
    }, [accountHistory, searchTerm]);

    const handleEdit = (item) => {
        setEditingItem(item);
        setEditValue(item.balance);
    };

    const handleSave = () => {
        if (!editingItem) return;
        const newBalance = parseFloat(editValue);
        if (isNaN(newBalance)) return; // Validation

        onUpdateHistory(editingItem.original, accountId, newBalance);
        setEditingItem(null);
        setEditValue('');
    };

    const handleDelete = (item) => {
        // Confirm delete? For now just confirm via simple interaction or direct
        if (window.confirm("Are you sure you want to remove this history point for this account?")) {
            // Pass null or a specific flag to indicate removal from this account's history
            onUpdateHistory(editingItem?.original || item.original, accountId, null);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal title="Account History Data" onClose={onClose} theme={theme}>
            <div className="space-y-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" size={16} />
                        <input
                            type="text"
                            placeholder="Search date or amount..."
                            className="w-full pl-10 p-2 border rounded"
                            style={{ background: theme.bg, color: theme.text, borderColor: theme.borderColor }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto border rounded" style={{ borderColor: theme.borderColor }}>
                    <table className="w-full text-sm text-left">
                        <thead className="sticky top-0 z-10 font-bold uppercase text-xs" style={{ background: theme.cardBg, color: theme.textMuted }}>
                            <tr>
                                <th className="p-3 border-b" style={{ borderColor: theme.borderColor }}>Date</th>
                                <th className="p-3 border-b text-right" style={{ borderColor: theme.borderColor }}>Balance</th>
                                <th className="p-3 border-b text-right" style={{ borderColor: theme.borderColor }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.map(item => (
                                <tr key={item.id} className="border-b last:border-0 hover:bg-black/5 transition-colors group" style={{ borderColor: theme.borderColor }}>
                                    <td className="p-3 font-mono">
                                        {item.date.toLocaleDateString()} <span className="text-[10px] opacity-50 ml-1">{item.date.toLocaleTimeString()}</span>
                                    </td>
                                    <td className="p-3 text-right font-bold">
                                        {editingItem?.id === item.id ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="w-24 p-1 border rounded text-right"
                                                autoFocus
                                            />
                                        ) : (
                                            formatCurrency(item.balance)
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {editingItem?.id === item.id ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={handleSave} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={16} /></button>
                                                <button onClick={() => setEditingItem(null)} className="p-1 text-red-600 hover:bg-red-50 rounded"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDelete(item)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center opacity-50 italic">No history points found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="text-xs p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <div>
                        <strong>Warning:</strong> Editing history logs will recalculate the Net Worth for that specific point in time but will not change your current actual account balance. Use this to fix incorrect historical spikes or drops.
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default HistoryManagerModal;
