import React from 'react';

export type TransactionType = 'income' | 'expense';

export interface TransactionCategory {
    id: number;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
}

export interface ParsedTransaction {
    amount: number;
    type: TransactionType;
    bank: string | null;
    date: string | null;
    time: string | null;
}

export interface Transaction extends ParsedTransaction {
    id: number;
    accountId: number;
    category: TransactionCategory;
    notes?: string;
}

export interface Account {
    id: number;
    name: string;
    initialBalance: number;
}

export interface AccountWithBalance extends Account {
    currentBalance: number;
}


export interface Debt {
    id: number;
    description: string;
    amount: number;
    dueDate: string;
    isPaid: boolean;
}

export interface MockSms {
    id: number;
    sender: string;
    text: string;
}
