import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Transaction, ParsedTransaction, TransactionCategory, Account, Debt, MockSms } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import EditTransactionModal from './components/EditTransactionModal';
import { parseBankSms } from './services/geminiService';
import { CATEGORIES, MOCK_SMS_MESSAGES } from './constants';
import BottomNav from './components/BottomNav';
import { HomeIcon, InboxIcon, CreditCardIcon, CogIcon, PlusIcon, TrashIcon, PencilIcon, BankIcon, CalendarIcon } from './components/icons';
import TransactionList from './components/TransactionList';

// A custom hook to persist state in localStorage
function usePersistentState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
            const storedValue = localStorage.getItem(key);
            return storedValue ? JSON.parse(storedValue) : defaultValue;
        } catch (error) {
            console.error("Error reading from localStorage", error);
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.error("Error writing to localStorage", error);
        }
    }, [key, state]);

    return [state, setState];
}


const App: React.FC = () => {
    type View = 'dashboard' | 'inbox' | 'debts' | 'settings' | 'transactions';

    // App State
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [accounts, setAccounts] = usePersistentState<Account[]>('accounts', []);
    const [transactions, setTransactions] = usePersistentState<Transaction[]>('transactions', []);
    const [categories, setCategories] = usePersistentState<TransactionCategory[]>('categories', CATEGORIES);
    const [debts, setDebts] = usePersistentState<Debt[]>('debts', []);
    const [smsInbox, setSmsInbox] = usePersistentState<MockSms[]>('smsInbox', MOCK_SMS_MESSAGES.slice(0, 3));
    
    // Modal and Parsing State
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [parsingError, setParsingError] = useState<string | null>(null);
    const [transactionToEdit, setTransactionToEdit] = useState<Omit<Transaction, 'id' | 'category' | 'accountId'> | null>(null);
    const [smsToProcess, setSmsToProcess] = useState<MockSms | null>(null);

    // Onboarding: If no accounts, force settings view
    useEffect(() => {
        if (accounts.length === 0) {
            setActiveView('settings');
        }
    }, [accounts.length]);

    // Recalculate account balances whenever transactions change
    const accountsWithBalance = useMemo(() => {
        return accounts.map(acc => {
            const balance = transactions.reduce((sum, t) => {
                if (t.accountId !== acc.id) return sum;
                return t.type === 'income' ? sum + t.amount : sum - t.amount;
            }, acc.initialBalance);
            return { ...acc, currentBalance: balance };
        });
    }, [accounts, transactions]);
    
    const handleParseSms = useCallback(async (sms: MockSms) => {
        setIsParsing(true);
        setParsingError(null);
        setSmsToProcess(sms);
        try {
            const parsedData = await parseBankSms(sms.text);
            if (!parsedData || !parsedData.amount || !parsedData.type) {
                 throw new Error("اطلاعات استخراج شده از پیامک ناقص است.");
            }
            setTransactionToEdit({
                ...parsedData,
                date: parsedData.date || new Date().toLocaleDateString('fa-IR-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }),
            });
            setEditModalOpen(true);
        } catch (error) {
            console.error("Error parsing SMS:", error);
            setParsingError(error instanceof Error ? error.message : "خطا در پردازش پیامک. لطفاً دوباره تلاش کنید.");
        } finally {
            setIsParsing(false);
        }
    }, []);

    const handleSaveTransaction = useCallback((details: { category: TransactionCategory; notes: string, accountId: number }) => {
        if (transactionToEdit && details.accountId) {
            const newTransaction: Transaction = {
                id: Date.now(),
                ...transactionToEdit,
                category: details.category,
                notes: details.notes,
                accountId: details.accountId,
            };
            setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()));
            
            // Remove the processed SMS from the inbox
            if(smsToProcess) {
                setSmsInbox(prev => prev.filter(s => s.id !== smsToProcess.id));
            }

            // Reset all related state
            setEditModalOpen(false);
            setTransactionToEdit(null);
            setSmsToProcess(null);
            setParsingError(null); // Explicitly reset parsing error on successful save
        }
    }, [transactionToEdit, smsToProcess, setTransactions, setSmsInbox]);
    
    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setTransactionToEdit(null);
        setSmsToProcess(null);
        setParsingError(null); // Also clear error when abandoning the process
    };
    
    const handleAddNewSms = () => {
        const unusedSms = MOCK_SMS_MESSAGES.filter(mock => !smsInbox.some(inboxSms => inboxSms.id === mock.id));
        if (unusedSms.length > 0) {
            const randomIndex = Math.floor(Math.random() * unusedSms.length);
            setSmsInbox(prev => [unusedSms[randomIndex], ...prev]);
        } else {
            alert('پیامک جدیدی برای نمایش وجود ندارد.');
        }
    };
    
    const renderView = () => {
        switch (activeView) {
            case 'dashboard':
                return <Dashboard accounts={accountsWithBalance} transactions={transactions} debts={debts} />;
            case 'inbox':
                return <InboxView smsInbox={smsInbox} onParse={handleParseSms} onAddNewSms={handleAddNewSms} isParsing={isParsing} parsingError={parsingError} smsToProcess={smsToProcess}/>;
            case 'debts':
                return <DebtsView debts={debts} setDebts={setDebts} />;
            case 'transactions':
                return <div className="p-4"><TransactionList transactions={transactions} title="همه تراکنش‌ها"/></div>;
            case 'settings':
                return <SettingsView accounts={accounts} setAccounts={setAccounts} categories={categories} setCategories={setCategories} />;
            default:
                return <Dashboard accounts={accountsWithBalance} transactions={transactions} debts={debts} />;
        }
    };

    return (
        <div className="max-w-md mx-auto min-h-screen bg-gray-50 shadow-lg flex flex-col">
            <Header />
            <main className="flex-grow overflow-y-auto pb-20">
                {renderView()}
            </main>
            <BottomNav activeView={activeView} setActiveView={setActiveView} />

            {isEditModalOpen && transactionToEdit && (
                <EditTransactionModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    onSave={handleSaveTransaction}
                    transaction={transactionToEdit}
                    categories={categories}
                    accounts={accounts}
                />
            )}
        </div>
    );
};

