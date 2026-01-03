import React, { useState, useEffect } from 'react';
import type { ShoppingItem } from '../types';
import { PriceHistoryWidget } from './PriceHistoryWidget';

interface AddItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: Omit<ShoppingItem, 'id' | 'displayPrice' | 'isPurchased'> & { isPurchased?: boolean }) => Promise<void>;
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

export const AddItemForm: React.FC<AddItemFormProps> = ({ isOpen, onClose, onAddItem }) => {
  const [name, setName] = useState('');
  const [isWeightBased, setIsWeightBased] = useState(false);
  
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [weight, setWeight] = useState('');
  const [priceInput, setPriceInput] = useState(''); 
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  let calculatedTotal = 0;
  if (isWeightBased) {
      const w = parseFloat(weight.replace(',', '.')) || 0;
      const p = parseFloat(priceInput.replace(/\./g, '').replace(',', '.')) || 0;
      calculatedTotal = (p / 1000) * w;
  } else {
      const q = parseInt(quantity) || 1;
      const p = parseFloat(pricePerUnit.replace(/\./g, '').replace(',', '.')) || 0;
      calculatedTotal = q * p;
  }

  const resetForm = () => {
    setName('');
    setIsWeightBased(false);
    setQuantity('');
    setPricePerUnit('');
    setWeight('');
    setPriceInput('');
    setError(null);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      resetForm();
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("O nome do item é obrigatório.");
      return;
    }

    let newItem: Omit<ShoppingItem, 'id' | 'displayPrice' | 'isPurchased'> & { isPurchased?: boolean };

    const hasPriceDetails = isWeightBased 
        ? (weight.trim() !== '' && priceInput.trim() !== '')
        : (pricePerUnit.trim() !== '');

    if (hasPriceDetails) {
      if (isWeightBased) {
        const weightNum = parseFloat(weight.replace(',', '.'));
        const priceNum = parseFloat(priceInput.replace(/\./g, '').replace(',', '.'));
        newItem = {
          name: trimmedName,
          calculatedPrice: calculatedTotal,
          details: `${weightNum}g`,
          isPurchased: calculatedTotal > 0
        };
      } else {
        const quantityNum = parseInt(quantity, 10) || 1;
        const pricePerUnitNum = parseFloat(pricePerUnit.replace(/\./g, '').replace(',', '.'));
        newItem = {
          name: trimmedName,
          calculatedPrice: quantityNum * pricePerUnitNum,
          details: `${quantityNum} un.`,
          isPurchased: (quantityNum * pricePerUnitNum) > 0
        };
      }
    } else {
      newItem = {
          name: trimmedName,
          calculatedPrice: 0,
          details: isWeightBased && weight ? `${weight}g` : (quantity && quantity !== '1' ? `${quantity} un.` : ''),
          isPurchased: false
      };
    }

    setIsSubmitting(true);
    try {
        await onAddItem(newItem);
        handleClose();
    } catch (e) {
        setError("Erro ao salvar.");
        setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/50 dark:bg-black/60 transition-opacity animate-fadeIn flex items-end sm:items-center sm:justify-center p-0 sm:p-4" onClick={handleClose} aria-modal="true" role="dialog">
        <div className="relative w-full sm:max-w-2xl sm:bottom-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-stretch bg-surface-light dark:bg-surface-dark rounded-t-2xl sm:rounded-3xl animate-slideUp border-t sm:border border-white/10 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] sm:shadow-2xl overflow-hidden">
                <div className="flex h-6 w-full items-center justify-center pt-3 sm:hidden">
                    <div className="h-1.5 w-12 rounded-full bg-border-light dark:bg-border-dark opacity-50"></div>
                </div>
                
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <div className="flex flex-col">
                        <h3 className="text-text-primary-light dark:text-text-primary-dark text-xl sm:text-2xl font-bold leading-tight">Adicionar à Lista</h3>
                        <p className="text-[10px] sm:text-xs text-primary font-bold uppercase tracking-widest">Soma & Pesagem Inteligente</p>
                    </div>
                    <button onClick={handleClose} disabled={isSubmitting} className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 dark:bg-white/10 text-text-secondary-light dark:text-text-secondary-dark transition-colors hover:bg-gray-200 dark:hover:bg-white/20">
                        <span className="material-symbols-outlined text-2xl sm:text-3xl">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col px-6 pt-4 pb-8 gap-5 sm:gap-6">
                    <div>
                        <label className="flex flex-col w-full">
                            <input
                                className="form-input w-full rounded-xl text-text-primary-light dark:text-text-primary-dark bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary h-14 sm:h-16 placeholder:text-gray-400 px-4 py-3 text-lg sm:text-xl font-bold shadow-inner"
                                placeholder="O que você está levando?"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSubmitting}
                                autoFocus
                            />
                        </label>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-white dark:bg-black/20 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-all">
                         <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Valor Total do Item</span>
                         <div className="flex items-baseline gap-1">
                            <span className="text-xl sm:text-2xl font-bold text-primary opacity-70">R$</span>
                            <span className={`text-4xl sm:text-5xl font-black tracking-tighter ${calculatedTotal > 0 ? 'text-primary' : 'text-gray-200 dark:text-gray-800'}`}>
                                {calculatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                         </div>
                         <PriceHistoryWidget itemName={name} currentPrice={calculatedTotal} />
                    </div>

                    <div className="flex bg-gray-100 dark:bg-black/40 rounded-xl p-1.5 border border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setIsWeightBased(false)} className={`flex-1 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 ${!isWeightBased ? 'bg-white dark:bg-zinc-700 text-primary shadow-md' : 'text-gray-500'}`}>
                            <span className="material-symbols-outlined text-lg sm:text-xl">shopping_basket</span>
                            Unidade
                        </button>
                        <button type="button" onClick={() => setIsWeightBased(true)} className={`flex-1 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 ${isWeightBased ? 'bg-white dark:bg-zinc-700 text-primary shadow-md' : 'text-gray-500'}`}>
                            <span className="material-symbols-outlined text-lg sm:text-xl">scale</span>
                            Pesagem (Kg)
                        </button>
                    </div>

                    {isWeightBased ? (
                        <div className="flex gap-4 animate-fadeIn">
                            <div className="flex-1">
                                <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase ml-2 mb-1 block">Peso (g)</label>
                                <input className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-14 sm:h-16 text-center font-bold text-lg sm:text-xl" placeholder="0" type="number" inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value)} disabled={isSubmitting} />
                            </div>
                            <div className="flex-[1.5]">
                                <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase ml-2 mb-1 block">Preço (R$/Kg)</label>
                                <input className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-14 sm:h-16 text-center font-bold text-lg sm:text-xl text-primary" placeholder="0,00" type="text" inputMode="numeric" value={priceInput} onChange={(e) => setPriceInput(formatPriceInput(e.target.value))} disabled={isSubmitting} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-4 animate-fadeIn">
                            <div className="flex-1">
                                <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase ml-2 mb-1 block">Quantidade</label>
                                <input className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-14 sm:h-16 text-center font-bold text-lg sm:text-xl" placeholder="1" type="number" min="1" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} disabled={isSubmitting} />
                            </div>
                            <div className="flex-[1.5]">
                                <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase ml-2 mb-1 block">Preço Unitário</label>
                                <input className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-14 sm:h-16 text-center font-bold text-lg sm:text-xl text-primary" placeholder="0,00" type="text" inputMode="numeric" value={pricePerUnit} onChange={(e) => setPricePerUnit(formatPriceInput(e.target.value))} disabled={isSubmitting} />
                            </div>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500 text-center font-bold animate-bounce">{error}</p>}
                    
                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !name.trim()}
                            className="flex h-16 sm:h-20 w-full items-center justify-center rounded-2xl bg-primary text-white font-black text-xl sm:text-2xl uppercase italic tracking-tighter shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] hover:bg-primary-hover active:scale-95 disabled:opacity-50 disabled:grayscale gap-3"
                        >
                            {isSubmitting ? (
                                <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined !text-3xl sm:!text-4xl">add_shopping_cart</span>
                                    <span>Salvar Item</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};