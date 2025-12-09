import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { GoogleGenerativeAI } from '@google/generative-ai';
import firebase, { auth, db, googleProvider } from './lib/firebase';
import AccountHistoryChart from './components/AccountHistoryChart';
import HistoryManagerModal from './components/HistoryManagerModal';
import { LayoutDashboard, Target, ArrowRightLeft, Bank, Settings, Moon, ChevronRightIcon, User, LogOut, Trash2, Plus, X, Menu, Sparkles, Mic, LongFeather, Search, Filter, Download, Repeat, Edit2, ChevronLeft, ArrowRight, ScrollText, ChevronDown } from './components/Icons';
import { Modal, SidebarItem, Card, MonthSelector } from './components/UIComponents';
import HybridTagSelector from './components/HybridTagSelector';
import DashboardView from './views/DashboardView';
import BudgetView from './views/BudgetView';
import LedgerView from './views/LedgerView';
import AccountsView from './views/AccountsView';
import ReceivablesView from './views/ReceivablesView';
import ErrorBoundary from './components/ErrorBoundary';
import { DEFAULT_CATEGORIES, THEMES, formatCurrency, norm, addToQueue, getQueue, removeFromQueue } from './utils/helpers';
import customQuill from './assets/custom_quill.png';
import sealImg from './assets/seal.png';