// --- Views --- //
const InboxView: React.FC<{smsInbox: MockSms[], onParse: (sms: MockSms) => void, onAddNewSms: () => void, isParsing: boolean, parsingError: string | null, smsToProcess: MockSms | null}> = ({smsInbox, onParse, onAddNewSms, isParsing, parsingError, smsToProcess}) => (
    <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">صندوق ورودی پیامک</h2>
            <button onClick={onAddNewSms} className="bg-indigo-100 text-indigo-700 text-sm font-semibold px-3 py-1 rounded-md hover:bg-indigo-200">دریافت پیامک جدید</button>
        </div>
        {parsingError && <p className="text-red-500 bg-red-100 p-3 rounded-lg">{parsingError}</p>}
        {smsInbox.length === 0 && <p className="text-center text-gray-500 py-8">صندوق ورودی شما خالی است.</p>}
        <div className="space-y-3">
        {smsInbox.map(sms => (
            <div key={sms.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500 mb-2">از طرف: {sms.sender}</p>
                <p className="text-gray-800 whitespace-pre-wrap">{sms.text}</p>
                <div className="mt-4">
                    <button 
                        onClick={() => onParse(sms)} 
                        disabled={isParsing && smsToProcess?.id === sms.id}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                    >
                         {isParsing && smsToProcess?.id === sms.id ? 'در حال پردازش...' : 'افزودن به تراکنش‌ها'}
                    </button>
                </div>
            </div>
        ))}
        </div>
    </div>
);

const DebtsView: React.FC<{debts: Debt[], setDebts: React.Dispatch<React.SetStateAction<Debt[]>>}> = ({debts, setDebts}) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');

    const handleAddDebt = (e: React.FormEvent) => {
        e.preventDefault();
        if(description && amount && dueDate) {
            const newDebt: Debt = { id: Date.now(), description, amount: parseFloat(amount), dueDate, isPaid: false };
            setDebts(prev => [newDebt, ...prev]);
            setDescription(''); setAmount(''); setDueDate('');
        }
    };
    
    const togglePaid = (id: number) => {
      setDebts(debts.map(d => d.id === id ? {...d, isPaid: !d.isPaid} : d));
    }

    const getDueDateStatus = (dueDate: string, isPaid: boolean): {text: string, color: string} => {
        if(isPaid) return {text: 'پرداخت شده', color: 'text-green-600'};
        const today = new Date();
        today.setHours(0,0,0,0);
        const due = new Date(dueDate);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) return {text: `${diffDays} روز مانده`, color: 'text-yellow-600'};
        if (diffDays === 0) return {text: 'امروز!', color: 'text-red-600 font-bold'};
        return {text: `${Math.abs(diffDays)} روز گذشته`, color: 'text-red-500'};
    }
    
    return (
        <div className="p-4 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-bold text-lg mb-4">افزودن بدهی/قسط جدید</h3>
                <form onSubmit={handleAddDebt} className="space-y-3">
                    <input type="text" placeholder="عنوان (مثال: قسط وام)" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-md"/>
                    <input type="number" placeholder="مبلغ (به ریال)" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded-md"/>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-md"/>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700">افزودن</button>
                </form>
            </div>

            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-3">لیست بدهی‌ها</h2>
                <div className="space-y-3">
                    {debts.length === 0 && <p className="text-center text-gray-500 py-8">هیچ بدهی ثبت نشده است.</p>}
                    {debts.map(debt => {
                        const status = getDueDateStatus(debt.dueDate, debt.isPaid);
                        return (
                            <div key={debt.id} className={`bg-white p-4 rounded-lg shadow-sm border-r-4 ${debt.isPaid ? 'border-green-500' : 'border-gray-300'} opacity-${debt.isPaid ? '60' : '100'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className={`font-bold ${debt.isPaid ? 'line-through' : ''}`}>{debt.description}</p>
                                        <p className="text-gray-600 font-mono">{new Intl.NumberFormat('fa-IR').format(debt.amount)} ریال</p>
                                    </div>
                                    <p className={`text-sm font-semibold ${status.color}`}>{status.text}</p>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-sm">
                                   <p className="text-gray-500">سررسید: {new Date(debt.dueDate).toLocaleDateString('fa-IR')}</p>
                                   <button onClick={() => togglePaid(debt.id)} className="text-indigo-600 font-semibold">{debt.isPaid ? 'لغو پرداخت' : 'پرداخت شد'}</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};


const SettingsView: React.FC<{accounts: Account[], setAccounts: React.Dispatch<React.SetStateAction<Account[]>>, categories: TransactionCategory[], setCategories: React.Dispatch<React.SetStateAction<TransactionCategory[]>>}> = ({accounts, setAccounts, categories, setCategories}) => {
    const [accName, setAccName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');

    const handleAddAccount = (e: React.FormEvent) => {
        e.preventDefault();
        if (accName && initialBalance) {
            const newAccount: Account = { id: Date.now(), name: accName, initialBalance: parseFloat(initialBalance) };
            setAccounts(prev => [...prev, newAccount]);
            setAccName('');
            setInitialBalance('');
        }
    };

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if(newCategoryName && !categories.some(c => c.name === newCategoryName)) {
            const newCategory: TransactionCategory = { id: Date.now(), name: newCategoryName, icon: PencilIcon };
            setCategories(prev => [...prev, newCategory]);
            setNewCategoryName('');
        }
    }

    return (
        <div className="p-4 space-y-6">
            {accounts.length === 0 && (
                <div className="bg-yellow-100 border-r-4 border-yellow-500 text-yellow-700 p-4 rounded-lg" role="alert">
                    <p className="font-bold">خوش آمدید!</p>
                    <p>برای شروع، لطفاً اولین حساب بانکی خود را با موجودی اولیه ثبت کنید.</p>
                </div>
            )}

            {/* Manage Accounts */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-bold text-lg mb-4">مدیریت حساب‌های بانکی</h3>
                <div className="space-y-2 mb-4">
                    {accounts.map(acc => (
                        <div key={acc.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                           <BankIcon className="w-5 h-5 text-gray-500" />
                           <span className="font-semibold flex-grow">{acc.name}</span>
                           <span className="text-sm text-gray-600">موجودی اولیه: {new Intl.NumberFormat('fa-IR').format(acc.initialBalance)} ریال</span>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleAddAccount} className="space-y-3 border-t pt-4">
                    <h4 className="font-semibold">افزودن حساب جدید</h4>
                    <input type="text" placeholder="نام حساب (مثال: بانک ملی)" value={accName} onChange={e => setAccName(e.target.value)} className="w-full p-2 border rounded-md"/>
                    <input type="number" placeholder="موجودی اولیه (به ریال)" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} className="w-full p-2 border rounded-md"/>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700">افزودن حساب</button>
                </form>
            </div>
            
            {/* Manage Categories */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-bold text-lg mb-4">مدیریت دسته‌بندی‌ها</h3>
                 <div className="flex flex-wrap gap-2 mb-4">
                    {categories.map(cat => (
                        <span key={cat.id} className="bg-gray-200 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">{cat.name}</span>
                    ))}
                </div>
                <form onSubmit={handleAddCategory} className="space-y-3 border-t pt-4">
                    <h4 className="font-semibold">افزودن دسته‌بندی جدید</h4>
                    <input type="text" placeholder="نام دسته‌بندی" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="w-full p-2 border rounded-md"/>
                    <button type="submit" className="w-full bg-gray-600 text-white font-bold py-2 rounded-lg hover:bg-gray-700">افزودن دسته‌بندی</button>
                </form>
            </div>

        </div>
    );
};

export default App;