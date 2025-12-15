import React, { useState, useEffect } from 'react';
import type { ShoppingItem } from '../types';
import { PriceHistoryWidget } from './PriceHistoryWidget';

interface AddItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: Omit<ShoppingItem, 'id' | 'displayPrice' | 'isPurchased'>) => Promise<void>;
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
  
  // States para cálculo
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [weight, setWeight] = useState('');
  const [weightPriceMode, setWeightPriceMode] = useState<'kg' | 'total'>('kg');
  const [priceInput, setPriceInput] = useState(''); 
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Cálculo em tempo real para feedback visual
  let calculatedTotal = 0;
  if (isWeightBased) {
      const w = parseFloat(weight.replace(',', '.')) || 0;
      const p = parseFloat(priceInput.replace(/\./g, '').replace(',', '.')) || 0;
      if (weightPriceMode === 'total') {
          calculatedTotal = p;
      } else {
          calculatedTotal = (p / 1000) * w;
      }
  } else {
      const q = parseInt(quantity) || 1;
      const p = parseFloat(pricePerUnit.replace(/\./g, '').replace(',', '.')) || 0;
      calculatedTotal = q * p;
  }

  const resetForm = () => {
    setName('');
    setIsWeightBased(false);
    setWeightPriceMode('kg');
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
      // Força o blur em qualquer elemento ativo para garantir que o teclado não abra automaticamente
      if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
      }
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

    let newItem: Omit<ShoppingItem, 'id' | 'displayPrice' | 'isPurchased'>;

    // Lógica para determinar se o item tem preço definido ou é apenas texto
    const hasPriceDetails = isWeightBased 
        ? (weight.trim() !== '' && priceInput.trim() !== '')
        : (pricePerUnit.trim() !== ''); // Quantidade é opcional (assume 1)

    if (hasPriceDetails) {
      if (isWeightBased) {
        const weightNum = parseFloat(weight.replace(',', '.'));
        const priceNum = parseFloat(priceInput.replace(/\./g, '').replace(',', '.'));

        if (isNaN(weightNum) || weightNum <= 0 || isNaN(priceNum) || priceNum < 0) {
          setError("Peso e preço devem ser valores válidos.");
          return;
        }

        let finalTotal = 0;
        if (weightPriceMode === 'total') {
            finalTotal = priceNum;
        } else {
            finalTotal = (priceNum / 1000) * weightNum;
        }

        newItem = {
          name: trimmedName,
          calculatedPrice: finalTotal,
          details: `${weightNum}g`,
        };
      } else {
        const quantityNum = parseInt(quantity, 10) || 1;
        const pricePerUnitNum = parseFloat(pricePerUnit.replace(/\./g, '').replace(',', '.'));

        if (isNaN(quantityNum) || quantityNum <= 0 || isNaN(pricePerUnitNum) || pricePerUnitNum < 0) {
          setError("Quantidade e preço devem ser valores válidos.");
          return;
        }
        
        newItem = {
          name: trimmedName,
          calculatedPrice: quantityNum * pricePerUnitNum,
          details: `${quantityNum} un.`,
        };
      }
    } else {
      // Item simples sem preço
      newItem = {
          name: trimmedName,
          calculatedPrice: 0,
          details: isWeightBased && weight ? `${weight}g` : (quantity && quantity !== '1' ? `${quantity} un.` : ''),
      };
    }

    setIsSubmitting(true);
    try {
        await onAddItem(newItem);
        handleClose();
    } catch (e) {
        console.error(e);
        setError("Erro ao salvar o item. Tente novamente.");
        setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/50 dark:bg-black/60 transition-opacity animate-fadeIn" onClick={handleClose} aria-modal="true" role="dialog">
        <div className="absolute inset-x-0 bottom-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-stretch bg-surface-light dark:bg-surface-dark rounded-t-xl animate-slideUp">
                <div className="flex h-5 w-full items-center justify-center pt-3 pb-1">
                    <div className="h-1 w-9 rounded-full bg-border-light dark:bg-border-dark"></div>
                </div>
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <h3 className="text-text-primary-light dark:text-text-primary-dark tracking-light text-xl font-bold leading-tight">Adicionar Novo Item</h3>
                    <button onClick={handleClose} disabled={isSubmitting} aria-label="Fechar" className="flex items-center justify-center h-8 w-8 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col px-4 pt-4 pb-5 gap-4">
                    <div>
                        <label className="flex flex-col w-full">
                            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal pb-2">Nome do item</p>
                            <input
                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-primary h-14 placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal disabled:opacity-70"
                                placeholder="Ex: Leite integral"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSubmitting}
                                autoFocus={false}
                            />
                        </label>
                        
                        {/* WIDGET DE PREÇO CALCULADO EM TEMPO REAL */}
                        <div className="flex w-full justify-center flex-col items-center gap-2 mt-3 empty:hidden transition-all duration-300">
                             {calculatedTotal > 0 && (
                                <div className="flex flex-col items-center animate-slideUp bg-primary/10 dark:bg-primary/20 px-4 py-2 rounded-xl w-full border border-primary/20 dark:border-primary/30">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Total Calculado</span>
                                    <span className="text-3xl font-bold text-primary dark:text-orange-400 tracking-tight">
                                        {calculatedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                             )}
                             <PriceHistoryWidget itemName={name} currentPrice={calculatedTotal} />
                        </div>
                    </div>

                    <div>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal pb-3 pt-1">Calcular por</p>
                        <div className="flex">
                            <div className="flex h-12 flex-1 items-center justify-center rounded-lg bg-background-light dark:bg-background-dark p-1 border border-border-light dark:border-border-dark">
                                <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded px-2 has-[:checked]:bg-primary has-[:checked]:shadow-sm has-[:checked]:text-white text-text-primary-light dark:text-text-primary-dark text-sm font-medium leading-normal transition-colors duration-200">
                                    <span className="truncate">Unidade</span>
                                    <input checked={!isWeightBased} onChange={() => setIsWeightBased(false)} className="invisible w-0" name="calculation_type" type="radio" value="Unidade" disabled={isSubmitting}/>
                                </label>
                                <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded px-2 has-[:checked]:bg-primary has-[:checked]:shadow-sm has-[:checked]:text-white text-text-primary-light dark:text-text-primary-dark text-sm font-medium leading-normal transition-colors duration-200">
                                    <span className="truncate">Peso (kg/g)</span>
                                    <input checked={isWeightBased} onChange={() => setIsWeightBased(true)} className="invisible w-0" name="calculation_type" type="radio" value="Peso" disabled={isSubmitting}/>
                                </label>
                            </div>
                        </div>
                    </div>

                    {isWeightBased ? (
                        <div className="flex w-full flex-wrap items-end gap-4 animate-fadeIn">
                            <label className="flex flex-col min-w-32 flex-1">
                                <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal pb-2">Peso (g)</p>
                                <input
                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-primary h-14 placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal disabled:opacity-70"
                                    placeholder="Ex: 500"
                                    type="number"
                                    inputMode="numeric"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    disabled={isSubmitting}
                                    autoFocus={false}
                                />
                            </label>
                            
                            <div className="flex flex-col min-w-40 flex-[1.5]">
                                <div className="flex justify-between items-center pb-2">
                                    <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal">Preço</p>
                                    <div className="flex bg-gray-100 dark:bg-white/10 rounded-md p-0.5">
                                        <button 
                                            type="button"
                                            onClick={() => setWeightPriceMode('kg')}
                                            className={`text-[10px] px-2 py-0.5 rounded transition-all ${weightPriceMode === 'kg' ? 'bg-white dark:bg-surface-dark shadow-sm text-primary font-bold' : 'text-gray-500'}`}
                                        >
                                            R$/Kg
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setWeightPriceMode('total')}
                                            className={`text-[10px] px-2 py-0.5 rounded transition-all ${weightPriceMode === 'total' ? 'bg-white dark:bg-surface-dark shadow-sm text-primary font-bold' : 'text-gray-500'}`}
                                        >
                                            Total
                                        </button>
                                    </div>
                                </div>
                                <input
                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-primary h-14 placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal disabled:opacity-70"
                                    placeholder={weightPriceMode === 'kg' ? "R$ por Kg" : "R$ Total"}
                                    type="text"
                                    inputMode="numeric"
                                    value={priceInput}
                                    onChange={(e) => setPriceInput(formatPriceInput(e.target.value))}
                                    disabled={isSubmitting}
                                    autoFocus={false}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex w-full flex-wrap items-end gap-4 animate-fadeIn">
                            <label className="flex flex-col min-w-32 flex-1">
                                <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal pb-2">Qtd</p>
                                <input
                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-primary h-14 placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal disabled:opacity-70"
                                    placeholder="Ex: 1"
                                    type="number"
                                    min="1"
                                    inputMode="numeric"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    disabled={isSubmitting}
                                    autoFocus={false}
                                />
                            </label>
                            <label className="flex flex-col min-w-40 flex-[1.5]">
                                <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal pb-2">Preço Un.</p>
                                <input
                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-primary h-14 placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal disabled:opacity-70"
                                    placeholder="R$ 0,00"
                                    type="text"
                                    inputMode="numeric"
                                    value={pricePerUnit}
                                    onChange={(e) => setPricePerUnit(formatPriceInput(e.target.value))}
                                    disabled={isSubmitting}
                                    autoFocus={false}
                                />
                            </label>
                        </div>
                    )}
                    {error && <p className="text-sm text-red-600 text-center py-2">{error}</p>}
                    
                    <div className="grid grid-cols-2 gap-3 pt-4">
                        <button type="button" onClick={handleClose} disabled={isSubmitting} className="flex h-14 w-full items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 px-6 text-base font-bold text-text-secondary-light dark:text-text-secondary-dark shadow-sm transition-colors hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50">Cancelar</button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="flex h-14 w-full items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg transition-all duration-200 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                            aria-label="Salvar"
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <span className="material-symbols-outlined !text-4xl">check</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    );
};