
import React, { useState, useEffect } from 'react';
import type { ShoppingItem } from '../types';
import { PriceHistoryWidget } from './PriceHistoryWidget';

interface EditItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (item: ShoppingItem) => Promise<void>;
  onDeleteItem: (id: string) => void;
  item: ShoppingItem | null;
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

export const EditItemForm: React.FC<EditItemFormProps> = ({ item, isOpen, onUpdate, onClose, onDeleteItem }) => {
  const [name, setName] = useState('');
  const [isWeightBased, setIsWeightBased] = useState(false);
  
  // States para cálculo
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [weight, setWeight] = useState('');
  const [weightPriceMode, setWeightPriceMode] = useState<'kg' | 'total'>('kg');
  const [priceInput, setPriceInput] = useState(''); // Genérico
  
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  useEffect(() => {
    if (item) {
      setError(null);
      setName(item.name);
      
      // Detecta se é baseado em peso pela string de detalhes (ex: "500g")
      if (item.details && item.details.includes('g') && !item.details.includes('un')) {
        setIsWeightBased(true);
        setWeightPriceMode('total'); // Padrão ao editar: mostra o total já salvo
        
        const weightVal = parseFloat(item.details.replace('g', ''));
        setWeight(isNaN(weightVal) ? '' : weightVal.toString());
        
        if (item.calculatedPrice > 0) {
            setPriceInput(item.calculatedPrice.toFixed(2).replace('.', ','));
        } else {
            setPriceInput('');
        }
      } else {
        setIsWeightBased(false);
        const quantityVal = parseInt(item.details?.replace(' un.', '') || '1') || 1;
        setQuantity(quantityVal.toString());
        
        if (item.calculatedPrice > 0) {
            const pricePerUnitVal = item.calculatedPrice / quantityVal;
            setPricePerUnit(pricePerUnitVal.toFixed(2).replace('.', ','));
        } else {
            setPricePerUnit('');
        }
      }
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("O nome do item é obrigatório.");
      return;
    }

    let updatedItem: ShoppingItem = { ...item, name: trimmedName };
    
    // Verifica se há dados de preço preenchidos
    const hasPriceDetails = isWeightBased 
        ? (weight.trim() !== '' && priceInput.trim() !== '')
        : (pricePerUnit.trim() !== '');

    if (hasPriceDetails) {
       if (isWeightBased) {
        const weightNum = parseFloat(weight.replace(',', '.'));
        const priceNum = parseFloat(priceInput.replace(/\./g, '').replace(',', '.'));

        if (isNaN(weightNum) || weightNum <= 0 || isNaN(priceNum) || priceNum < 0) {
          setError("Peso e preço devem ser válidos.");
          return;
        }

        let finalTotal = 0;
        if (weightPriceMode === 'total') {
            finalTotal = priceNum;
        } else {
            finalTotal = (priceNum / 1000) * weightNum;
        }

        updatedItem.calculatedPrice = finalTotal;
        updatedItem.details = `${weightNum}g`;
      } else {
        const quantityNum = parseInt(quantity, 10) || 1;
        const pricePerUnitNum = parseFloat(pricePerUnit.replace(/\./g, '').replace(',', '.'));

        if (isNaN(quantityNum) || quantityNum <= 0 || isNaN(pricePerUnitNum) || pricePerUnitNum < 0) {
          setError("Quantidade e preço devem ser válidos.");
          return;
        }
        
        updatedItem.calculatedPrice = quantityNum * pricePerUnitNum;
        updatedItem.details = `${quantityNum} un.`;
      }
    } else {
        // Zera o preço se o usuário apagou os campos
        updatedItem.calculatedPrice = 0;
        updatedItem.details = isWeightBased && weight ? `${weight}g` : (quantity && quantity !== '1' ? `${quantity} un.` : '');
    }

    await onUpdate(updatedItem);
    onClose();
  };

  const handleModeSwitch = (mode: 'kg' | 'total') => {
      setWeightPriceMode(mode);
      // Lógica de conversão ao trocar o botão para facilitar
      const currentVal = parseFloat(priceInput.replace(/\./g, '').replace(',', '.'));
      const w = parseFloat(weight.replace(',', '.'));
      
      if (!isNaN(currentVal) && !isNaN(w) && w > 0) {
          if (mode === 'kg') {
              // Estava em Total, agora quer Kg. Preço/Kg = (Total / Peso) * 1000
              const perKg = (currentVal / w) * 1000;
              setPriceInput(perKg.toFixed(2).replace('.', ','));
          } else {
              // Estava em Kg, agora quer Total. Total = (PreçoKg / 1000) * Peso
              const total = (currentVal / 1000) * w;
              setPriceInput(total.toFixed(2).replace('.', ','));
          }
      } else {
          setPriceInput('');
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/50 dark:bg-black/60 transition-opacity animate-fadeIn" onClick={onClose} aria-modal="true" role="dialog">
        <div className="absolute inset-x-0 bottom-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-stretch bg-surface-light dark:bg-surface-dark rounded-t-xl animate-slideUp">
                <div className="flex h-5 w-full items-center justify-center pt-3 pb-1">
                    <div className="h-1 w-9 rounded-full bg-border-light dark:bg-border-dark"></div>
                </div>
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <h3 className="text-text-primary-light dark:text-text-primary-dark tracking-light text-xl font-bold leading-tight">Editar Item</h3>
                    <button onClick={onClose} className="flex items-center justify-center h-8 w-8 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col px-4 pt-4 pb-5 gap-4">
                    <div>
                        <label className="flex flex-col w-full">
                            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal pb-2">Nome do item</p>
                            <input
                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-primary h-14 placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal"
                                placeholder="Ex: Leite integral"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </label>

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
                                    <input checked={!isWeightBased} onChange={() => setIsWeightBased(false)} className="invisible w-0" name="calculation_type" type="radio" value="Unidade"/>
                                </label>
                                <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded px-2 has-[:checked]:bg-primary has-[:checked]:shadow-sm has-[:checked]:text-white text-text-primary-light dark:text-text-primary-dark text-sm font-medium leading-normal transition-colors duration-200">
                                    <span className="truncate">Peso (kg/g)</span>
                                    <input checked={isWeightBased} onChange={() => setIsWeightBased(true)} className="invisible w-0" name="calculation_type" type="radio" value="Peso"/>
                                </label>
                            </div>
                        </div>
                    </div>

                    {isWeightBased ? (
                        <div className="flex w-full flex-wrap items-end gap-4 animate-fadeIn">
                            <label className="flex flex-col min-w-32 flex-1">
                                <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal pb-2">Peso (g)</p>
                                <input
                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-primary h-14 placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal"
                                    placeholder="Ex: 500"
                                    type="number"
                                    inputMode="numeric"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                />
                            </label>
                            
                            <div className="flex flex-col min-w-40 flex-[1.5]">
                                <div className="flex justify-between items-center pb-2">
                                    <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal">Preço</p>
                                    <div className="flex bg-gray-100 dark:bg-white/10 rounded-md p-0.5">
                                        <button 
                                            type="button"
                                            onClick={() => handleModeSwitch('kg')}
                                            className={`text-[10px] px-2 py-0.5 rounded transition-all ${weightPriceMode === 'kg' ? 'bg-white dark:bg-surface-dark shadow-sm text-primary font-bold' : 'text-gray-500'}`}
                                        >
                                            R$/Kg
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleModeSwitch('total')}
                                            className={`text-[10px] px-2 py-0.5 rounded transition-all ${weightPriceMode === 'total' ? 'bg-white dark:bg-surface-dark shadow-sm text-primary font-bold' : 'text-gray-500'}`}
                                        >
                                            Total
                                        </button>
                                    </div>
                                </div>
                                <input
                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-primary h-14 placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal"
                                    placeholder={weightPriceMode === 'kg' ? "R$ por Kg" : "R$ Total"}
                                    type="text"
                                    inputMode="numeric"
                                    value={priceInput}
                                    onChange={(e) => setPriceInput(formatPriceInput(e.target.value))}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex w-full flex-wrap items-end gap-4 animate-fadeIn">
                            <label className="flex flex-col min-w-32 flex-1">
                                <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal pb-2">Qtd</p>
                                <input
                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-primary h-14 placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal"
                                    placeholder="Ex: 2"
                                    type="number"
                                    min="1"
                                    inputMode="numeric"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                />
                            </label>
                            <label className="flex flex-col min-w-40 flex-[1.5]">
                                <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal pb-2">Preço Un.</p>
                                <input
                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-primary h-14 placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal"
                                    placeholder="R$ 0,00"
                                    type="text"
                                    inputMode="numeric"
                                    value={pricePerUnit}
                                    onChange={(e) => setPricePerUnit(formatPriceInput(e.target.value))}
                                />
                            </label>
                        </div>
                    )}
                    {error && <p className="text-sm text-red-600 text-center py-2">{error}</p>}
                    
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 h-14 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-text-secondary-light dark:text-text-secondary-dark text-base font-bold hover:bg-gray-200 dark:hover:bg-white/20">Cancelar</button>
                        <button 
                            type="submit" 
                            className="flex-1 h-14 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg transition-all duration-200 hover:bg-blue-700 active:scale-95"
                            aria-label="Salvar"
                        >
                            <span className="material-symbols-outlined !text-4xl">check</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};
