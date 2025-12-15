
import React, { useState, useEffect } from 'react';

interface BudgetFormProps {
    isOpen: boolean;
    currentBudget: number | null;
    onSetBudget: (budget: number) => void;
    onClearBudget: () => void;
    onClose: () => void;
}

const formatPriceInput = (value: string): string => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') return '';
    
    const padded = digitsOnly.padStart(3, '0');
    const integerPart = padded.slice(0, -2);
    const decimalPart = padded.slice(-2);
    const finalIntegerPart = integerPart.replace(/^0+(?=\d)/, '');
    return `${finalIntegerPart},${decimalPart}`;
};

export const BudgetForm: React.FC<BudgetFormProps> = ({ isOpen, currentBudget, onSetBudget, onClearBudget, onClose }) => {
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (currentBudget) {
                const fixed = currentBudget.toFixed(2);
                setInputValue(fixed.replace('.', ','));
            } else {
                setInputValue('');
            }
        }
    }, [currentBudget, isOpen]);

    const handleSetBudget = (e: React.FormEvent) => {
        e.preventDefault();
        const newBudget = parseFloat(inputValue.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(newBudget) && newBudget > 0) {
            onSetBudget(newBudget);
        }
        onClose();
    };
    
    const handleClear = () => {
        onClearBudget();
        onClose();
    }
    
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
          document.body.style.overflow = 'hidden';
          window.addEventListener('keydown', handleEscape);
        } else {
          document.body.style.overflow = 'auto';
        }
        return () => { 
            document.body.style.overflow = 'auto';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[130] bg-gray-900/50 p-4 flex items-center justify-center animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-sm overflow-hidden rounded-xl bg-background-light dark:bg-background-dark shadow-lg flex flex-col animate-slideUp" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white transition-colors hover:bg-black/40" aria-label="Fechar">
                    <span className="material-symbols-outlined !text-xl">close</span>
                </button>
                <div className="@container">
                    <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden min-h-[160px]" data-alt="Ilustração estilizada de uma cesta de compras com moedas flutuantes." style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB5zOmaIyxZ3pWob2WHPdhKwAyNK-HfgxGXpq4nHdP11w_421cxhYOHFks3Ng8PMwdwWujA681kswrRTdZcJLnI7D0SJ2ZkHtRVAFjPzG56_ukeaxHWIJzlwVrLl4vEMVTcaU-0IPsOPfDFKS1hBxU7OoQ1LQqwpzpWjSgedDz_n7WELr1KmteiYUs0O3TG5GzLOUt_-QA0DEfBBmIy4vdRn20PNdeCylWew1CdIvQQ2UFG8nYHavLzRTtmdkvO_leRy18zJO98PtsF")'}}></div>
                </div>
                <div className="flex flex-col p-6 space-y-4">
                    <form onSubmit={handleSetBudget}>
                        <h2 className="text-[#333333] dark:text-gray-200 tracking-tight text-2xl font-bold text-center">Meu Orçamento</h2>
                        <p className="text-[#888888] dark:text-gray-400 text-base font-normal leading-normal text-center">Qual o valor máximo para esta compra?</p>
                        <div className="flex flex-wrap items-end gap-4 py-2">
                            <label className="flex flex-col min-w-40 flex-1">
                                <span className="sr-only">Orçamento</span>
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-base text-[#888888] dark:text-gray-400">R$</span>
                                    <input
                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#333333] dark:text-gray-200 focus:outline-0 focus:ring-2 focus:ring-green-500/50 border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-800 focus:border-green-500 h-14 placeholder:text-[#888888] dark:placeholder:text-gray-500 pl-10 p-[15px] text-base font-normal leading-normal text-right"
                                        placeholder="0,00"
                                        type="text"
                                        inputMode="numeric"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(formatPriceInput(e.target.value))}
                                    />
                                </div>
                            </label>
                        </div>
                        <div className="flex flex-col gap-3 pt-2">
                             <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={onClose} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-gray-100 dark:bg-white/10 text-[#888888] dark:text-gray-400 text-base font-bold leading-normal tracking-[0.015em] transition-colors hover:bg-gray-200 dark:hover:bg-white/20 shadow-sm">
                                    <span className="truncate">Cancelar</span>
                                </button>
                                <button type="submit" className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-green-600 hover:bg-green-700 text-white text-base font-bold leading-normal tracking-[0.015em] transition-opacity shadow-lg">
                                    <span className="truncate">{currentBudget ? 'Atualizar' : 'Salvar'}</span>
                                </button>
                             </div>
                             {currentBudget !== null && (
                                <button type="button" onClick={handleClear} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-base font-bold leading-normal tracking-[0.015em] transition-opacity shadow-sm">
                                    <span className="truncate">Remover Orçamento</span>
                                </button>
                             )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
    