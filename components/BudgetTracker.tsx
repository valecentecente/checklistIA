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
            // Format existing budget to match the input format (e.g. 100.00 -> 100,00)
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
        // Convert formatted string (e.g. "150,00") back to number
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
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-background-light dark:bg-surface-dark shadow-2xl flex flex-col animate-slideUp" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white transition-colors hover:bg-black/40 backdrop-blur-md" aria-label="Fechar">
                    <span className="material-symbols-outlined !text-xl">close</span>
                </button>
                
                <div className="@container">
                    {/* Imagem reduzida de 160px para 130px para ganhar espaço no mobile */}
                    <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden min-h-[130px]" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB5zOmaIyxZ3pWob2WHPdhKwAyNK-HfgxGXpq4nHdP11w_421cxhYOHFks3Ng8PMwdwWujA681kswrRTdZcJLnI7D0SJ2ZkHtRVAFjPzG56_ukeaxHWIJzlwVrLl4vEMVTcaU-0IPsOPfDFKS1hBxU7OoQ1LQqwpzpWjSgedDz_n7WELr1KmteiYUs0O3TG5GzLOUt_-QA0DEfBBmIy4vdRn20PNdeCylWew1CdIvQQ2UFG8nYHavLzRTtmdkvO_leRy18zJO98PtsF")'}}></div>
                </div>

                <div className="flex flex-col p-6 space-y-4">
                    <form onSubmit={handleSetBudget}>
                        <h2 className="text-[#333333] dark:text-gray-100 tracking-tight text-2xl font-black text-center font-display">Meu Orçamento</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-tight text-center mt-1">Qual o limite para gastar nesta compra?</p>
                        
                        <div className="flex flex-wrap items-end gap-4 py-4">
                            <label className="flex flex-col min-w-40 flex-1">
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-lg font-bold text-primary">R$</span>
                                    <input
                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-2xl text-2xl font-black text-[#333333] dark:text-white border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:border-primary focus:ring-0 h-16 pl-12 pr-4 text-right shadow-inner"
                                        placeholder="0,00"
                                        type="text"
                                        inputMode="numeric"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(formatPriceInput(e.target.value))}
                                        autoFocus
                                    />
                                </div>
                            </label>
                        </div>

                        {/* LEGENDA DE CORES DISCRETA */}
                        <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 mb-4">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">Indicador de Gasto</p>
                            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">No Orçamento</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">Atenção (80%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">No Limite (95%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
                                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">Estourado!</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                             <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={onClose} className="flex w-full cursor-pointer items-center justify-center rounded-xl h-14 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-sm font-bold transition-all active:scale-95">
                                    <span>Cancelar</span>
                                </button>
                                <button type="submit" className="flex w-full cursor-pointer items-center justify-center rounded-xl h-14 bg-green-600 hover:bg-green-700 text-white text-sm font-black uppercase tracking-wide shadow-lg active:scale-95 transition-all">
                                    <span>{currentBudget ? 'Atualizar' : 'Ativar'}</span>
                                </button>
                             </div>
                             {currentBudget !== null && (
                                <button type="button" onClick={handleClear} className="flex w-full cursor-pointer items-center justify-center rounded-xl h-12 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                                    <span>Remover Orçamento</span>
                                </button>
                             )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};