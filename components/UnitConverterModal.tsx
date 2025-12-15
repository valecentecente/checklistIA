
import React, { useState, useEffect } from 'react';

interface UnitConverterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const conversions = {
    weight: {
        'g': 1,
        'kg': 1000,
        'lb': 453.592,
        'oz': 28.3495
    },
    volume: {
        'ml': 1,
        'l': 1000,
        'xic': 240, // Xícara padrão
        'col_sopa': 15, // Colher de sopa
        'oz_fl': 29.5735 // Onça fluida
    }
};

const labels: Record<string, string> = {
    'g': 'Gramas (g)',
    'kg': 'Quilos (kg)',
    'lb': 'Libras (lb)',
    'oz': 'Onças (oz)',
    'ml': 'Mililitros (ml)',
    'l': 'Litros (L)',
    'xic': 'Xícaras (chá)',
    'col_sopa': 'Colheres (sopa)',
    'oz_fl': 'Onças Líq. (fl oz)'
};

export const UnitConverterModal: React.FC<UnitConverterModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'weight' | 'volume'>('weight');
    const [amount, setAmount] = useState<string>('');
    const [fromUnit, setFromUnit] = useState<string>('g');
    const [toUnit, setToUnit] = useState<string>('kg');
    const [result, setResult] = useState<string>('0');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setAmount('');
            setResult('0');
            // Defaults based on tab
            if (activeTab === 'weight') {
                setFromUnit('g');
                setToUnit('kg');
            } else {
                setFromUnit('ml');
                setToUnit('l');
            }
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen, activeTab]);

    useEffect(() => {
        calculate();
    }, [amount, fromUnit, toUnit, activeTab]);

    const handleTabChange = (tab: 'weight' | 'volume') => {
        setActiveTab(tab);
        setAmount('');
        if (tab === 'weight') {
            setFromUnit('g');
            setToUnit('kg');
        } else {
            setFromUnit('ml');
            setToUnit('l');
        }
    };

    const calculate = () => {
        const val = parseFloat(amount.replace(',', '.'));
        if (isNaN(val) || !amount) {
            setResult('0');
            return;
        }

        const factorFrom = conversions[activeTab][fromUnit as keyof typeof conversions.weight];
        const factorTo = conversions[activeTab][toUnit as keyof typeof conversions.weight];

        if (!factorFrom || !factorTo) return;

        // Convert to base unit (g or ml) then to target unit
        const baseValue = val * factorFrom;
        const finalValue = baseValue / factorTo;

        // Format logic: avoid long decimals for integers, show 3 decimals for small
        let formatted = '';
        if (Number.isInteger(finalValue)) {
            formatted = finalValue.toString();
        } else {
            formatted = finalValue.toFixed(3).replace(/\.?0+$/, ''); // Trim trailing zeros
        }
        
        setResult(formatted.replace('.', ','));
    };

    const formatInput = (val: string) => {
        // Allow only numbers and one comma
        return val.replace(/[^0-9,]/g, '').replace(/(,.*),/g, '$1');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-surface-dark">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">scale</span>
                        Conversor
                    </h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500 hover:text-gray-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 bg-gray-50 dark:bg-black/20 gap-2">
                    <button 
                        onClick={() => handleTabChange('weight')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'weight' ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        <span className="material-symbols-outlined text-lg">weight</span> Peso
                    </button>
                    <button 
                        onClick={() => handleTabChange('volume')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'volume' ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        <span className="material-symbols-outlined text-lg">water_drop</span> Volume
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    {/* Amount Input */}
                    <div className="relative">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Quantidade</label>
                        <input 
                            type="text" 
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(formatInput(e.target.value))}
                            className="w-full text-4xl font-bold text-center bg-transparent border-b-2 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-0 px-0 py-2 text-gray-900 dark:text-white placeholder:text-gray-300"
                            placeholder="0"
                            autoFocus
                        />
                    </div>

                    {/* Unit Selectors */}
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">De</label>
                            <select 
                                value={fromUnit} 
                                onChange={(e) => setFromUnit(e.target.value)}
                                className="w-full rounded-xl bg-gray-100 dark:bg-white/10 border-transparent text-sm font-semibold h-12"
                            >
                                {Object.keys(conversions[activeTab]).map(unit => (
                                    <option key={unit} value={unit}>{labels[unit]}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="text-gray-400 pt-5">
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </div>

                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Para</label>
                            <select 
                                value={toUnit} 
                                onChange={(e) => setToUnit(e.target.value)}
                                className="w-full rounded-xl bg-gray-100 dark:bg-white/10 border-transparent text-sm font-semibold h-12"
                            >
                                {Object.keys(conversions[activeTab]).map(unit => (
                                    <option key={unit} value={unit}>{labels[unit]}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Result */}
                    <div className="bg-primary/10 dark:bg-primary/20 rounded-xl p-4 text-center border border-primary/20">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Resultado</p>
                        <p className="text-3xl font-black text-primary dark:text-orange-400 break-words">
                            {result} <span className="text-lg font-bold opacity-80">{toUnit}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
