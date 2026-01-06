import { get, set, update } from 'idb-keyval';

export const addToQueue = async (text) => {
    await update('scribe_queue', (val) => (val || []).concat({ text, date: new Date().toISOString() }));
};

export const getQueue = async () => {
    return (await get('scribe_queue')) || [];
};

export const removeFromQueue = async (index) => {
    await update('scribe_queue', (val) => {
        const newVal = [...(val || [])];
        newVal.splice(index, 1);
        return newVal;
    });
};

export const DEFAULT_CATEGORIES = [
    { id: 'income', name: 'Income', budget: 0 }, { id: 'savings', name: 'Savings', budget: 500 },
    { id: 'housing', name: 'Housing', budget: 1500 }, { id: 'groceries', name: 'Groceries', budget: 400 },
    { id: 'food', name: 'Food & Dining', budget: 200 }, { id: 'transport', name: 'Transportation', budget: 400 },
    { id: 'utilities', name: 'Utilities', budget: 300 }, { id: 'entertainment', name: 'Entertainment', budget: 200 },
    { id: 'shopping', name: 'Shopping', budget: 300 }, { id: 'health', name: 'Health', budget: 150 },
    { id: 'quest_chest', name: 'Quest Chest', budget: 0 },
    { id: 'misc', name: 'Miscellaneous', budget: 100 }
];

export const THEMES = {
    light: { name: 'light', primary: '#3d5a4a', secondary: '#8b5e3c', bg: '#f4ecd8', cardBg: '#fdfbf2', text: '#4a3a2a', textMuted: '#8c7b65', borderColor: '#dcd2b5', income: '#3d5a4a', expense: '#a05555' },
    dark: { name: 'dark', primary: '#5e8c75', secondary: '#a67b5b', bg: '#1a1d1a', cardBg: '#262926', text: '#e0d8c3', textMuted: '#8f8a7a', borderColor: '#3a403a', income: '#5e8c75', expense: '#c96e6e' }
};

export const CATEGORY_COLORS = {
    housing: '#3b82f6', food: '#ef4444', groceries: '#10b981', transport: '#f59e0b',
    utilities: '#06b6d4', entertainment: '#8b5cf6', shopping: '#ec4899', health: '#14b8a6',
    misc: '#94a3b8', income: '#22c55e', savings: '#059669', reconciliation: '#64748b',
};

export const ACCOUNT_SUBTYPES = {
    checking: 'Checking',
    savings: 'Savings',
    investment: 'Investment',
    tangible: 'Tangible Asset',
    credit_card: 'Credit Card',
    loan: 'Loan',
    cash: 'Cash',
    other: 'Other'
};

export const formatCurrency = (amount, decimals = 2) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);

export const norm = (str) => str ? str.trim().toLowerCase() : '';

export const round = (num) => Math.round((parseFloat(num) || 0) * 100) / 100;
