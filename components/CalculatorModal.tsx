
import React, { useState, useEffect, useCallback } from 'react';

interface CalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CalculatorButton: React.FC<{ onClick: () => void; className?: string; children: React.ReactNode }> = ({ onClick, className, children }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center h-16 rounded-xl text-2xl font-semibold transition-colors duration-150 active:scale-95 touch-manipulation select-none ${className}`}
    >
        {children}
    </button>
);

const formatNumberInput = (value: string) => {
    // Permite apenas números e uma vírgula
    return value.replace(/[^0-9,]/g, '').replace(/(,.*),/g, '$1');
};

const parseLocaleNumber = (value: string) => {
    if (!value) return 0;
    return parseFloat(value.replace(',', '.'));
};

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'calculator' | 'comparator'>('calculator');

    // --- CALCULATOR STATE ---
    const [displayValue, setDisplayValue] = useState('0');
    const [firstOperand, setFirstOperand] = useState<number | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);

    // --- COMPARATOR STATE ---
    const [priceA, setPriceA] = useState('');
    const [amountA, setAmountA] = useState('');
    const [priceB, setPriceB] = useState('');
    const [amountB, setAmountB] = useState('');

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);
    
    // --- CALCULATOR LOGIC ---
    const resetCalculator = useCallback(() => {
        setDisplayValue('0');
        setFirstOperand(null);
        setOperator(null);
        setWaitingForSecondOperand(false);
    }, []);

    const performCalculation = (first: number, second: number, op: string): number => {
        switch (op) {
            case '+': return first + second;
            case '-': return first - second;
            case '*': return first * second;
            case '/': return second === 0 ? NaN : first / second;
            default: return second;
        }
    };

    const handleDigitClick = (digit: string) => {
        if (waitingForSecondOperand) {
            setDisplayValue(digit);
            setWaitingForSecondOperand(false);
        } else {
            setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
        }
    };
    
    const handleDecimalClick = () => {
        if (!displayValue.includes('.')) {
            setDisplayValue(displayValue + '.');
        }
    };

    const handleOperatorClick = (nextOperator: string) => {
        const inputValue = parseFloat(displayValue);

        if (operator && waitingForSecondOperand) {
            setOperator(nextOperator);
            return;
        }
        
        if (firstOperand === null) {
            setFirstOperand(inputValue);
        } else if (operator) {
            const result = performCalculation(firstOperand, inputValue, operator);
            const resultString = isNaN(result) ? "Error" : String(result);
            setDisplayValue(resultString);
            setFirstOperand(isNaN(result) ? null : result);
        }
        
        setWaitingForSecondOperand(true);
        setOperator(nextOperator);
    };

    const handleEqualsClick = () => {
        const inputValue = parseFloat(displayValue);
        if (operator && firstOperand !== null) {
            const result = performCalculation(firstOperand, inputValue, operator);
            const resultString = isNaN(result) ? "Error" : String(result);
            setDisplayValue(resultString);
            setFirstOperand(null);
            setOperator(null);
            setWaitingForSecondOperand(true);
        }
    };

    // --- COMPARATOR LOGIC ---
    const calculateComparison = () => {
        const pA = parseLocaleNumber(priceA);
        const qA = parseLocaleNumber(amountA);
        const pB = parseLocaleNumber(priceB);
        const qB = parseLocaleNumber(amountB);

        if (!pA || !qA || !pB || !qB) return null;

        const unitPriceA = pA / qA;
        const unitPriceB = pB / qB;

        let winner: 'A' | 'B' | 'Equal' = 'Equal';
        let savingsPercent = 0;

        if (unitPriceA < unitPriceB) {
            winner = 'A';
            savingsPercent = ((unitPriceB - unitPriceA) / unitPriceB) * 100;
        } else if (unitPriceB < unitPriceA) {
            winner = 'B';
            savingsPercent = ((unitPriceA - unitPriceB) / unitPriceA) * 100;
        }

        return { winner, savingsPercent: Math.round(savingsPercent) };
    };

    const comparisonResult = calculateComparison();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                {/* Header Tabs */}
                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-t-2xl">
                    <button 
                        onClick={() => setActiveTab('calculator')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'calculator' 
                            ? 'bg-white dark:bg-zinc-700 text-primary dark:text-orange-400 shadow-sm' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">calculate</span>
                        Calculadora
                    </button>
                    <button 
                        onClick={() => setActiveTab('comparator')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'comparator' 
                            ? 'bg-white dark:bg-zinc-700 text-primary dark:text-orange-400 shadow-sm' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">balance</span>
                        Comparar
                    </button>
                </div>

                {activeTab === 'calculator' ? (
                    <>
                        <div className="p-4 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-gray-700">
                            <input 
                                type="text"
                                value={displayValue}
                                readOnly
                                className="w-full bg-transparent text-right text-5xl font-light text-text-primary-light dark:text-text-primary-dark border-none focus:ring-0 p-2 tracking-wide"
                                aria-label="Calculator display"
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-2.5 p-4 bg-background-light dark:bg-surface-dark">
                            <CalculatorButton onClick={resetCalculator} className="col-span-2 bg-gray-200 dark:bg-gray-700 text-red-500 dark:text-red-400 hover:bg-gray-300 dark:hover:bg-gray-600">AC</CalculatorButton>
                            <CalculatorButton onClick={() => handleOperatorClick('/')} className="bg-orange-100 text-primary dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50">÷</CalculatorButton>
                            <CalculatorButton onClick={() => handleOperatorClick('*')} className="bg-orange-100 text-primary dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50">×</CalculatorButton>

                            <CalculatorButton onClick={() => handleDigitClick('7')} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white">7</CalculatorButton>
                            <CalculatorButton onClick={() => handleDigitClick('8')} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white">8</CalculatorButton>
                            <CalculatorButton onClick={() => handleDigitClick('9')} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white">9</CalculatorButton>
                            <CalculatorButton onClick={() => handleOperatorClick('-')} className="bg-orange-100 text-primary dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50">−</CalculatorButton>

                            <CalculatorButton onClick={() => handleDigitClick('4')} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white">4</CalculatorButton>
                            <CalculatorButton onClick={() => handleDigitClick('5')} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white">5</CalculatorButton>
                            <CalculatorButton onClick={() => handleDigitClick('6')} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white">6</CalculatorButton>
                            <CalculatorButton onClick={() => handleOperatorClick('+')} className="bg-orange-100 text-primary dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50">+</CalculatorButton>

                            <CalculatorButton onClick={() => handleDigitClick('1')} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white">1</CalculatorButton>
                            <CalculatorButton onClick={() => handleDigitClick('2')} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white">2</CalculatorButton>
                            <CalculatorButton onClick={() => handleDigitClick('3')} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white">3</CalculatorButton>
                            <CalculatorButton onClick={handleEqualsClick} className="row-span-2 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-orange-500/30">=</CalculatorButton>

                            <CalculatorButton onClick={() => handleDigitClick('0')} className="col-span-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white">0</CalculatorButton>
                            <CalculatorButton onClick={handleDecimalClick} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white">.</CalculatorButton>
                        </div>
                    </>
                ) : (
                    <div className="p-4 flex flex-col h-full min-h-[400px]">
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Qual produto compensa mais?
                        </p>

                        <div className="grid grid-cols-2 gap-4 flex-1">
                            {/* Product A */}
                            <div className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-all ${comparisonResult?.winner === 'A' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5'}`}>
                                <h3 className={`font-bold text-center mb-1 ${comparisonResult?.winner === 'A' ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>Opção A</h3>
                                
                                <label className="block">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Preço (R$)</span>
                                    <input 
                                        type="tel" 
                                        value={priceA} 
                                        onChange={(e) => setPriceA(formatNumberInput(e.target.value))}
                                        placeholder="0,00"
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-black/20 text-sm p-2 text-center font-semibold"
                                    />
                                </label>
                                
                                <label className="block">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Peso/Qtd</span>
                                    <input 
                                        type="tel" 
                                        value={amountA} 
                                        onChange={(e) => setAmountA(formatNumberInput(e.target.value))}
                                        placeholder="g / ml / un"
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-black/20 text-sm p-2 text-center font-semibold"
                                    />
                                </label>

                                {comparisonResult?.winner === 'A' && (
                                    <div className="mt-auto pt-2 text-center animate-slideUp">
                                        <div className="inline-block bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm mb-1">
                                            MELHOR OPÇÃO
                                        </div>
                                        <p className="text-xs text-green-700 dark:text-green-300 font-bold">
                                            {comparisonResult.savingsPercent}% mais barato
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Product B */}
                            <div className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-all ${comparisonResult?.winner === 'B' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5'}`}>
                                <h3 className={`font-bold text-center mb-1 ${comparisonResult?.winner === 'B' ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>Opção B</h3>
                                
                                <label className="block">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Preço (R$)</span>
                                    <input 
                                        type="tel" 
                                        value={priceB} 
                                        onChange={(e) => setPriceB(formatNumberInput(e.target.value))}
                                        placeholder="0,00"
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-black/20 text-sm p-2 text-center font-semibold"
                                    />
                                </label>
                                
                                <label className="block">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Peso/Qtd</span>
                                    <input 
                                        type="tel" 
                                        value={amountB} 
                                        onChange={(e) => setAmountB(formatNumberInput(e.target.value))}
                                        placeholder="g / ml / un"
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-black/20 text-sm p-2 text-center font-semibold"
                                    />
                                </label>

                                {comparisonResult?.winner === 'B' && (
                                    <div className="mt-auto pt-2 text-center animate-slideUp">
                                        <div className="inline-block bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm mb-1">
                                            MELHOR OPÇÃO
                                        </div>
                                        <p className="text-xs text-green-700 dark:text-green-300 font-bold">
                                            {comparisonResult.savingsPercent}% mais barato
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-6">
                             <button 
                                onClick={() => { setPriceA(''); setAmountA(''); setPriceB(''); setAmountB(''); }}
                                className="w-full py-3 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                            >
                                Limpar Comparação
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