const ChronicleApp = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const currentView = useMemo(() => {
        const path = location.pathname.substring(1);
        return path || 'dashboard';
    }, [location]);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [logoUrl, setLogoUrl] = useState(sealImg);
    const [quillUrl, setQuillUrl] = useState(customQuill);
    const [permissionError, setPermissionError] = useState(false);
    const [rawTransactions, setRawTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [history, setHistory] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [monthlyBudgets, setMonthlyBudgets] = useState({});
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    const [historyManagerOpen, setHistoryManagerOpen] = useState(false);

    const [transactionModalOpen, setTransactionModalOpen] = useState(false);
    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [scribeModalOpen, setScribeModalOpen] = useState(false);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
    const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [repaymentModalOpen, setRepaymentModalOpen] = useState(false);
    const [accountGraphOpen, setAccountGraphOpen] = useState(false);
    const [transferHistoryOpen, setTransferHistoryOpen] = useState(false);
    const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
    const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
    const [reconcileAccount, setReconcileAccount] = useState(null);

    const [editingTransaction, setEditingTransaction] = useState(null);
    const [editingAccount, setEditingAccount] = useState(null);
    const [viewingAccount, setViewingAccount] = useState(null);
    const [selectedDebt, setSelectedDebt] = useState(null);

    // Derived state
    const transactions = useMemo(() => rawTransactions.map(t => ({ ...t, amount: parseFloat(t.amount) })), [rawTransactions]);

    const [appId, setAppId] = useState(localStorage.getItem('chronicle_app_id') || 'chronicle_v1');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedTags, setSelectedTags] = useState([]);

    const [isSplitMode, setIsSplitMode] = useState(false);
    const [isRecurringMode, setIsRecurringMode] = useState(false);
    const [splitRows, setSplitRows] = useState([]);
    const [filterTag, setFilterTag] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [defaultAccountId, setDefaultAccountId] = useState('');

    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterMinAmount, setFilterMinAmount] = useState('');
    const [filterMaxAmount, setFilterMaxAmount] = useState('');
    const [sortBy, setSortBy] = useState('date-desc');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [viewAllTime, setViewAllTime] = useState(false);

    const [createMenuOpen, setCreateMenuOpen] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [graphViewMode, setGraphViewMode] = useState('all');
    const [graphDate, setGraphDate] = useState(new Date().toISOString().slice(0, 7));
    const [graphYear, setGraphYear] = useState(new Date().getFullYear().toString());

    const [cashFlowView, setCashFlowView] = useState('6month');
    const [cashFlowDate, setCashFlowDate] = useState(new Date());

    const [expandedBudgetCategory, setExpandedBudgetCategory] = useState(null);
    const [budgetSortOrder, setBudgetSortOrder] = useState('amount');

    const [editingSubscription, setEditingSubscription] = useState(null);
    const [editingBudget, setEditingBudget] = useState(null);

    const [scribeInput, setScribeInput] = useState('');
    const [scribePreview, setScribePreview] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [isProcessingScribe, setIsProcessingScribe] = useState(false);
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [testScribeResult, setTestScribeResult] = useState(null);

    const [notification, setNotification] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const theme = darkMode ? THEMES.dark : THEMES.light;

    // Firebase Helpers
    const getSubColl = (uid, sub) => db.collection('artifacts').doc(appId).collection('users').doc(uid).collection(sub);
    const showToast = (type, msg) => { setNotification({ type, message: msg }); setTimeout(() => setNotification(null), 3000); };
    const updateDoc = (ref, data) => ref.update(data);
    const doc = (dbInstance, ...pathSegments) => {
        const path = pathSegments.join('/');
        if (!path) return dbInstance.doc();
        return dbInstance.doc(path);
    };
    const setDoc = async (ref, data, options) => {
        if (options && options.merge) return ref.set(data, { merge: true });
        return ref.set(data);
    };
    const deleteDoc = (ref) => ref.delete();
    const writeBatch = (dbInstance) => dbInstance.batch();
    const getDoc = (ref) => ref.get();

    useEffect(() => {
        auth.onAuthStateChanged(async (u) => {
            if (u) { setUser(u); } else { await auth.signInAnonymously(); }
        });
        const storedKey = localStorage.getItem('chronicle_gemini_key');
        if (storedKey) setGeminiApiKey(storedKey);

        const handleOnline = async () => {
            setIsOnline(true);
            showToast('success', 'Back Online. Processing Queue...');
            const queue = await getQueue();
            if (queue.length > 0) {
                for (let i = 0; i < queue.length; i++) {
                    await handleScribeRequest(queue[i].text, true); // Pass true to skip queue check
                    await removeFromQueue(i);
                }
                showToast('success', 'Offline Queue Processed');
            }
        };
        const handleOffline = () => { setIsOnline(false); showToast('error', 'You are offline. Scribe requests will be queued.'); };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const handleAuthError = (err) => { if (err.code === 'permission-denied') setPermissionError(true); };
        const unsubT = getSubColl(user.uid, 'transactions').onSnapshot(s => setRawTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleAuthError);
        const unsubA = getSubColl(user.uid, 'accounts').onSnapshot(s => setAccounts(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleAuthError);
        const unsubSub = getSubColl(user.uid, 'subscriptions').onSnapshot(s => setSubscriptions(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleAuthError);
        const unsubH = getSubColl(user.uid, 'history').orderBy('date', 'asc').onSnapshot(s => setHistory(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleAuthError);

        const unsubTr = getSubColl(user.uid, 'transfers').orderBy('date', 'desc').onSnapshot(s => setTransfers(s.docs.map(d => ({ id: d.id, ...d.data() }))), handleAuthError);

        const unsubMB = getSubColl(user.uid, 'monthly_budgets').onSnapshot(s => {
            const map = {};
            s.docs.forEach(d => map[d.id] = d.data());
            setMonthlyBudgets(map);
        }, handleAuthError);

        const unsubC = getSubColl(user.uid, 'categories').onSnapshot(s => {
            if (s.empty && !permissionError) {
                const batch = db.batch();
                DEFAULT_CATEGORIES.forEach(cat => {
                    batch.set(doc(getSubColl(user.uid, 'categories'), cat.id), cat);
                });
                batch.commit().catch(handleAuthError);
                setCategories(DEFAULT_CATEGORIES);
            } else if (!s.empty) {
                const loadedCategories = s.docs.map(d => ({ id: d.id, ...d.data() }));
                setCategories(loadedCategories);
                if (!loadedCategories.find(c => c.id === 'quest_chest')) {
                    setDoc(doc(getSubColl(user.uid, 'categories'), 'quest_chest'), {
                        id: 'quest_chest',
                        name: 'Quest Chest',
                        budget: 0
                    }, { merge: true });
                }
            }
        }, handleAuthError);

        getDoc(doc(getSubColl(user.uid, 'settings'), 'config')).then(snap => {
            if (snap.exists) {
                const data = snap.data();
                if (data.darkMode !== undefined) setDarkMode(data.darkMode);
                if (data.logoUrl) setLogoUrl(data.logoUrl);
                if (data.quillUrl) setQuillUrl(data.quillUrl);
                if (data.defaultAccountId) setDefaultAccountId(data.defaultAccountId);
            }
        });

        return () => { unsubT(); unsubA(); unsubC(); unsubSub(); unsubH(); unsubMB(); unsubTr(); };
    }, [user, permissionError, appId]);

    const recordHistorySnapshot = async (modifiedAccountsInput = null) => {
        if (!user) return;
        const mods = Array.isArray(modifiedAccountsInput) ? modifiedAccountsInput : (modifiedAccountsInput ? [modifiedAccountsInput] : []);
        const currentAccounts = accounts.map(a => {
            const mod = mods.find(m => m.id === a.id);
            if (mod) { return { ...a, ...mod }; }
            return a;
        });

        const assets = currentAccounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
        const liabilities = currentAccounts.filter(a => a.type === 'liability').reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
        const netWorth = assets - liabilities;

        const snapshot = {
            date: new Date().toISOString(),
            accountBalances: currentAccounts.reduce((acc, a) => ({ ...acc, [a.id]: parseFloat(a.balance) || 0 }), {}),
            totalAssets: assets,
            totalLiabilities: liabilities,
            netWorth: netWorth
        };
        await addToQueue({ type: 'history_snapshot', data: snapshot });
    };







    const getEffectiveBudget = (categoryId, month) => {
        const cat = categories.find(c => c.id === categoryId);
        const baseBudget = cat ? (cat.budget || 0) : 0;
        if (!monthlyBudgets[month]) return baseBudget;
        return monthlyBudgets[month][categoryId] !== undefined ? monthlyBudgets[month][categoryId] : baseBudget;
    };

    const lockMonth = async (month, batchInstance = null) => {
        if (monthlyBudgets[month]) return;
        const budgetSnapshot = {};
        categories.forEach(c => budgetSnapshot[c.id] = c.budget || 0);
        const ref = doc(getSubColl(user.uid, 'monthly_budgets'), month);
        if (batchInstance) {
            batchInstance.set(ref, budgetSnapshot, { merge: true });
        } else {
            const snap = await getDoc(ref);
            if (!snap.exists) {
                await setDoc(ref, budgetSnapshot);
            }
        }
    };

    useEffect(() => {
        if (!user || subscriptions.length === 0) return;

        const processSubscriptions = async () => {
            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const batch = db.batch();
            let processedCount = 0;

            const txMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
            if (!monthlyBudgets[txMonthStr]) {
                const budgetSnapshot = {};
                categories.forEach(c => budgetSnapshot[c.id] = c.budget || 0);
                batch.set(doc(getSubColl(user.uid, 'monthly_budgets'), txMonthStr), budgetSnapshot, { merge: true });
            }

            subscriptions.forEach(sub => {
                if (currentDay >= sub.dayOfMonth) {
                    const lastProc = sub.lastProcessed ? new Date(sub.lastProcessed) : null;
                    const alreadyProcessedThisMonth = lastProc && lastProc.getMonth() === currentMonth && lastProc.getFullYear() === currentYear;
                    if (!alreadyProcessedThisMonth) {
                        const txDate = new Date(currentYear, currentMonth, sub.dayOfMonth);
                        const newTxRef = doc(getSubColl(user.uid, 'transactions'));
                        batch.set(newTxRef, {
                            description: sub.name, amount: sub.amount, type: 'expense', category: sub.category,
                            date: txDate.toISOString(), tags: sub.tags && sub.tags.length > 0 ? sub.tags : ['subscription'], isRecurring: true, createdAt: new Date().toISOString()
                        });
                        batch.update(doc(getSubColl(user.uid, 'subscriptions'), sub.id), { lastProcessed: txDate.toISOString() });
                        processedCount++;
                    }
                }
            });

            if (processedCount > 0) { await batch.commit(); showToast('success', `Auto-recorded ${processedCount} subscription(s)`); }
        };

        processSubscriptions();
    }, [user, subscriptions, categories, monthlyBudgets]);

    const [transactionAmount, setTransactionAmount] = useState(0);


    useEffect(() => {
        if (editingTransaction) {
            setTransactionAmount(editingTransaction.amount);
            if (editingTransaction.splits && editingTransaction.splits.length > 0) {
                setIsSplitMode(true);
                setSplitRows(editingTransaction.splits);
            } else {
                setSplitRows([]);
            }
            if (editingTransaction.tags) {
                setSelectedTags(editingTransaction.tags);
            } else {
                setSelectedTags([]);
            }
            setConfirmDelete(false);
            setIsRecurringMode(!!editingTransaction.isRecurring);
        } else {
            setTransactionAmount(0);
            setIsSplitMode(false);
            setIsRecurringMode(false);
            setSplitRows([]);
            setSelectedTags([]);
        }
    }, [editingTransaction]);

    const allTags = useMemo(() => {
        const tags = new Set();
        transactions.forEach(t => {
            if (t.tags && Array.isArray(t.tags)) {
                t.tags.forEach(tag => tags.add(tag));
            }
        });
        return Array.from(tags).sort();
    }, [transactions]);

    const findAccount = (name) => {
        const n = norm(name);
        return accounts.find(a => norm(a.name) === n);
    };

    const addSplitRow = () => {
        setSplitRows([...splitRows, { id: Date.now(), amount: 0, category: 'misc', type: 'expense', note: '' }]);
    };

    const removeSplitRow = (id) => {
        setSplitRows(splitRows.filter(r => r.id !== id));
    };

    const updateSplitRow = (id, field, value) => {
        setSplitRows(splitRows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        try {
            if (!user) return;
            const fd = new FormData(e.target);

            const amount = parseFloat(transactionAmount);
            const date = fd.get('date');
            const description = fd.get('description');
            const type = fd.get('type') || 'expense';
            const category = fd.get('category') || 'split';
            const accountId = fd.get('accountId'); // Get selected account
            const isRecurring = fd.get('isRecurring') === 'on';

            if (isSplitMode) {
                const splitTotal = splitRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                if (Math.abs(splitTotal - amount) > 0.02) {
                    showToast('error', `Split total (${splitTotal.toFixed(2)}) does not match transaction amount (${amount.toFixed(2)})`);
                    return;
                }
                // Removed strict validation blocking submission
                // for (const row of splitRows) {
                //     if (row.category === 'receivable' && !row.target?.trim() && row.note !== 'Remaining Balance') {
                //         showToast('error', `Missing Target for receivable item with amount ${row.amount}`);
                //         return;
                //     }
                // }
            }

            const cleanedSplits = isSplitMode ? splitRows.map(r => ({
                ...r,
                amount: parseFloat(r.amount),
                target: ((r.category === 'receivable' || r.category === 'payable') && !r.target?.trim()) ? 'Unassigned' : (r.target || null),
                status: (r.category === 'receivable' || r.category === 'payable') ? (r.status || 'open') : null
            })) : [];

            const data = {
                amount, date, description, type, category, isRecurring,
                tags: selectedTags,
                splits: cleanedSplits,
                accountId: accountId || null, // Save account ID
                createdAt: new Date().toISOString()
            };

            const batch = db.batch();

            // 1. Revert Old Effect (if editing)
            if (editingTransaction && editingTransaction.id) {
                const oldAccId = editingTransaction.accountId;
                if (oldAccId) {
                    const oldAcc = accounts.find(a => a.id === oldAccId);
                    if (oldAcc) {
                        let newBal = oldAcc.balance;
                        const isLiability = oldAcc.type === 'liability';
                        const amount = editingTransaction.amount;

                        if (editingTransaction.type === 'income') {
                            // Reverting Income
                            if (isLiability) newBal += amount;
                            else newBal -= amount;
                        } else {
                            // Reverting Expense
                            if (isLiability) newBal -= amount;
                            else newBal += amount;
                        }
                        batch.update(doc(getSubColl(user.uid, 'accounts'), oldAccId), { balance: newBal });
                    }
                }
            }

            // 2. Apply New Effect
            if (accountId) {
                // We need to get the *latest* balance state.
                // If we just reverted the same account, we need to chain the updates.
                // However, Firestore batch updates are atomic but don't see each other's effects in memory.
                // So we must calculate the NET effect if the account is the same.

                let targetAcc = accounts.find(a => a.id === accountId);
                if (targetAcc) {
                    let currentBal = targetAcc.balance;

                    // If we already touched this account in the Revert step, we need to adjust 'currentBal' manually
                    // because 'targetAcc.balance' is stale relative to the batch operation we just queued.
                    // Adjust for revert if same account
                    if (editingTransaction && editingTransaction.id && editingTransaction.accountId === accountId) {
                        const isLiability = targetAcc.type === 'liability';
                        const oldAmt = editingTransaction.amount;
                        if (editingTransaction.type === 'income') {
                            if (isLiability) currentBal += oldAmt;
                            else currentBal -= oldAmt;
                        } else {
                            if (isLiability) currentBal -= oldAmt;
                            else currentBal += oldAmt;
                        }
                    }

                    const isLiability = targetAcc.type === 'liability';
                    if (type === 'income') {
                        // Applying Income
                        if (isLiability) currentBal -= amount;
                        else currentBal += amount;
                    } else {
                        // Applying Expense
                        if (isLiability) currentBal += amount;
                        else currentBal -= amount;
                    }

                    batch.update(doc(getSubColl(user.uid, 'accounts'), accountId), { balance: currentBal });
                }
            }

            if (isRecurring) {
                // Check if we are already editing a recurring transaction to avoid duplicates if possible, 
                // but for now, the prompt implies "New Transaction" flow. 
                // If editing existing, we might handle separately, but let's focus on CREATION as per request.
                // Or if editing, we might want to update the linked subscription? 
                // For simplicity and safety (as per "New Transaction" focus), we will create a NEW subscription 
                // if the user checks recurring on a NEW transaction.

                if (!editingTransaction?.id) {
                    const subRef = doc(getSubColl(user.uid, 'subscriptions'));
                    // Parse day of month from the selected date
                    const txDateObj = new Date(date);
                    // Use getUTCDate if the input date string is UTC-based YYYY-MM-DD, 
                    // but browser input usually gives local YYYY-MM-DD. 
                    // Let's rely on standard parsing bits.
                    // Actually, date string from input type='date' is YYYY-MM-DD. 
                    // new Date('2023-12-08') in JS is UTC 00:00, which might be previous day in local if we aren't careful?
                    // But here we just need the day number. 
                    // Let's use the day component from the input string directly to be safe.
                    const dayOfMonth = parseInt(date.split('-')[2]);

                    const finalTags = [...new Set([...selectedTags, 'subscription'])];

                    batch.set(subRef, {
                        name: description,
                        amount: amount,
                        category: category,
                        dayOfMonth: dayOfMonth,
                        tags: finalTags,
                        lastProcessed: date // Set last processed to THIS transaction's date so strictly future ones are auto-created
                    });

                    // Also ensure the transaction itself has the subscription tag if implicit
                    data.tags = finalTags;
                }
            }

            let ref;
            if (editingTransaction?.id) {
                ref = doc(getSubColl(user.uid, 'transactions'), editingTransaction.id);
                batch.set(ref, data, { merge: true });
                showToast('success', 'Transaction updated');
            } else {
                ref = doc(getSubColl(user.uid, 'transactions'));
                batch.set(ref, data);
                showToast('success', 'Transaction added' + (isRecurring ? ' & Subscription Created' : ''));
            }

            await batch.commit();

            // Update history if account balances changed
            if (accountId || (editingTransaction?.accountId)) {
                // We can't easily pass the new balances here without re-fetching or complex logic.
                // But 'recordHistorySnapshot' reads from 'accounts' state which might be stale until the listener fires.
                // Ideally we wait for the listener. For now, we'll just let the next snapshot handle it or rely on the listener update.
                // Actually, let's just trigger a snapshot after a short delay to allow listener to update?
                // Or better, pass the modified accounts to recordHistorySnapshot if we knew them.
                // For simplicity, we'll skip forcing a history snapshot here and rely on the user's next action or periodic updates,
                // OR we could try to construct the modified account object.
            }

            setTransactionModalOpen(false);
            setEditingTransaction(null);
            setIsSplitMode(false);
            setIsRecurringMode(false);
            setSplitRows([]);
            setSelectedTags([]);
            setTransactionAmount(0);
        } catch (error) {
            console.error("Add Transaction Error", error);
            showToast('error', 'Failed to save transaction: ' + error.message);
        }
    };


    const toggleDarkMode = () => { const m = !darkMode; setDarkMode(m); if (user) setDoc(doc(getSubColl(user.uid, 'settings'), 'config'), { darkMode: m }, { merge: true }); };

    const filteredTransactions = useMemo(() => {
        let data = transactions;
        if (!viewAllTime) {
            if (filterStartDate || filterEndDate) {
                if (filterStartDate) data = data.filter(t => t.date >= filterStartDate);
                if (filterEndDate) data = data.filter(t => t.date <= filterEndDate);
            } else {
                data = data.filter(t => t.date.startsWith(selectedMonth));
            }
        }
        if (filterCategory !== 'all') data = data.filter(t => t.category === filterCategory);
        if (filterTag !== 'all') data = data.filter(t => t.tags && t.tags.includes(filterTag));
        if (filterMinAmount) data = data.filter(t => t.amount >= parseFloat(filterMinAmount));
        if (filterMaxAmount) data = data.filter(t => t.amount <= parseFloat(filterMaxAmount));
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            data = data.filter(t => t.description.toLowerCase().includes(term) || t.amount.toString().includes(term) || (t.tags && t.tags.some(tag => tag.toLowerCase().includes(term))));
        }
        return data.sort((a, b) => {
            if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
            if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
            if (sortBy === 'amount-desc') return b.amount - a.amount;
            if (sortBy === 'amount-asc') return a.amount - b.amount;
            return 0;
        });
    }, [transactions, selectedMonth, filterTag, filterCategory, filterStartDate, filterEndDate, filterMinAmount, filterMaxAmount, searchTerm, sortBy, viewAllTime]);

    const filteredTotals = useMemo(() => filteredTransactions.reduce((acc, t) => {
        if (t.type === 'income') {
            acc.income += t.amount;
        } else {
            if (t.splits && t.splits.length > 0) {
                t.splits.forEach(s => {
                    if (s.category !== 'receivable' && s.category !== 'payable') acc.expense += (parseFloat(s.amount) || 0);
                });
            } else {
                acc.expense += t.amount;
            }
        }
        return acc;
    }, { income: 0, expense: 0 }), [filteredTransactions]);

    const metrics = useMemo(() => {
        const assets = accounts.filter(a => a.type === 'asset').reduce((acc, a) => acc + a.balance, 0);
        const liabilities = accounts.filter(a => a.type === 'liability').reduce((acc, a) => acc + a.balance, 0);
        const netWorth = assets - liabilities;

        const currentMonthTrans = transactions.filter(t => t.date.startsWith(selectedMonth));

        let income = 0;
        let totalExpense = 0;
        let savingsContributions = 0;

        currentMonthTrans.forEach(t => {
            if (t.type === 'income') {
                income += t.amount;
            } else if (t.type === 'repayment') {
                // Do not count as income or expense
            } else {
                // Expense logic: handle splits
                if (t.splits && t.splits.length > 0) {
                    t.splits.forEach(split => {
                        if (split.category !== 'receivable' && split.category !== 'payable') {
                            const amt = parseFloat(split.amount) || 0;
                            totalExpense += amt;
                            if (split.category === 'savings') savingsContributions += amt;
                        }
                    });
                } else {
                    totalExpense += t.amount;
                    if (t.category === 'savings') savingsContributions += t.amount;
                }
            }
        });

        const nonSavingsExpense = totalExpense - savingsContributions;
        const savingsRate = income > 0 ? ((income - nonSavingsExpense) / income) * 100 : 0;

        return { assets, liabilities, netWorth, income, expense: totalExpense, cashFlow: income - totalExpense, savingsRate };
    }, [accounts, transactions, selectedMonth]);

    const categoryPieData = useMemo(() => {
        const currentMonthTrans = transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense');
        const catMap = {};

        currentMonthTrans.forEach(t => {
            if (t.splits && t.splits.length > 0) {
                t.splits.forEach(split => {
                    if (split.category !== 'receivable' && split.category !== 'payable') {
                        const amt = parseFloat(split.amount) || 0;
                        catMap[split.category] = (catMap[split.category] || 0) + amt;
                    }
                });
            } else {
                catMap[t.category] = (catMap[t.category] || 0) + t.amount;
            }
        });

        return Object.entries(catMap).map(([name, value]) => ({ name, value })).filter(i => i.value > 0);
    }, [transactions, selectedMonth]);

    const trendData = useMemo(() => {
        const data = [];
        const anchorDate = new Date(cashFlowDate);

        const calculateDayTotals = (transList) => {
            let inc = 0, exp = 0;
            transList.forEach(t => {
                if (t.type === 'income') inc += t.amount;
                else {
                    if (t.splits && t.splits.length > 0) {
                        t.splits.forEach(s => {
                            if (s.category !== 'receivable' && s.category !== 'payable') exp += (parseFloat(s.amount) || 0);
                        });
                    } else {
                        exp += t.amount;
                    }
                }
            });
            return { inc, exp };
        };

        if (cashFlowView === '6month') {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(anchorDate);
                d.setMonth(d.getMonth() - i);
                const monthKey = d.toISOString().slice(0, 7);
                const monthTrans = transactions.filter(t => t.date.startsWith(monthKey));
                const { inc, exp } = calculateDayTotals(monthTrans);
                data.push({ name: d.toLocaleDateString('en-US', { month: 'short' }), Income: inc, Expense: exp });
            }
        } else {
            const days = cashFlowView === 'week' ? 7 : 30;
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date(anchorDate);
                d.setDate(d.getDate() - i);
                const dateKey = d.toISOString().slice(0, 10);
                const dayTrans = transactions.filter(t => t.date.startsWith(dateKey));
                const { inc, exp } = calculateDayTotals(dayTrans);
                data.push({ name: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }), Income: inc, Expense: exp });
            }
        }

        if (cashFlowView === 'month') {
            return data.filter(d => d.Income > 0 || d.Expense > 0);
        }

        return data;
    }, [transactions, cashFlowView, cashFlowDate]);

    const shiftCashFlow = (direction) => {
        const newDate = new Date(cashFlowDate);
        if (cashFlowView === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
        else if (cashFlowView === 'month') newDate.setMonth(newDate.getMonth() + direction);
        else if (cashFlowView === '6month') newDate.setMonth(newDate.getMonth() + (direction * 6));
        setCashFlowDate(newDate);
    };



    const handleImport = async (jsonText) => {
        if (!user) return;
        try {
            const clean = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
            let rawData;
            try { rawData = JSON.parse(clean); }
            catch (e1) { const match = clean.match(/\[[\s\S]*\]/); if (match) { rawData = JSON.parse(match[0]); } else { throw new Error("No valid JSON array found."); } }

            if (!Array.isArray(rawData)) rawData = [rawData];

            const batch = db.batch();
            let count = 0;
            let accountsChanged = false;
            const tempAccountsMap = new Map(accounts.map(a => [a.id, a]));
            const monthsToLock = new Set();

            rawData.forEach(item => {
                const act = item.action;
                if (act === 'transaction') {
                    const amount = parseFloat(item.amount);
                    const type = item.type || 'expense';
                    const categoryId = item.category || 'misc';
                    const date = item.date || new Date().toISOString();
                    monthsToLock.add(date.slice(0, 7));

                    const ref = doc(getSubColl(user.uid, 'transactions'));
                    batch.set(ref, {
                        description: item.description || 'Imported Transaction',
                        amount, type, category: categoryId, date,
                        tags: item.tags || [], isRecurring: !!item.isRecurring
                    });
                    count++;
                } else if (act === 'add_account') {
                    const id = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const newAcc = {
                        id, name: item.name, type: item.type || 'asset',
                        subtype: item.subtype || 'other', balance: parseFloat(item.balance || 0)
                    };
                    batch.set(doc(getSubColl(user.uid, 'accounts'), id), newAcc);
                    tempAccountsMap.set(id, newAcc);
                    accountsChanged = true;
                    count++;
                } else if (act === 'update_account_balance') {
                    const target = findAccount(item.name);
                    if (target) {
                        batch.update(doc(getSubColl(user.uid, 'accounts'), target.id), { balance: parseFloat(item.balance) });
                        tempAccountsMap.set(target.id, { ...target, balance: parseFloat(item.balance) });
                        accountsChanged = true;
                        count++;
                    }
                } else if (act === 'add_category') {
                    const id = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    batch.set(doc(getSubColl(user.uid, 'categories'), id), { id: id, name: item.name, budget: parseFloat(item.budget || 0) });
                    count++;
                } else if (act === 'update_category_budget') {
                    const target = categories.find(c => norm(c.name) === norm(item.name));
                    if (target) { batch.update(doc(getSubColl(user.uid, 'categories'), target.id), { budget: parseFloat(item.budget) }); count++; }
                } else if (act === 'add_subscription') {
                    batch.set(doc(getSubColl(user.uid, 'subscriptions')), { name: item.name, amount: parseFloat(item.amount), dayOfMonth: parseInt(item.dayOfMonth || 1), category: item.category || 'misc', lastProcessed: null });
                    count++;
                } else if (act === 'record_history_point') {
                    const histDate = item.date ? new Date(item.date) : new Date();
                    const balancesList = item.balances || [];
                    const accountBalances = {};
                    let tAssets = 0;
                    let tLiabilities = 0;
                    let hasMatches = false;
                    balancesList.forEach(b => {
                        const target = findAccount(b.name);
                        if (target) {
                            const val = parseFloat(b.balance);
                            accountBalances[target.id] = val;
                            if (target.type === 'asset') tAssets += val;
                            else tLiabilities += val;
                            hasMatches = true;
                        }
                    });
                    if (hasMatches) {
                        const histRef = doc(getSubColl(user.uid, 'history'));
                        batch.set(histRef, { date: histDate.toISOString(), totalAssets: tAssets, totalLiabilities: tLiabilities, netWorth: tAssets - tLiabilities, accountBalances: accountBalances });
                        count++;
                    }
                } else if (act === 'transfer') {
                    const fromAccount = findAccount(item.fromAccount);
                    const toAccount = findAccount(item.toAccount);
                    const amount = parseFloat(item.amount);
                    const date = item.date || new Date().toISOString();
                    const description = item.description || 'Transfer';

                    if (fromAccount && toAccount && amount > 0) {
                        const fromAcc = tempAccountsMap.get(fromAccount.id) || fromAccount;
                        const toAcc = tempAccountsMap.get(toAccount.id) || toAccount;

                        const newFromBalance = fromAcc.type === 'asset' ? fromAcc.balance - amount : fromAcc.balance + amount;
                        const newToBalance = toAcc.type === 'asset' ? toAcc.balance + amount : toAcc.balance - amount;

                        tempAccountsMap.set(fromAcc.id, { ...fromAcc, balance: newFromBalance });
                        tempAccountsMap.set(toAcc.id, { ...toAcc, balance: newToBalance });

                        batch.update(doc(getSubColl(user.uid, 'accounts'), fromAcc.id), { balance: newFromBalance });
                        batch.update(doc(getSubColl(user.uid, 'accounts'), toAcc.id), { balance: newToBalance });

                        const transferRef = doc(getSubColl(user.uid, 'transfers'));
                        batch.set(transferRef, {
                            fromId: fromAcc.id, toId: toAcc.id, fromName: fromAcc.name, toName: toAcc.name,
                            amount, date, description, createdAt: new Date().toISOString()
                        });
                        accountsChanged = true;
                        count++;
                    }
                }
            });

            monthsToLock.forEach(m => {
                const budgetSnapshot = {};
                categories.forEach(c => budgetSnapshot[c.id] = c.budget || 0);
                batch.set(doc(getSubColl(user.uid, 'monthly_budgets'), m), budgetSnapshot, { merge: true });
            });

            await batch.commit();
            if (accountsChanged) {
                const finalAccounts = Array.from(tempAccountsMap.values());
                const totalAssets = finalAccounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
                const totalLiabilities = finalAccounts.filter(a => a.type === 'liability').reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
                const accountBalances = {};
                finalAccounts.forEach(a => { accountBalances[a.id] = parseFloat(a.balance) || 0; });
                await getSubColl(user.uid, 'history').add({ date: new Date().toISOString(), totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities, accountBalances });
            }
            showToast('success', `Scribe wrote ${count} entries.`);
            setScribeModalOpen(false); setScribeInput('');
        } catch (e) { showToast('error', 'Scribe Failed: ' + e.message); }
    };

    const toggleListening = () => {
        if (isListening) {
            setIsListening(false);
            return; // Browser stops automatically
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showToast('error', 'Speech recognition not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setScribeInput(prev => prev + (prev ? ' ' : '') + transcript);
        };
        recognition.onerror = (e) => {
            console.error("Speech Error", e);
            setIsListening(false);
            showToast('error', 'Speech recognition error.');
        };

        recognition.start();
    };

    const getWorkingModel = async (key) => {
        const saved = localStorage.getItem('chronicle_gemini_model');
        if (saved) return saved;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const data = await response.json();
            if (!data.models) throw new Error('No models found');

            const generateModels = data.models
                .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));

            const best = generateModels.find(m => m.includes('flash')) || generateModels[0];
            if (best) {
                localStorage.setItem('chronicle_gemini_model', best);
                return best;
            }
        } catch (e) {
            console.error("Model fetch failed", e);
        }
        return "gemini-1.5-flash"; // Fallback
    };

    const handleScribeRequest = async (inputText = null, skipQueue = false) => {
        const textToProcess = inputText || scribeInput;
        if (!geminiApiKey) { showToast('error', 'Please enter a Gemini API Key to use the Scribe.'); return; }
        if (typeof textToProcess !== 'string' || !textToProcess.trim()) return;

        if (!isOnline && !skipQueue) {
            await addToQueue(textToProcess);
            setScribeInput('');
            setScribeModalOpen(false);
            showToast('success', 'Offline: Request Queued');
            return;
        }

        setIsProcessingScribe(true);
        try {
            const modelName = await getWorkingModel(geminiApiKey.trim());
            const ai = new GoogleGenerativeAI(geminiApiKey.trim());
            const model = ai.getGenerativeModel({ model: modelName });

            const systemPrompt = `
                You are "The Royal Scribe" of Chronicle, a personal finance assistant.
                Your role is to listen to the user's financial tales and transcribe them into structured records.
                
                Current Context:
                - Today's Date: ${new Date().toISOString()}
                - Existing Categories: ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name })))}
                - Existing Accounts: ${JSON.stringify(accounts.map(a => ({ name: a.name, id: a.id })))}
                - Default Account ID: ${defaultAccountId || 'none'}

                You must output a raw JSON array (and ONLY a JSON array, no markdown formatting) compatible with the app's importer.
                
                Supported Actions & Schemas:
                1. Transaction: { "action": "transaction", "description": "string", "amount": number, "type": "income"|"expense", "category": "category_id", "date": "ISOString", "tags": ["tag1"], "isRecurring": boolean, "accountId": "account_id" }
                2. Add Account: { "action": "add_account", "name": "string", "type": "asset"|"liability", "subtype": "checking"|"savings"|"investment"|"other", "balance": number }
                3. Update Balance: { "action": "update_account_balance", "name": "Exact Account Name", "balance": number }
                4. Add Subscription: { "action": "add_subscription", "name": "string", "amount": number, "dayOfMonth": number, "category": "category_id" }
                5. Transfer: { "action": "transfer", "fromAccount": "account_name", "toAccount": "account_name", "amount": number, "date": "ISOString" }
                6. Add Category: { "action": "add_category", "name": "string", "budget": number }
                7. Update Category Budget: { "action": "update_category_budget", "name": "category_name", "budget": number }
                8. Record History: { "action": "record_history_point", "date": "ISOString", "balances": [{ "name": "account_name", "balance": number }] }
                9. Add Payable (Debt/IOU): { "action": "add_payable", "target": "person_name", "amount": number, "description": "reason" }

                Rules:
                - Infer the best category ID from the list provided. If unknown, use 'misc'.
                - Infer dates from "yesterday", "last friday", etc., relative to today.
                - If the user mentions a new account, use "add_account".
                - If the user implies spending money, use "transaction" with type "expense".
                - If the user earned money, use "transaction" with type "income".
                - If the user says "transfer", use "transfer".
                - If the user says "I owe [Person]", use "add_payable".
                - If the user specifies an account (e.g. "from Savings"), use that account's ID in "accountId".
                - If NO account is specified, use the Default Account ID: '${defaultAccountId}'. If that is empty/none, leave "accountId" null or empty.
                
                CRITICAL INSTRUCTION:
                - You MUST accurately and consistently tag transactions. Tags are crucial for the user's organization.
                - Infer tags based on the description and category (e.g., "groceries" -> ["food", "groceries"], "netflix" -> ["subscription", "entertainment"]).
                - Always include at least one relevant tag if possible.
            `;

            const result = await model.generateContent(systemPrompt + "\nUser Input: " + textToProcess);
            const responseText = result.response.text();
            const clean = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

            let rawData;
            try { rawData = JSON.parse(clean); }
            catch (e1) { const match = clean.match(/\[[\s\S]*\]/); if (match) { rawData = JSON.parse(match[0]); } else { throw new Error("No valid JSON array found."); } }

            if (!Array.isArray(rawData)) rawData = [rawData];

            // Check for transactions to open in modal
            const transactions = rawData.filter(item => item.action === 'transaction');
            const payables = rawData.filter(item => item.action === 'add_payable');

            if (transactions.length > 0 || payables.length > 0) {
                // Should probably only handle one action if multiple are returned, prioritizing payables for now?
                // Or just the first valid one.
                const t = transactions[0];
                const p = payables[0];

                if (p) {
                    setEditingTransaction({
                        id: null,
                        description: p.description,
                        amount: parseFloat(p.amount),
                        type: 'expense',
                        category: 'split',
                        date: new Date().toISOString(),
                        tags: [],
                        isRecurring: false,
                        accountId: null, // Debt usually isn't paid from an account yet
                        splits: [
                            { id: Date.now(), amount: parseFloat(p.amount), category: 'payable', target: p.target, note: p.description, status: 'open' }
                        ]
                    });
                    setTransactionModalOpen(true);
                    setScribeModalOpen(false);
                    setScribeInput('');
                    setIsProcessingScribe(false);
                    return;
                }

                if (t) {
                    setEditingTransaction({
                        id: null, // Draft mode
                        description: t.description,
                        amount: parseFloat(t.amount),
                        type: t.type || 'expense',
                        category: t.category || 'misc',
                        date: t.date || new Date().toISOString(),
                        tags: t.tags || [],
                        isRecurring: !!t.isRecurring,
                        accountId: t.accountId || defaultAccountId || ''
                    });
                    setTransactionModalOpen(true);
                    setScribeModalOpen(false);
                    setScribeInput('');
                    setIsProcessingScribe(false);
                    return;
                }
            }

            // For other actions, show preview
            setScribePreview(rawData);

        } catch (error) {
            console.error(error);
            showToast('error', 'The Scribe was unable to process your request: ' + error.message);
        }
        setIsProcessingScribe(false);
    };



    const handleTestScribe = async () => {
        if (!geminiApiKey) { setTestScribeResult({ success: false, message: 'No API Key provided' }); return; }
        setTestScribeResult({ success: false, message: 'Checking available models...' });

        try {
            // Direct REST call to see what models are actually available for this key
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey.trim()}`);
            const data = await response.json();

            if (!response.ok) {
                setTestScribeResult({ success: false, message: `API Error: ${data.error?.message || response.statusText}` });
                return;
            }

            if (!data.models || data.models.length === 0) {
                setTestScribeResult({ success: false, message: 'No models found for this API Key. Please ensure the "Generative Language API" is enabled in your Google Cloud Console.' });
                return;
            }

            // Filter for generateContent supported models
            const generateModels = data.models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));

            if (generateModels.length === 0) {
                setTestScribeResult({ success: false, message: 'No models support content generation.' });
                return;
            }

            // Try the first available model
            const bestModel = generateModels.find(m => m.includes('flash')) || generateModels[0];

            // Save the working model
            localStorage.setItem('chronicle_gemini_model', bestModel);

            setTestScribeResult({ success: false, message: `Found models: ${generateModels.join(', ')}. Testing ${bestModel}...` });

            const genAI = new GoogleGenerativeAI(geminiApiKey.trim());
            const model = genAI.getGenerativeModel({ model: bestModel });
            const result = await model.generateContent("Hello");
            const text = result.response.text();

            setTestScribeResult({ success: true, message: `Success! Model '${bestModel}' works. Response: ${text.slice(0, 20)}...` });

        } catch (e) {
            setTestScribeResult({ success: false, message: 'Check Failed: ' + e.message });
        }
    };

    const handleAccountSave = async (e) => {
        e.preventDefault();
        if (!user) return;
        const fd = new FormData(e.target);
        const data = {
            name: fd.get('name'),
            type: fd.get('type'),
            subtype: fd.get('subtype'),
            balance: parseFloat(fd.get('balance'))
        };
        let ref;
        if (editingAccount) { ref = doc(getSubColl(user.uid, 'accounts'), editingAccount.id); await setDoc(ref, data, { merge: true }); recordHistorySnapshot({ id: editingAccount.id, ...data }); }
        else { ref = doc(getSubColl(user.uid, 'accounts')); await setDoc(ref, data, { merge: true }); recordHistorySnapshot({ id: ref.id, ...data }); }
        setAccountModalOpen(false); setEditingAccount(null); showToast('success', 'Saved');
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        if (!user) return;
        const fd = new FormData(e.target);
        const fromId = fd.get('fromAccount');
        const toId = fd.get('toAccount');
        const amount = parseFloat(fd.get('amount'));
        const date = fd.get('date') || new Date().toISOString();
        const description = fd.get('description') || 'Fund Transfer';

        if (fromId === toId) { showToast('error', 'Cannot transfer to same account.'); return; }
        if (amount <= 0) { showToast('error', 'Amount must be positive.'); return; }

        const fromAcc = accounts.find(a => a.id === fromId);
        const toAcc = accounts.find(a => a.id === toId);

        if (!fromAcc || !toAcc) { showToast('error', 'Account not found.'); return; }

        const newFromBalance = fromAcc.type === 'asset' ? fromAcc.balance - amount : fromAcc.balance + amount;
        const newToBalance = toAcc.type === 'asset' ? toAcc.balance + amount : toAcc.balance - amount;

        const batch = db.batch();

        batch.update(doc(getSubColl(user.uid, 'accounts'), fromId), { balance: newFromBalance });
        batch.update(doc(getSubColl(user.uid, 'accounts'), toId), { balance: newToBalance });

        const transferRef = doc(getSubColl(user.uid, 'transfers'));
        batch.set(transferRef, {
            fromId, toId, fromName: fromAcc.name, toName: toAcc.name,
            amount, date, description, createdAt: new Date().toISOString()
        });

        await batch.commit();

        await recordHistorySnapshot([
            { id: fromId, balance: newFromBalance, type: fromAcc.type },
            { id: toId, balance: newToBalance, type: toAcc.type }
        ]);

        setTransferModalOpen(false);
        showToast('success', 'Transfer Complete');
    };

    const handleReconcile = async (e) => {
        e.preventDefault();
        if (!user || !reconcileAccount) return;
        const fd = new FormData(e.target);
        const actualBalance = parseFloat(fd.get('actualBalance'));
        const currentBalance = reconcileAccount.balance;
        const diff = actualBalance - currentBalance;

        if (Math.abs(diff) < 0.01) {
            showToast('success', 'Account is already balanced.');
            setReconcileModalOpen(false);
            return;
        }

        const batch = db.batch();
        const type = reconcileAccount.type;
        let txType = 'expense';
        let amount = Math.abs(diff);

        // Asset: Actual > Current -> Income (Found money)
        // Asset: Actual < Current -> Expense (Lost money)
        // Liability: Actual > Current -> Expense (Debt increased)
        // Liability: Actual < Current -> Income (Debt decreased)

        if (type === 'asset') {
            txType = diff > 0 ? 'income' : 'expense';
        } else {
            txType = diff > 0 ? 'expense' : 'income';
        }

        const txRef = doc(getSubColl(user.uid, 'transactions'));
        batch.set(txRef, {
            description: 'Balance Reconciliation',
            amount: amount,
            type: txType,
            category: 'misc', // Or a specific 'reconciliation' category if it existed
            date: new Date().toISOString(),
            tags: ['reconciliation'],
            isRecurring: false,
            accountId: reconcileAccount.id,
            createdAt: new Date().toISOString()
        });

        batch.update(doc(getSubColl(user.uid, 'accounts'), reconcileAccount.id), { balance: actualBalance });

        await batch.commit();
        await recordHistorySnapshot({ id: reconcileAccount.id, balance: actualBalance, type: reconcileAccount.type });

        setReconcileModalOpen(false);
        setReconcileAccount(null);
        showToast('success', 'Account Reconciled');
    };





    const handleSubscriptionSave = async (e) => {
        if (!user) return;
        e.preventDefault(); const fd = new FormData(e.target);
        const data = { name: fd.get('name'), amount: parseFloat(fd.get('amount')), dayOfMonth: parseInt(fd.get('dayOfMonth')), category: fd.get('category'), tags: fd.get('tags').split(',').map(t => t.trim()).filter(Boolean) };
        let ref;
        if (editingSubscription) ref = doc(getSubColl(user.uid, 'subscriptions'), editingSubscription.id);
        else ref = doc(getSubColl(user.uid, 'subscriptions'));
        await setDoc(ref, data, { merge: true });
        setSubscriptionModalOpen(false); setEditingSubscription(null); showToast('success', 'Subscription Saved');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = (evt) => {
            const img = new Image(); img.src = evt.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas'); const MAX = 600;
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
                const base64 = canvas.toDataURL('image/jpeg', 0.9);
                setDoc(doc(getSubColl(user.uid, 'settings'), 'config'), { logoUrl: base64 }, { merge: true });
                setLogoUrl(base64); showToast('success', 'Logo uploaded');
            };
        };
    };

    const handleQuillUpload = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = (evt) => {
            const img = new Image(); img.src = evt.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas'); const MAX = 600;
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
                const base64 = canvas.toDataURL('image/png', 1.0);
                setDoc(doc(getSubColl(user.uid, 'settings'), 'config'), { quillUrl: base64 }, { merge: true });
                setQuillUrl(base64); showToast('success', 'Quill updated');
            };
        };
    };

    const deleteItem = async (col, id) => {
        if (!user) return;
        try {
            await getSubColl(user.uid, col).doc(id).delete();
            return true;
        } catch (e) {
            console.error("Delete Error:", e);
            showToast('error', 'Delete failed: ' + e.message);
            return false;
        }
    };

    const handleDeleteTransaction = async (transaction) => {
        if (!user || !transaction) return;
        try {
            const batch = db.batch();

            // Revert balance effect if linked to an account
            if (transaction.accountId) {
                const acc = accounts.find(a => a.id === transaction.accountId);
                if (acc) {
                    let newBal = acc.balance;
                    const isLiability = acc.type === 'liability';

                    if (transaction.type === 'income') {
                        // Reverting Income
                        if (isLiability) newBal += transaction.amount;
                        else newBal -= transaction.amount;
                    } else {
                        // Reverting Expense
                        if (isLiability) newBal -= transaction.amount;
                        else newBal += transaction.amount;
                    }
                    batch.update(doc(getSubColl(user.uid, 'accounts'), acc.id), { balance: newBal });
                }
            }

            batch.delete(doc(getSubColl(user.uid, 'transactions'), transaction.id));
            await batch.commit();
            return true;
        } catch (e) {
            console.error("Delete Error:", e);
            showToast('error', 'Delete failed: ' + e.message);
            return false;
        }
    };
    const resetFilters = () => { setFilterCategory('all'); setFilterTag('all'); setFilterStartDate(''); setFilterEndDate(''); setFilterMinAmount(''); setFilterMaxAmount(''); setSearchTerm(''); };
    const runExport = () => {
        const rows = filteredTransactions.map(t => [t.date.substring(0, 10), `"${t.description}"`, t.type, t.category, t.amount.toFixed(2), `"${(t.tags || []).join(',')}"`]);
        const csv = ["Date,Description,Type,Category,Amount,Tags", ...rows.map(r => r.join(','))].join('\n');
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'chronicle_export.csv'; link.click();
    };

    const handleResetData = async () => { if (!confirm('Delete ALL data?')) return; const batch = db.batch();[...transactions, ...accounts].forEach(i => { const col = i.date ? 'transactions' : 'accounts'; batch.delete(doc(getSubColl(user.uid, col), i.id)); }); setLogoUrl(null); batch.delete(doc(getSubColl(user.uid, 'settings'), 'config')); await batch.commit(); showToast('success', 'Reset'); };

    const handleSaveBudget = async (id, val, month) => {
        const amount = parseFloat(val);
        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const batch = db.batch();
        batch.set(doc(getSubColl(user.uid, 'monthly_budgets'), month), { [id]: amount }, { merge: true });
        if (month >= currentMonthStr) {
            batch.update(doc(getSubColl(user.uid, 'categories'), id), { budget: amount });
            const monthsWithTx = new Set(transactions.map(t => t.date.slice(0, 7)));
            const pastMonthsWithTx = [...monthsWithTx].filter(m => m < currentMonthStr);
            pastMonthsWithTx.forEach(pastMonth => {
                const existingSnap = monthlyBudgets[pastMonth] || {};
                const snapshotToSave = {};
                let needsSave = false;
                categories.forEach(c => {
                    if (existingSnap[c.id] === undefined) {
                        snapshotToSave[c.id] = c.budget || 0;
                        needsSave = true;
                    }
                });
                if (needsSave) {
                    batch.set(doc(getSubColl(user.uid, 'monthly_budgets'), pastMonth), snapshotToSave, { merge: true });
                }
            });
        }
        await batch.commit();
        setEditingBudget(null);
        showToast('success', 'Budget updated');
    };

    const handleAddCategory = async (e) => { e.preventDefault(); const name = e.target.newCategoryName.value.trim(); if (!name) return; const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random() * 1000); await setDoc(doc(getSubColl(user.uid, 'categories'), id), { id, name, budget: 0 }); e.target.reset(); showToast('success', 'Category added'); };
    const handleDeleteCategory = async (id) => { if (!confirm('Delete this category?')) return; await doc(getSubColl(user.uid, 'categories'), id).delete(); showToast('success', 'Category deleted'); };
    const handleUpdateCategoryName = async (id, newName) => { if (!newName.trim()) return; await updateDoc(doc(getSubColl(user.uid, 'categories'), id), { name: newName }); };

    const handleGoogleSignIn = async () => {
        try {
            await auth.signInWithPopup(googleProvider);
            showToast('success', 'Authentication successful');
        } catch (error) {
            console.error(error);
            showToast('error', 'Authentication failed: ' + error.message);
        }
    };

    const handleSignOut = async () => {
        try {
            await auth.signOut();
            showToast('success', 'Signed out');
        } catch (error) {
            showToast('error', error.message);
        }
    };

    const handleUpdateHistory = async (originalItem, accountId, newBalance) => {
        if (!user || !appId) return;
        try {
            const docRef = getSubColl(user.uid, 'history').doc(originalItem.id);
            const currentBalances = originalItem.accountBalances || {};

            let updatedBalances = { ...currentBalances };

            if (newBalance === null) {
                // Delete logic
                delete updatedBalances[accountId];
            } else {
                updatedBalances[accountId] = parseFloat(newBalance);
            }

            // Calculate new net worth (sum of all balances)
            const newNetWorth = Object.values(updatedBalances).reduce((a, b) => a + (parseFloat(b) || 0), 0);

            if (Object.keys(updatedBalances).length === 0) {
                // If no accounts left in this history point, delete the doc
                await docRef.delete();
                setHistory(prev => prev.filter(h => h.id !== originalItem.id));
                showToast('success', 'History point deleted');
            } else {
                const updateData = {
                    accountBalances: updatedBalances,
                    netWorth: newNetWorth
                };
                await docRef.update(updateData);
                setHistory(prev => prev.map(h => h.id === originalItem.id ? { ...h, ...updateData } : h));
                showToast('success', 'History updated');
            }
        } catch (error) {
            console.error("Error updating history:", error);
            showToast('error', 'Failed to update history');
        }
    };



    const handleResolveDebt = (debtItem) => {
        setSelectedDebt(debtItem);
        setResolutionModalOpen(true);
    };

    const confirmDebtResolution = async (resolutionType) => {
        if (!user || !selectedDebt) return;

        if (resolutionType === 'repaid') {
            setResolutionModalOpen(false);
            setRepaymentModalOpen(true);
            return;
        }

        const batch = db.batch();
        const originalTxRef = doc(getSubColl(user.uid, 'transactions'), selectedDebt.originalTransaction.id);

        // Update the specific split item status
        const updatedSplits = [...selectedDebt.originalTransaction.splits];
        updatedSplits[selectedDebt.splitIndex] = {
            ...updatedSplits[selectedDebt.splitIndex],
            status: 'forgiven'
        };

        batch.update(originalTxRef, { splits: updatedSplits });

        // Option B: Forgiven
        const isPayable = selectedDebt.category === 'payable';
        const newTxRef = doc(getSubColl(user.uid, 'transactions'));
        batch.set(newTxRef, {
            description: isPayable ? `Debt Forgiven by ${selectedDebt.target}` : `Forgiven Debt: ${selectedDebt.target}`,
            amount: selectedDebt.amount,
            type: isPayable ? 'income' : 'expense',
            category: 'misc',
            date: new Date().toISOString(),
            tags: isPayable ? ['debt_relief', 'income'] : ['bad_debt', 'forgiven'],
            isRecurring: false,
            createdAt: new Date().toISOString()
        });
        showToast('success', 'Debt Forgiven');

        await batch.commit();
        setResolutionModalOpen(false);
        setSelectedDebt(null);
    };

    const handleConfirmRepayment = async (e) => {
        e.preventDefault();
        if (!user || !selectedDebt) return;

        const fd = new FormData(e.target);
        const targetAccountId = fd.get('targetAccount');

        const batch = db.batch();
        const originalTxRef = doc(getSubColl(user.uid, 'transactions'), selectedDebt.originalTransaction.id);

        // Update the specific split item status
        const updatedSplits = [...selectedDebt.originalTransaction.splits];
        updatedSplits[selectedDebt.splitIndex] = {
            ...updatedSplits[selectedDebt.splitIndex],
            status: 'repaid'
        };

        batch.update(originalTxRef, { splits: updatedSplits });

        // Create the repayment transaction
        const isPayable = selectedDebt.category === 'payable';
        const newTxRef = doc(getSubColl(user.uid, 'transactions'));
        batch.set(newTxRef, {
            description: isPayable ? `Repayment to ${selectedDebt.target}` : `Repayment from ${selectedDebt.target}`,
            amount: selectedDebt.amount,
            type: isPayable ? 'expense' : 'repayment', // Payables become Expenses when paid. Receivables are just reimbursements.
            category: isPayable ? 'misc' : 'income',
            date: new Date().toISOString(),
            accountId: targetAccountId === 'cash_other' ? null : targetAccountId,
            tags: ['repayment', 'bounty_board'],
            isRecurring: false,
            createdAt: new Date().toISOString()
        });

        // Update Balance if account selected
        if (targetAccountId && targetAccountId !== 'cash_other') {
            const acc = accounts.find(a => a.id === targetAccountId);
            if (acc) {
                let newBal = (parseFloat(acc.balance) || 0);
                const isLiability = acc.type === 'liability';

                if (isPayable) {
                    // Paying money OUT
                    if (isLiability) newBal += selectedDebt.amount; // Credit card balance increases
                    else newBal -= selectedDebt.amount; // Bank balance decreases
                } else {
                    // Receiving money IN
                    if (isLiability) newBal -= selectedDebt.amount; // Credit card balance decreases
                    else newBal += selectedDebt.amount; // Bank balance increases
                }


                batch.update(doc(getSubColl(user.uid, 'accounts'), targetAccountId), { balance: newBal });
            }
        }

        await batch.commit();

        // Record snapshot separate
        if (targetAccountId && targetAccountId !== 'cash_other') {
            const acc = accounts.find(a => a.id === targetAccountId);
            if (acc) {
                let newBal = (parseFloat(acc.balance) || 0);
                if (acc.type === 'liability') newBal -= selectedDebt.amount;
                else newBal += selectedDebt.amount;
                recordHistorySnapshot({ id: targetAccountId, balance: newBal, type: acc.type });
            }
        }

        setRepaymentModalOpen(false);
        setSelectedDebt(null);
        showToast('success', 'Repayment Recorded');
    };

    return (
        <>
            <div className="flex flex-col md:flex-row h-dvh overflow-hidden">
                <ErrorBoundary>
                    {/* Mobile Header - Fixed Height */}
                    <div className="h-16 flex-none flex md:hidden bg-white border-b-2 z-50 relative justify-between items-center px-4" style={{ backgroundColor: theme.bg, borderColor: theme.borderColor }}>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded hover:bg-black/5">
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                            <h1 className="text-xl font-bold font-cinzel">Chronicle</h1>
                        </div>
                        <div className="flex items-center gap-3 relative hidden md:flex"> {/* Note: keeping hidden md:flex logic but clarifying structure */}
                            <button
                                onClick={() => setScribeModalOpen(true)}
                                className="old-book-btn px-4 py-2 rounded font-bold flex items-center gap-2 text-sm shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer relative z-50"
                            >
                                <Sparkles size={16} /> Scribe
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu Backdrop */}
                    {isMobileMenuOpen && (
                        <div
                            className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm animate-in fade-in"
                            onClick={() => setIsMobileMenuOpen(false)}
                        ></div>
                    )}

                    <aside className={`${isMobileMenuOpen ? 'fixed inset-y-0 left-0 w-64' : 'hidden'} md:relative md:flex flex-col z-50 border-r-2 transition-all duration-300 ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'} h-full bg-white`} style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}>
                        <div className="p-4 flex flex-col items-center gap-4 border-b-2" style={{ borderColor: theme.borderColor }}>
                            {logoUrl && !sidebarCollapsed && <img src={logoUrl} alt="Seal" className="w-full h-auto rounded-lg border-4 shadow-md object-cover" style={{ borderColor: theme.secondary }} />}
                            {logoUrl && sidebarCollapsed && <img src={logoUrl} alt="Seal" className="w-10 h-10 rounded-lg border-2 object-cover" style={{ borderColor: theme.secondary }} />}
                        </div>
                        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                            <SidebarItem icon={LayoutDashboard} label="Dashboard" active={currentView === 'dashboard'} onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }} collapsed={sidebarCollapsed} theme={theme} />
                            <SidebarItem icon={Target} label="Budget" active={currentView === 'budget'} onClick={() => { navigate('/budget'); setIsMobileMenuOpen(false); }} collapsed={sidebarCollapsed} theme={theme} />
                            <SidebarItem icon={ScrollText} label="Ledger" active={currentView === 'ledger'} onClick={() => { navigate('/ledger'); setIsMobileMenuOpen(false); }} collapsed={sidebarCollapsed} theme={theme} />
                            <SidebarItem icon={Bank} label="Accounts" active={currentView === 'accounts'} onClick={() => { navigate('/accounts'); setIsMobileMenuOpen(false); }} collapsed={sidebarCollapsed} theme={theme} />
                            <SidebarItem icon={User} label="Bounty Board" active={currentView === 'bounty'} onClick={() => { navigate('/bounty'); setIsMobileMenuOpen(false); }} collapsed={sidebarCollapsed} theme={theme} />
                        </nav>
                        <div className="p-4 flex items-center gap-3 border-t-2" style={{ borderColor: theme.borderColor }}>
                            {user?.photoURL ? <img src={user.photoURL} className="w-8 h-8 rounded-full" /> : <User size={24} />}
                            {!sidebarCollapsed && (
                                <div>
                                    <div className="font-bold font-cinzel text-sm">{user?.isAnonymous ? 'Guest Archivist' : (user?.displayName || 'Archivist')}</div>
                                    <div className="text-xs opacity-60 truncate w-32">{user?.isAnonymous ? 'Local Session' : user?.email}</div>
                                </div>
                            )}
                        </div>
                        <div className={`p-4 border-t-2 flex ${sidebarCollapsed ? 'flex-col gap-4' : 'flex-row justify-between'} items-center transition-all duration-300`} style={{ borderColor: theme.borderColor }}>
                            <button onClick={() => { navigate('/settings'); setIsMobileMenuOpen(false); }} className={`p-2 rounded-lg transition-all ${currentView === 'settings' ? 'shadow-sm' : 'hover:bg-opacity-10'}`} style={{ backgroundColor: currentView === 'settings' ? theme.primary : 'transparent', color: currentView === 'settings' ? (theme.name === 'dark' ? '#1a1d1a' : '#fdfbf2') : theme.textMuted, boxShadow: currentView === 'settings' ? `1px 1px 0px ${theme.text}` : 'none' }} title="Settings"><Settings size={20} /></button>
                            <button onClick={toggleDarkMode} className="p-2 hover:bg-black/5 rounded transition-colors" style={{ color: theme.textMuted }} title="Toggle Theme"><Moon size={20} /></button>
                            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-black/5 rounded transition-colors" style={{ color: theme.textMuted }} title={sidebarCollapsed ? "Expand" : "Collapse"}><div style={{ transform: sidebarCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }}><ChevronRightIcon size={20} /></div></button>
                        </div>
                    </aside>
                    <main className="flex-1 overflow-y-auto bg-gray-50 transition-all relative" style={{ backgroundColor: theme.bg, color: theme.text }}>
                        <div className="hidden md:flex justify-between items-center px-8 py-4 sticky top-0 z-40 border-b-2" style={{ backgroundColor: theme.bg, borderColor: theme.borderColor }}>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold font-cinzel">Chronicle</h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setScribeModalOpen(true)} className="px-4 py-2 rounded-full font-bold flex items-center gap-2 text-sm shadow-md hover:brightness-110 active:scale-95 transition-all bg-amber-700 text-amber-50 border border-amber-600/50">
                                    <Sparkles size={16} /> Scribe
                                </button>
                            </div>
                        </div>
                        <div className="p-4 md:p-8">
                            <Routes>
                                <Route path="/" element={<DashboardView
                                    user={user}
                                    metrics={metrics}
                                    trendData={trendData}
                                    categoryPieData={categoryPieData}
                                    recentTransactions={transactions.slice(0, 5)}
                                    theme={theme}
                                    selectedMonth={selectedMonth}
                                    setSelectedMonth={setSelectedMonth}
                                    setViewAllTime={setViewAllTime}
                                    history={history}
                                    accounts={accounts}
                                    cashFlowDate={cashFlowDate}
                                    cashFlowView={cashFlowView}
                                    setCashFlowView={setCashFlowView}
                                    shiftCashFlow={shiftCashFlow}
                                    transactions={transactions}
                                    onResolveDebt={handleResolveDebt}
                                />} />
                                <Route path="/budget" element={<BudgetView
                                    monthlyBudgets={monthlyBudgets}
                                    categories={categories}
                                    handleSaveBudget={handleSaveBudget}
                                    theme={theme}
                                    selectedMonth={selectedMonth}
                                    setSelectedMonth={setSelectedMonth}
                                    transactions={transactions}
                                    getEffectiveBudget={getEffectiveBudget}
                                    setCategoryManagerOpen={setCategoryManagerOpen}
                                    expandedBudgetCategory={expandedBudgetCategory}
                                    setExpandedBudgetCategory={setExpandedBudgetCategory}
                                    budgetSortOrder={budgetSortOrder}
                                    setBudgetSortOrder={setBudgetSortOrder}
                                    editingBudget={editingBudget}
                                    setEditingBudget={setEditingBudget}
                                />} />
                                <Route path="/ledger" element={<LedgerView
                                    filteredTotals={filteredTotals}
                                    filteredTransactions={filteredTransactions}
                                    ITEMS_PER_PAGE={ITEMS_PER_PAGE}
                                    currentPage={currentPage}
                                    setCurrentPage={setCurrentPage}
                                    viewAllTime={viewAllTime}
                                    setViewAllTime={setViewAllTime}
                                    filterStartDate={filterStartDate}
                                    setFilterStartDate={setFilterStartDate}
                                    filterEndDate={filterEndDate}
                                    setFilterEndDate={setFilterEndDate}
                                    selectedMonth={selectedMonth}
                                    setSelectedMonth={setSelectedMonth}
                                    theme={theme}
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    showAdvancedFilters={showAdvancedFilters}
                                    setShowAdvancedFilters={setShowAdvancedFilters}
                                    sortBy={sortBy}
                                    setSortBy={setSortBy}
                                    filterMinAmount={filterMinAmount}
                                    setFilterMinAmount={setFilterMinAmount}
                                    filterMaxAmount={filterMaxAmount}
                                    setFilterMaxAmount={setFilterMaxAmount}
                                    filterCategory={filterCategory}
                                    setFilterCategory={setFilterCategory}
                                    categories={categories}
                                    resetFilters={resetFilters}
                                    runExport={runExport}
                                    allTags={allTags}
                                    filterTag={filterTag}
                                    setFilterTag={setFilterTag}
                                    setEditingTransaction={setEditingTransaction}
                                    setTransactionModalOpen={setTransactionModalOpen}
                                    setEditingSubscription={setEditingSubscription}
                                    setSubscriptionModalOpen={setSubscriptionModalOpen}
                                    subscriptions={subscriptions}
                                    transactions={transactions}
                                />
                                } />
                                <Route path="/accounts" element={<AccountsView
                                    accounts={accounts}
                                    setEditingAccount={setEditingAccount}
                                    setAccountModalOpen={setAccountModalOpen}
                                    setTransferModalOpen={setTransferModalOpen}
                                    setTransferHistoryOpen={setTransferHistoryOpen}
                                    theme={theme}
                                    metrics={metrics}
                                    history={history}
                                    setReconcileModalOpen={setReconcileModalOpen}
                                    setViewingAccount={setViewingAccount}
                                    setAccountGraphOpen={setAccountGraphOpen}
                                />} />
                                <Route path="/bounty" element={<ReceivablesView
                                    user={user}
                                    transactions={transactions}
                                    accounts={accounts}
                                    theme={theme}
                                    categories={categories}
                                    formatCurrency={formatCurrency}
                                    onResolve={handleResolveDebt}
                                    onEdit={(t) => {
                                        setEditingTransaction(t);
                                        setTransactionModalOpen(true);
                                    }}
                                />} />
                                <Route path="/settings" element={
                                    <div className="max-w-2xl mx-auto space-y-6">
                                        {user?.isAnonymous ? (
                                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 mb-6">
                                                <p className="font-bold flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Not Synced</p>
                                                <p className="text-sm opacity-90 mb-4">Sign in to save your chronicle to the cloud and access it from any device.</p>
                                                <button onClick={handleGoogleSignIn} className="w-full old-book-btn p-3 rounded font-bold flex items-center justify-center gap-2">
                                                    <div className="p-1 bg-white rounded-full"><svg width="12" height="12" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg></div>
                                                    Sign in with Google
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 mb-6">
                                                <p className="font-bold flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Synced</p>
                                                <p className="text-sm opacity-90 mb-4">Your data is safely stored in the cloud.</p>
                                                <button onClick={handleSignOut} className="w-full border-2 border-red-200 text-red-600 hover:bg-red-50 p-3 rounded font-bold flex items-center justify-center gap-2 transition-colors">
                                                    <LogOut size={16} /> Sign Out
                                                </button>
                                            </div>
                                        )}

                                        <Card title="Customization" theme={theme}>
                                            <div className="space-y-4 p-4">
                                                <p className="font-bold text-lg border-b pb-2" style={{ borderColor: theme.borderColor }}>App Appearance</p>

                                                {/* Image options removed */}

                                                <div>
                                                    <p className="text-sm font-bold opacity-70 mb-2">Default Account</p>
                                                    <select
                                                        value={defaultAccountId}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setDefaultAccountId(val);
                                                            if (user) setDoc(doc(getSubColl(user.uid, 'settings'), 'config'), { defaultAccountId: val }, { merge: true });
                                                        }}
                                                        className="w-full p-2 border rounded bg-white"
                                                    >
                                                        <option value="">None (Cash/Other)</option>
                                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                    </select>
                                                    <p className="text-[10px] opacity-60 mt-1">New transactions will default to this account.</p>
                                                </div>

                                                <div className="pt-4 mt-6 border-t border-gray-200">
                                                    <button
                                                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                                                        className="flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity w-full"
                                                    >
                                                        {showAdvancedSettings ? <ChevronDown size={16} /> : <ChevronRightIcon size={16} />}
                                                        <span>Advanced Settings</span>
                                                    </button>

                                                    {showAdvancedSettings && (
                                                        <div className="mt-4 space-y-6 animate-in slide-in-from-top-2 fade-in duration-200">
                                                            <div>
                                                                <p className="text-sm font-bold opacity-70 mb-2">Gemini API Key (for Scribe)</p>
                                                                <input
                                                                    type="password"
                                                                    placeholder="Paste API Key here..."
                                                                    className="w-full p-2 border rounded bg-white"
                                                                    value={geminiApiKey}
                                                                    onChange={(e) => {
                                                                        const key = e.target.value;
                                                                        setGeminiApiKey(key);
                                                                        localStorage.setItem('chronicle_gemini_key', key);
                                                                    }}
                                                                />
                                                                {geminiApiKey && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setGeminiApiKey('');
                                                                            localStorage.removeItem('chronicle_gemini_key');
                                                                        }}
                                                                        className="mt-2 text-xs text-red-500 hover:underline"
                                                                    >
                                                                        Clear Key
                                                                    </button>
                                                                )}
                                                                <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline mt-1 block text-xs">Get a key here</a>
                                                            </div>

                                                            <div className="p-4 bg-gray-100 rounded border">
                                                                <p className="font-bold text-sm mb-2 uppercase opacity-70">Advanced Debugging</p>

                                                                <div className="mb-4">
                                                                    <label className="block text-xs font-bold mb-1">Data Source (App ID)</label>
                                                                    <select
                                                                        value={appId}
                                                                        onChange={(e) => {
                                                                            const newId = e.target.value;
                                                                            setAppId(newId);
                                                                            localStorage.setItem('chronicle_app_id', newId);
                                                                            window.location.reload(); // Reload to ensure clean state
                                                                        }}
                                                                        className="w-full p-2 border rounded text-sm"
                                                                    >
                                                                        <option value="chronicle_v1">chronicle_v1 (Original)</option>
                                                                        <option value="personal-chronicle">personal-chronicle (New)</option>
                                                                    </select>
                                                                    <p className="text-[10px] opacity-60 mt-1">Try switching this if your data is missing.</p>
                                                                </div>

                                                                <div className="mb-4">
                                                                    <label className="block text-xs font-bold mb-1">User ID</label>
                                                                    <code className="block w-full p-2 bg-white border rounded text-xs overflow-x-auto">{user?.uid}</code>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-xs font-bold mb-1">Scribe Connection</label>
                                                                    <button
                                                                        onClick={handleTestScribe}
                                                                        className="px-3 py-1 bg-white border rounded text-xs font-bold hover:bg-gray-50"
                                                                    >
                                                                        Test Connection
                                                                    </button>
                                                                    {testScribeResult && (
                                                                        <div className={`mt-2 p-2 rounded text-xs border ${testScribeResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                                                            {testScribeResult.message}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                } />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes >
                        </div >
                    </main >

                    {
                        resolutionModalOpen && selectedDebt && (
                            <Modal title="Resolve Debt" onClose={() => setResolutionModalOpen(false)} theme={theme}>
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="text-sm opacity-60 uppercase tracking-widest mb-2">Wanted</div>
                                        <div className="text-2xl font-bold font-cinzel mb-1">{selectedDebt.target}</div>
                                        <div className="text-4xl font-bold text-emerald-700 font-cinzel">{formatCurrency(selectedDebt.amount)}</div>
                                    </div>

                                    <div className="p-4 bg-black/5 rounded border border-dashed" style={{ borderColor: theme.borderColor }}>
                                        <div className="text-xs font-bold uppercase opacity-50 mb-1">Original Transaction</div>
                                        <div className="text-sm italic">"{selectedDebt.originalTransaction.description}"</div>
                                        <div className="text-xs opacity-50 mt-1">{selectedDebt.originalTransaction.date.substring(0, 10)}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => confirmDebtResolution('repaid')}
                                            className="p-4 rounded border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex flex-col items-center gap-2 transition-colors"
                                        >
                                            <div className="p-2 bg-emerald-200 rounded-full text-emerald-800"><Bank size={24} /></div>
                                            <div className="font-bold text-emerald-900">Debt Repaid</div>
                                            <div className="text-xs text-center text-emerald-800/70">Record as Income/Transfer</div>
                                        </button>

                                        <button
                                            onClick={() => confirmDebtResolution('forgiven')}
                                            className="p-4 rounded border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 flex flex-col items-center gap-2 transition-colors"
                                        >
                                            <div className="p-2 bg-amber-200 rounded-full text-amber-800"><Sparkles size={24} /></div>
                                            <div className="font-bold text-amber-900">Forgive Debt</div>
                                            <div className="text-xs text-center text-amber-800/70">Record as Bad Debt Expense</div>
                                        </button>
                                    </div>
                                </div>
                            </Modal>
                        )
                    }

                    {
                        repaymentModalOpen && selectedDebt && (
                            <Modal title="Record Repayment" onClose={() => setRepaymentModalOpen(false)} theme={theme}>
                                <form onSubmit={handleConfirmRepayment} className="space-y-4">
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded text-center">
                                        <div className="text-xs uppercase font-bold text-amber-800 opacity-60">Repayment Amount</div>
                                        <div className="text-3xl font-cinzel font-bold text-amber-900">{formatCurrency(selectedDebt?.amount || 0)}</div>
                                        <div className="text-sm text-amber-800 mt-1">
                                            {selectedDebt?.category === 'payable' ? 'to ' : 'from '}
                                            {selectedDebt?.target}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase mb-2 block">
                                            {selectedDebt?.category === 'payable' ? "Payment Source" : "Deposit To"}
                                        </label>
                                        <select name="targetAccount" required className="w-full p-3 border rounded font-bold" style={{ background: theme.bg, color: theme.text }}>
                                            <option value="" disabled selected>Select an Account</option>
                                            <optgroup label="Bank Accounts">
                                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                                            </optgroup>
                                            <option value="cash_other">Cash / External (Don't update balance)</option>
                                        </select>
                                    </div>

                                    <div className="text-xs opacity-60 italic p-2 border rounded bg-black/5">
                                        {selectedDebt?.category === 'payable'
                                            ? "This will record the payment as an Expense and update the account balance."
                                            : "This will mark the bounty as paid. It will NOT appear as 'Income' in your monthly reports, but the account balance will be updated."}
                                    </div>

                                    <button type="submit" className="w-full old-book-btn p-3 rounded font-bold shadow-md flex items-center justify-center gap-2">
                                        <Bank size={16} /> Confirm {selectedDebt?.category === 'payable' ? "Payment" : "Receipt"}
                                    </button>
                                </form>
                            </Modal>
                        )
                    }

                    {
                        scribeModalOpen && (
                            <Modal title="The Scribe" onClose={() => { setScribeModalOpen(false); setScribePreview(null); }} theme={theme}>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm opacity-70 italic border-b pb-2" style={{ borderColor: theme.borderColor }}>
                                        <Sparkles size={16} />
                                        <span>"Tell me your tale, and I shall record it."</span>
                                    </div>

                                    {!scribePreview ? (
                                        <>
                                            <div className="relative">
                                                <textarea
                                                    className="w-full h-40 p-4 font-serif text-lg rounded border-2 resize-none outline-none"
                                                    style={{ backgroundColor: theme.bg, color: theme.text, borderColor: theme.borderColor }}
                                                    value={scribeInput}
                                                    onChange={(e) => setScribeInput(e.target.value)}
                                                    placeholder="e.g. I spent 40 dollars on groceries today..."
                                                ></textarea>
                                                <div className="absolute bottom-2 right-2">
                                                    <button
                                                        onClick={toggleListening}
                                                        className={`p-3 rounded-full shadow-lg transition-all ${isListening ? 'bg-red-600 text-white mic-active' : 'bg-black/10 hover:bg-black/20 text-current'}`}
                                                        title="Toggle Voice Input"
                                                    >
                                                        <Mic size={20} />
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleScribeRequest()}
                                                disabled={isProcessingScribe}
                                                className={`w-full old-book-btn p-3 rounded font-bold shadow-md flex justify-center items-center gap-2 ${isProcessingScribe ? 'opacity-50 cursor-wait' : ''}`}
                                            >
                                                {isProcessingScribe ? (
                                                    <>Processing <span className="animate-pulse">...</span></>
                                                ) : (
                                                    <>Process Request <ArrowRight size={16} /></>
                                                )}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="p-4 rounded border bg-black/5" style={{ borderColor: theme.borderColor }}>
                                                <h3 className="font-bold uppercase text-xs mb-2 opacity-70">Proposed Actions</h3>
                                                <div className="space-y-2">
                                                    {scribePreview.map((action, idx) => (
                                                        <div key={idx} className="text-sm p-2 bg-white/50 rounded border" style={{ borderColor: theme.borderColor }}>
                                                            <div className="font-bold">{action.action.replace(/_/g, ' ').toUpperCase()}</div>
                                                            <div className="text-xs opacity-70 mt-1 font-mono">{JSON.stringify(action, null, 2)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setScribePreview(null)}
                                                    className="flex-1 p-3 rounded font-bold border-2 hover:bg-black/5 transition-colors"
                                                    style={{ borderColor: theme.borderColor, color: theme.text }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        await handleImport(JSON.stringify(scribePreview));
                                                        setScribePreview(null);
                                                    }}
                                                    className="flex-1 old-book-btn p-3 rounded font-bold shadow-md"
                                                >
                                                    Confirm & Execute
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Modal>
                        )
                    }

                    {
                        accountModalOpen && (
                            <Modal title={editingAccount ? "Edit Account" : "New Account"} onClose={() => setAccountModalOpen(false)} theme={theme}>
                                <form onSubmit={handleAccountSave} className="space-y-4">
                                    <div><label className="text-xs font-bold uppercase">Account Name</label><input name="name" required defaultValue={editingAccount?.name} className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }} /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs font-bold uppercase">Type</label><select name="type" defaultValue={editingAccount?.type || 'asset'} className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }}><option value="asset">Asset</option><option value="liability">Liability</option></select></div>
                                        <div><label className="text-xs font-bold uppercase">Subtype</label><select name="subtype" defaultValue={editingAccount?.subtype || 'other'} className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }}><option value="checking">Checking</option><option value="savings">Savings</option><option value="investment">Investment</option><option value="tangible">Tangible Asset</option><option value="credit_card">Credit Card</option><option value="loan">Loan</option><option value="cash">Cash</option><option value="other">Other</option></select></div>
                                    </div>
                                    <div><label className="text-xs font-bold uppercase">Current Balance</label><input type="number" step="0.01" name="balance" required defaultValue={editingAccount?.balance} className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }} /></div>
                                    <button type="submit" className="w-full old-book-btn p-3 rounded font-bold shadow-md">Save Account</button>

                                    {editingAccount && (
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                type="button"
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!confirmDelete) {
                                                        setConfirmDelete(true);
                                                        return;
                                                    }
                                                    const success = await deleteItem('accounts', editingAccount.id);
                                                    if (success) {
                                                        setAccountModalOpen(false);
                                                        setEditingAccount(null);
                                                        showToast('success', 'Account deleted');
                                                    }
                                                }}
                                                className={`flex-1 p-3 rounded font-bold border-2 transition-colors ${confirmDelete ? 'bg-red-600 text-white border-red-600' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                                            >
                                                {confirmDelete ? "Confirm Delete?" : "Delete Account"}
                                            </button>
                                            {confirmDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDelete(false)}
                                                    className="px-4 rounded font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-100"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </form>
                            </Modal >
                        )
                    }

                    {
                        transferModalOpen && (
                            <Modal title="Transfer Funds" onClose={() => setTransferModalOpen(false)} theme={theme}>
                                <form onSubmit={handleTransfer} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 relative">
                                        <div>
                                            <label className="text-xs font-bold uppercase mb-1 block">From</label>
                                            <select name="fromAccount" required className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }}>
                                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-center pt-4 opacity-50"><ArrowRightLeft size={24} /></div>
                                        <div>
                                            <label className="text-xs font-bold uppercase mb-1 block">To</label>
                                            <select name="toAccount" required className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }}>
                                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-black/5 rounded border border-dashed text-xs opacity-70 italic" style={{ borderColor: theme.borderColor }}>
                                        Note: Transferring to a Liability (like a Credit Card) pays off debt. Transferring from a Liability increases debt.
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold uppercase">Amount</label>
                                            <input type="number" step="0.01" name="amount" required placeholder="0.00" className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase">Date</label>
                                            <input type="date" name="date" required defaultValue={new Date().toISOString().substring(0, 10)} className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase">Description</label>
                                        <input name="description" placeholder="e.g. Pay off Card" className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }} />
                                    </div>

                                    <button type="submit" className="w-full old-book-btn p-3 rounded font-bold shadow-md flex items-center justify-center gap-2">
                                        <ArrowRightLeft size={16} /> Execute Transfer
                                    </button>
                                </form>
                            </Modal>
                        )
                    }

                    {
                        transferHistoryOpen && (
                            <Modal title="Transfer History" onClose={() => setTransferHistoryOpen(false)} theme={theme}>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                    {transfers.length === 0 ? (
                                        <div className="text-center opacity-50 italic py-8">No transfer records found.</div>
                                    ) : (
                                        transfers.map(t => (
                                            <div key={t.id} className="p-3 border rounded flex justify-between items-center text-sm" style={{ borderColor: theme.borderColor, backgroundColor: theme.cardBg }}>
                                                <div>
                                                    <div className="font-bold font-cinzel">{t.description || 'Transfer'}</div>
                                                    <div className="flex items-center gap-2 text-xs opacity-70 mt-1">
                                                        <span>{t.fromName}</span>
                                                        <ArrowRightLeft size={10} />
                                                        <span>{t.toName}</span>
                                                    </div>
                                                    <div className="text-[10px] font-mono opacity-50 mt-1">{t.date ? t.date.substring(0, 10) : 'Unknown Date'}</div>
                                                </div>
                                                <div className="font-mono font-bold">{formatCurrency(t.amount)}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Modal>
                        )
                    }

                    {
                        reconcileModalOpen && (
                            <Modal title="Reconcile Account" onClose={() => setReconcileModalOpen(false)} theme={theme}>
                                <form onSubmit={handleReconcile} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase mb-1 block">Account</label>
                                        <select
                                            name="accountId"
                                            className="w-full p-2 border rounded"
                                            style={{ background: theme.bg, color: theme.text }}
                                            onChange={(e) => setReconcileAccount(accounts.find(a => a.id === e.target.value))}
                                            value={reconcileAccount?.id || ''}
                                        >
                                            <option value="" disabled>Select Account</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Current: {formatCurrency(a.balance)})</option>)}
                                        </select>
                                    </div>
                                    {reconcileAccount && (
                                        <div className="p-4 bg-black/5 rounded border border-dashed text-center" style={{ borderColor: theme.borderColor }}>
                                            <div className="text-xs uppercase font-bold opacity-50">System Balance</div>
                                            <div className="text-2xl font-bold font-cinzel">{formatCurrency(reconcileAccount.balance)}</div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs font-bold uppercase">Actual Balance</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="actualBalance"
                                            required
                                            placeholder="0.00"
                                            className="w-full p-2 border rounded text-lg font-bold"
                                            style={{ background: theme.bg, color: theme.text }}
                                        />
                                    </div>
                                    <div className="text-xs opacity-60 italic">
                                        Chronicle will automatically create a transaction to adjust the difference.
                                    </div>
                                    <button type="submit" className="w-full old-book-btn p-3 rounded font-bold shadow-md flex items-center justify-center gap-2">
                                        <LongFeather size={16} /> Reconcile
                                    </button>
                                </form>
                            </Modal>
                        )
                    }

                    {
                        categoryManagerOpen && <Modal title="Manage Categories" onClose={() => setCategoryManagerOpen(false)} theme={theme}>
                            <div className="space-y-6"><div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">{categories.filter(c => c.id !== 'income').map(cat => (<div key={cat.id} className="flex items-center gap-2 group"><input defaultValue={cat.name} onBlur={(e) => handleUpdateCategoryName(cat.id, e.target.value)} className="flex-1 p-2 border rounded bg-transparent" style={{ borderColor: theme.borderColor, color: theme.text }} /><button onClick={() => handleDeleteCategory(cat.id)} className="p-2 hover:bg-red-100 hover:text-red-600 rounded transition-colors" title="Delete Category"><Trash2 size={16} /></button></div>))}</div><form onSubmit={handleAddCategory} className="pt-4 border-t" style={{ borderColor: theme.borderColor }}><label className="text-xs font-bold uppercase mb-2 block">Add New Category</label><div className="flex gap-2"><input name="newCategoryName" required placeholder="Category Name" className="flex-1 p-2 border rounded" style={{ background: theme.bg, color: theme.text }} /><button type="submit" className="old-book-btn px-4 py-2 rounded font-bold"><Plus size={20} /></button></div></form></div>
                        </Modal>
                    }

                    {
                        accountGraphOpen && viewingAccount && (
                            <Modal title={viewingAccount.name} onClose={() => setAccountGraphOpen(false)} theme={theme}>
                                <div className="flex justify-between items-end"><div><div className="text-sm font-bold uppercase opacity-60">Current Balance</div><div className="text-4xl font-bold font-cinzel text-emerald-600">{formatCurrency(viewingAccount.balance)}</div></div></div>
                                <div className="h-64 w-full border-2 rounded-lg p-4" style={{ backgroundColor: theme.bg, borderColor: theme.borderColor }}>
                                    <AccountHistoryChart history={history} accountId={viewingAccount.id} theme={theme} transactions={transactions} transfers={transfers} currentBalance={viewingAccount.balance} />
                                </div>
                                <div className="flex justify-between pt-4 border-t" style={{ borderColor: theme.borderColor }}>
                                    <button
                                        onClick={() => { setHistoryManagerOpen(true); }}
                                        className="px-4 py-2 rounded border-2 font-bold text-sm hover:bg-black/5 transition-colors flex items-center gap-2"
                                        style={{ borderColor: theme.borderColor, color: theme.text }}
                                    >
                                        <ScrollText size={16} />
                                        <span>View Data</span>
                                    </button>
                                    <button
                                        onClick={() => { setAccountGraphOpen(false); setEditingAccount(viewingAccount); setAccountModalOpen(true); }}
                                        className="px-4 py-2 rounded border-2 font-bold text-sm hover:bg-black/5 transition-colors"
                                        style={{ borderColor: theme.borderColor, color: theme.text }}
                                    >
                                        Edit Account
                                    </button>
                                </div>

                            </Modal >
                        )
                    }

                    {
                        subscriptionModalOpen && <Modal title={editingSubscription ? "Edit Subscription" : "New Subscription"} onClose={() => setSubscriptionModalOpen(false)} theme={theme}>
                            <form onSubmit={handleSubscriptionSave} className="space-y-4">
                                <div><label className="text-xs font-bold uppercase">Name</label><input name="name" defaultValue={editingSubscription?.name} required className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }} placeholder="e.g. Netflix" /></div>
                                <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold uppercase">Amount</label><input name="amount" type="number" step="0.01" defaultValue={editingSubscription?.amount} required className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }} /></div><div><label className="text-xs font-bold uppercase">Day of Month</label><input name="dayOfMonth" type="number" min="1" max="31" defaultValue={editingSubscription?.dayOfMonth || 1} required className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }} /></div></div>
                                <div><label className="text-xs font-bold uppercase">Category</label><select name="category" defaultValue={editingSubscription?.category || 'misc'} className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                <div><label className="text-xs font-bold uppercase">Tags</label><input name="tags" defaultValue={editingSubscription?.tags?.join(', ')} placeholder="comma, separated, tags" className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }} /></div>
                                <div className="text-xs opacity-60 italic p-2 border rounded bg-black/5 border-dashed" style={{ borderColor: theme.borderColor }}>Note: A transaction will be automatically created on this day every month when you open the app.</div>
                                <button type="submit" className="w-full old-book-btn p-3 rounded font-bold shadow-md">Save Subscription</button>

                                {editingSubscription && (
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (!confirmDelete) {
                                                    setConfirmDelete(true);
                                                    return;
                                                }
                                                const success = await deleteItem('subscriptions', editingSubscription.id);
                                                if (success) {
                                                    setSubscriptionModalOpen(false);
                                                    setEditingSubscription(null);
                                                    showToast('success', 'Subscription deleted');
                                                }
                                            }}
                                            className={`flex-1 p-3 rounded font-bold border-2 transition-colors ${confirmDelete ? 'bg-red-600 text-white border-red-600' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                                        >
                                            {confirmDelete ? "Confirm Stop?" : "Stop Subscription"}
                                        </button>
                                        {confirmDelete && (
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDelete(false)}
                                                className="px-4 rounded font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-100"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                )}
                            </form>
                        </Modal>
                    }


                    {
                        transactionModalOpen && (
                            <Modal title={editingTransaction?.id ? "Edit Transaction" : "New Transaction"} onClose={() => setTransactionModalOpen(false)} theme={theme}>
                                <form onSubmit={handleAddTransaction} className="space-y-4">


                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold uppercase">Amount</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="amount"
                                                required={!isSplitMode}
                                                value={transactionAmount}
                                                onChange={(e) => setTransactionAmount(e.target.value)}
                                                className="w-full p-2 border rounded text-lg font-bold"
                                                style={{ background: theme.bg, color: theme.text }}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase">Date</label>
                                            <input type="date" name="date" required defaultValue={editingTransaction?.date ? new Date(editingTransaction.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10)} className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase">Description</label>
                                        <input name="description" required defaultValue={editingTransaction?.description} className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }} />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase">Account</label>
                                        <select
                                            name="accountId"
                                            defaultValue={editingTransaction?.accountId ?? defaultAccountId}
                                            className="w-full p-2 border rounded"
                                            style={{ background: theme.bg, color: theme.text }}
                                        >
                                            <option value="">Cash / Other (No Account)</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between mb-4 border-t pt-4" style={{ borderColor: theme.borderColor }}>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isSplitMode ? 'bg-emerald-600' : 'bg-gray-400'}`} onClick={() => setIsSplitMode(!isSplitMode)}>
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isSplitMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-xs font-bold uppercase">Split Transaction</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isRecurringMode ? 'bg-amber-600' : 'bg-gray-400'}`} onClick={() => setIsRecurringMode(!isRecurringMode)}>
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isRecurringMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-xs font-bold uppercase">Recurring / Subscription</span>
                                            <input type="hidden" name="isRecurring" value={isRecurringMode ? 'on' : ''} />
                                        </label>

                                        {isSplitMode && (
                                            <div className="text-xs font-bold opacity-70">
                                                Total: {formatCurrency(splitRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0))}
                                            </div>
                                        )}
                                    </div>

                                    {isSplitMode ? (
                                        <div className="space-y-3 border-t pt-3" style={{ borderColor: theme.borderColor }}>
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold uppercase">Split Items</label>
                                                <button type="button" onClick={() => addSplitRow()} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 font-bold flex items-center gap-1">
                                                    <Plus size={12} /> Add Item
                                                </button>
                                            </div>

                                            {(() => {
                                                const totalAmount = parseFloat(transactionAmount) || 0;
                                                const splitTotal = splitRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
                                                const mismatch = Math.abs(totalAmount - splitTotal) > 0.02;

                                                if (mismatch) {
                                                    return (
                                                        <div className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded border border-red-200 mb-2">
                                                            Warning: Split total ({formatCurrency(splitTotal)}) does not match transaction amount ({formatCurrency(totalAmount)}).
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {(() => {
                                                const totalAmount = parseFloat(transactionAmount) || 0;
                                                const splitTotal = splitRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
                                                const remaining = totalAmount - splitTotal;
                                                const isRemaining = Math.abs(remaining) > 0.01;

                                                if (isRemaining) {
                                                    return (
                                                        <div className="flex items-center justify-between bg-red-50 p-2 rounded border border-red-100 text-xs">
                                                            <span className="text-red-600 font-bold">Remaining: {formatCurrency(remaining)}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newRow = {
                                                                        id: Date.now(),
                                                                        amount: remaining.toFixed(2),
                                                                        category: 'receivable',
                                                                        type: 'expense',
                                                                        target: 'Unassigned',
                                                                        note: 'Remaining Balance'
                                                                    };
                                                                    setSplitRows([...splitRows, newRow]);
                                                                }}
                                                                className="text-emerald-700 hover:text-emerald-800 underline font-bold"
                                                            >
                                                                To Bounty Board
                                                            </button>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {splitRows.map((row, index) => (
                                                <div key={row.id} className="p-3 border rounded relative group" style={{ borderColor: theme.borderColor, backgroundColor: theme.cardBg }}>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button type="button" onClick={() => removeSplitRow(row.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                                        <div>
                                                            <label className="text-[10px] font-bold uppercase opacity-70">{index === 0 ? "My Portion" : "Amount"}</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={row.amount}
                                                                onChange={(e) => updateSplitRow(row.id, 'amount', e.target.value)}
                                                                className="w-full p-1 border rounded text-sm"
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold uppercase opacity-70">Category</label>
                                                            <select
                                                                value={row.category}
                                                                onChange={(e) => updateSplitRow(row.id, 'category', e.target.value)}
                                                                className="w-full p-1 border rounded text-sm"
                                                            >
                                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                <option value="receivable">Receivable (Bounty)</option>
                                                                <option value="payable">Payable (Debt)</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    {(row.category === 'receivable' || row.category === 'payable') && (
                                                        <div className="mb-2">
                                                            <label className="text-[10px] font-bold uppercase opacity-70">
                                                                {row.category === 'receivable' ? "Target (Who owes you?)" : "Target (Who do you owe?)"}
                                                            </label>
                                                            <input
                                                                value={row.target || ''}
                                                                onChange={(e) => updateSplitRow(row.id, 'target', e.target.value)}
                                                                className="w-full p-1 border rounded text-sm bg-yellow-50"
                                                                placeholder="e.g. John Doe"
                                                            />
                                                        </div>
                                                    )}
                                                    <input
                                                        value={row.note || ''}
                                                        onChange={(e) => updateSplitRow(row.id, 'note', e.target.value)}
                                                        className="w-full p-1 border-b text-xs bg-transparent focus:outline-none focus:border-emerald-500"
                                                        placeholder="Add a note..."
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold uppercase">Type</label>
                                                    <select name="type" defaultValue={editingTransaction?.type || 'expense'} className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }}>
                                                        <option value="expense">Expense</option>
                                                        <option value="income">Income</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold uppercase">Category</label>
                                                    <select name="category" defaultValue={editingTransaction?.category || 'food'} className="w-full p-2 border rounded" style={{ background: theme.bg, color: theme.text }}>
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                        </>
                                    )}

                                    {/* Tags Selector - Visible in BOTH modes */}
                                    <div className="border-t pt-3" style={{ borderColor: theme.borderColor }}>
                                        <label className="text-xs font-bold uppercase mb-2 block">Tags</label>
                                        <HybridTagSelector
                                            selectedTags={selectedTags}
                                            onChange={setSelectedTags}
                                            allTags={allTags}
                                            theme={theme}
                                        />
                                    </div>

                                    <button type="submit" className="w-full old-book-btn p-3 rounded font-bold shadow-md">
                                        {editingTransaction ? "Update Transaction" : "Add Transaction"}
                                    </button>

                                    {editingTransaction && (
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                type="button"
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!confirmDelete) {
                                                        setConfirmDelete(true);
                                                        return;
                                                    }
                                                    const success = await handleDeleteTransaction(editingTransaction);
                                                    if (success) {
                                                        setTransactionModalOpen(false);
                                                        setEditingTransaction(null);
                                                        showToast('success', 'Transaction deleted');
                                                    }
                                                }}
                                                className={`flex-1 p-3 rounded font-bold border-2 transition-colors ${confirmDelete ? 'bg-red-600 text-white border-red-600' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                                            >
                                                {confirmDelete ? "Confirm Delete?" : "Delete Transaction"}
                                            </button>
                                            {confirmDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDelete(false)}
                                                    className="px-4 rounded font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-100"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </form>
                            </Modal>
                        )
                    }

                    {notification && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-lg shadow-xl z-50 border-2 font-bold bg-emerald-800 text-white border-emerald-600 animate-bounce">{notification.message}</div>}

                    <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end gap-4 pointer-events-none">
                        {createMenuOpen && (
                            <div
                                className="fixed inset-0 z-[55] pointer-events-auto"
                                onClick={() => setCreateMenuOpen(false)}
                            ></div>
                        )}

                        {createMenuOpen && (
                            <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-10 fade-in duration-200 mb-2 relative z-[60]">
                                <button
                                    onClick={() => { setCreateMenuOpen(false); setEditingTransaction(null); setTransactionModalOpen(true); }}
                                    className="pointer-events-auto px-5 py-3 rounded-xl shadow-xl flex items-center justify-end gap-3 font-bold text-sm hover:scale-105 transition-transform bg-emerald-800 text-emerald-50 border border-emerald-700"
                                >
                                    <span>New Transaction</span>
                                    <div className="bg-emerald-900/30 p-1 rounded-full"><Plus size={16} /></div>
                                </button>

                                <button
                                    onClick={() => { setCreateMenuOpen(false); setEditingTransaction({ isRecurring: true }); setTransactionModalOpen(true); }}
                                    className="pointer-events-auto px-5 py-3 rounded-xl shadow-xl flex items-center justify-end gap-3 font-bold text-sm hover:scale-105 transition-transform bg-orange-800 text-orange-50 border border-orange-700"
                                >
                                    <span>New Subscription</span>
                                    <div className="bg-orange-900/30 p-1 rounded-full"><Repeat size={16} /></div>
                                </button>

                                <button
                                    onClick={() => { setCreateMenuOpen(false); setEditingAccount(null); setAccountModalOpen(true); }}
                                    className="pointer-events-auto px-5 py-3 rounded-xl shadow-xl flex items-center justify-end gap-3 font-bold text-sm hover:scale-105 transition-transform bg-blue-900 text-blue-50 border border-blue-800"
                                >
                                    <span>New Account</span>
                                    <div className="bg-blue-950/30 p-1 rounded-full"><Bank size={16} /></div>
                                </button>

                                <button
                                    onClick={() => { setCreateMenuOpen(false); setScribeModalOpen(true); }}
                                    className="pointer-events-auto px-5 py-3 rounded-xl shadow-xl flex items-center justify-end gap-3 font-bold text-sm hover:scale-105 transition-transform md:hidden bg-purple-900 text-purple-50 border border-purple-800"
                                >
                                    <span>Scribe</span>
                                    <div className="bg-purple-950/30 p-1 rounded-full"><Sparkles size={16} /></div>
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setCreateMenuOpen(!createMenuOpen)}
                            className={`pointer-events-auto old-book-btn w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 hover:brightness-110 transition-all active:scale-95 overflow-hidden border-2 relative z-[60] ${createMenuOpen ? 'rotate-12' : 'rotate-0'}`}
                            style={{ borderColor: theme.secondary }}
                        >
                            {quillUrl ? (
                                <img src={quillUrl} alt="Quill" className="w-full h-full object-cover" />
                            ) : (
                                <LongFeather size={32} />
                            )}
                        </button>
                    </div>

                    {permissionError && <div className="fixed inset-0 bg-red-900/90 z-[9999] flex items-center justify-center text-white p-8"><div className="max-w-lg text-center"><h1 className="text-3xl font-bold mb-4">Database Access Blocked</h1><p>Copy security rules to Firebase Console.</p></div></div>}
                    {
                        historyManagerOpen && viewingAccount && (
                            <HistoryManagerModal
                                isOpen={historyManagerOpen}
                                onClose={() => setHistoryManagerOpen(false)}
                                history={history}
                                accountId={viewingAccount.id}
                                theme={theme}
                                onUpdateHistory={handleUpdateHistory}
                            />
                        )
                    }
                </ErrorBoundary >
            </div >
        </>
    );
};




export default ChronicleApp;
