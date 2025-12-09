import React, { useState, useMemo } from 'react';
import { Search, Plus, X } from './Icons';

const HybridTagSelector = ({ selectedTags, onChange, allTags, theme }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Get top 20 most frequent tags (assuming allTags is already sorted or just take first 20)
    // In a real scenario, we might want to pass frequency data, but for now we'll assume the list passed is relevant.
    const quickTags = useMemo(() => allTags.slice(0, 20), [allTags]);

    const filteredTags = useMemo(() => {
        if (!searchTerm) return [];
        return allTags.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()) && !selectedTags.includes(t));
    }, [allTags, searchTerm, selectedTags]);

    const handleAddTag = (tag) => {
        if (!selectedTags.includes(tag)) {
            onChange([...selectedTags, tag]);
        }
        setSearchTerm('');
    };

    const handleRemoveTag = (tag) => {
        onChange(selectedTags.filter(t => t !== tag));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm) {
            e.preventDefault();
            handleAddTag(searchTerm.trim());
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {selectedTags.map(tag => (
                    <span key={tag} className="px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 border" style={{ backgroundColor: theme.primary + '20', borderColor: theme.primary, color: theme.primary }}>
                        #{tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500"><X size={12} /></button>
                    </span>
                ))}
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search sigils or type new..."
                    className="w-full pl-9 p-2 old-book-input rounded text-sm outline-none"
                    style={{ '--tw-ring-color': theme.primary }}
                />
                {filteredTags.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 max-h-40 overflow-y-auto rounded border shadow-lg animate-in fade-in zoom-in-95 duration-100" style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}>
                        {filteredTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => handleAddTag(tag)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 transition-colors flex items-center gap-2"
                            >
                                <span className="opacity-60">#</span>{tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold opacity-50 tracking-wider">Quick Stamps</div>
                <div className="flex flex-wrap gap-1.5">
                    {quickTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => handleAddTag(tag)}
                            disabled={selectedTags.includes(tag)}
                            className={`px-2 py-1 rounded border text-[10px] transition-all ${selectedTags.includes(tag) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 hover:border-gray-400'}`}
                            style={{ borderColor: theme.borderColor }}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HybridTagSelector;
