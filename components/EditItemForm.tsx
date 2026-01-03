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
  const [quantity, setQuantity] = useState('1');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [weight, setWeight] = useState('');
  const [priceInput, setPriceInput] = useState(''); 
  
  const [error, setError] = useState<string | null>(null);

  // Cálculo em tempo real fixo para R$/Kg no modo peso
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

  // Efeito de Reset e Bloqueio de Scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      // Limpeza profunda ao fechar
      setError(null);
      setQuantity('1');
      setPricePerUnit('');
      setWeight('');
      setPriceInput('');
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  useEffect(() => {
    if (item && isOpen) {
      setError(null);
      setName(item.name);
      
      // Se o preço for 0 (item novo de receita), garantimos que TUDO comece limpo
      if (item.calculatedPrice === 0) {
          setPricePerUnit('');
          setPriceInput('');
          setWeight('');
          setQuantity('1');
          setIsWeightBased(false); // Default para unidade em itens zerados
          return;
      }

      // Se já tiver preço, popula normalmente
      if (item.details && item.details.includes('g') && !item.details.includes('un')) {
        setIsWeightBased(true);
        const weightVal = parseFloat(item.details.replace('g', ''));
        setWeight(isNaN(weightVal) ? '' : weightVal.toString());
        
        if (item.calculatedPrice > 0 && !isNaN(weightVal) && weightVal > 0) {
            const pricePerKg = (item.calculatedPrice / weightVal) * 1000;
            setPriceInput(pricePerKg.toFixed(2).replace('.', ','));
        }
      } else {
        setIsWeightBased(false);
        const quantityVal = parseInt(item.details?.replace(' un.', '') || '1') || 1;
        setQuantity(quantityVal.toString());
        
        if (item.calculatedPrice > 0) {
            const pricePerUnitVal = item.calculatedPrice / quantityVal;
            setPricePerUnit(pricePerUnitVal.toFixed(2).replace('.', ','));
        }
      }
    }
  }, [item, isOpen]);

  // Função para trocar o modo limpando lixos de memória do modo anterior
  const handleToggleMode = (toWeight: boolean) => {
      setIsWeightBased(toWeight);
      // Se estivermos editando um item sem preço, limpamos tudo ao trocar o modo
      if (item && item.calculatedPrice === 0) {
          setPricePerUnit('');
          setPriceInput('');
          setWeight('');
          setQuantity('1');
      }
  };

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

        const finalTotal = (priceNum / 1000) * weightNum;
        updatedItem.calculatedPrice = finalTotal;
        updatedItem.details = `${weightNum}g`;
        if (finalTotal > 0) updatedItem.isPurchased = true; 
      } else {
        const quantityNum = parseInt(quantity, 10) || 1;
        const pricePerUnitNum = parseFloat(pricePerUnit.replace(/\./g, '').replace(',', '.'));

        if (isNaN(quantityNum) || quantityNum <= 0 || isNaN(pricePerUnitNum) || pricePerUnitNum < 0) {
          setError("Quantidade e preço devem ser válidos.");
          return;
        }
        
        const finalTotal = quantityNum * pricePerUnitNum;
        updatedItem.calculatedPrice = finalTotal;
        updatedItem.details = `${quantityNum} un.`;
        if (finalTotal > 0) updatedItem.isPurchased = true; 
      }
    } else {
        updatedItem.calculatedPrice = 0;
        updatedItem.details = isWeightBased && weight ? `${weight}g` : (quantity && quantity !== '1' ? `${quantity} un.` : '');
    }

    await onUpdate(updatedItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/50 dark:bg-black/60 transition-opacity animate-fadeIn flex items-end sm:items-center sm:justify-center p-0 sm:p-4" onClick={onClose} aria-modal="true" role="dialog">
        <div className="relative w-full sm:max-w-2xl sm:bottom-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-stretch bg-surface-light dark:bg-surface-dark rounded-t-2xl sm:rounded-3xl animate-slideUp border-t sm:border border-white/10 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] sm:shadow-2xl overflow-hidden">
                <div className="flex h-6 w-full items-center justify-center pt-3 sm:hidden">
                    <div className="h-1.5 w-12 rounded-full bg-border-light dark:bg-border-dark opacity-50"></div>
                </div>
                
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <div className="flex flex-col">
                        <h3 className="text-text-primary-light dark:text-text-primary-dark text-xl sm:text-2xl font-bold leading-tight">Editar Item</h3>
                        <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">Ajuste os valores ou o nome</p>
                    </div>
                    <button onClick={onClose} className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 dark:bg-white/10 text-text-secondary-light dark:text-text-secondary-dark transition-colors hover:bg-gray-200 dark:hover:bg-white/20">
                        <span className="material-symbols-outlined text-2xl sm:text-3xl">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col px-6 pt-4 pb-8 gap-5 sm:gap-6">
                    <div>
                        <label className="flex flex-col w-full">
                            <p className="text-text-secondary-light dark:text-text-secondary-dark text-xs font-bold uppercase mb-2 ml-1">Nome do item</p>
                            <input
                                className="form-input w-full rounded-xl text-text-primary-light dark:text-text-primary-dark bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary h-14 sm:h-16 placeholder:text-gray-400 px-4 py-3 text-lg sm:text-xl font-bold shadow-inner"
                                placeholder="Ex: Leite integral"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </label>

                        <div className="flex w-full justify-center flex-col items-center gap-2 mt-4 transition-all duration-300">
                             {calculatedTotal > 0 && (
                                <div className="flex flex-col items-center animate-slideUp bg-primary/10 dark:bg-primary/20 px-4 py-3 rounded-2xl w-full border border-primary/20 dark:border-primary/30">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Calculado</span>
                                    <span className="text-3xl sm:text-4xl font-black text-primary dark:text-orange-400 tracking-tight">
                                        {calculatedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                             )}
                             <PriceHistoryWidget itemName={name} currentPrice={calculatedTotal} />
                        </div>
                    </div>

                    <div>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark text-xs font-bold uppercase mb-2 ml-1">Calcular por</p>
                        <div className="flex bg-gray-100 dark:bg-black/40 rounded-xl p-1.5 border border-gray-200 dark:border-gray-800">
                            <button type="button" onClick={() => handleToggleMode(false)} className={`flex-1 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 ${!isWeightBased ? 'bg-white dark:bg-zinc-700 text-primary shadow-md' : 'text-gray-500'}`}>
                                <span className="material-symbols-outlined text-lg sm:text-xl">shopping_basket</span>
                                Unidade
                            </button>
                            <button type="button" onClick={() => handleToggleMode(true)} className={`flex-1 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 ${isWeightBased ? 'bg-white dark:bg-zinc-700 text-primary shadow-md' : 'text-gray-500'}`}>
                                <span className="material-symbols-outlined text-lg sm:text-xl">scale</span>
                                Peso (kg/g)
                            </button>
                        </div>
                    </div>

                    {isWeightBased ? (
                        <div className="flex gap-4 animate-fadeIn">
                            <div className="flex-1">
                                <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase ml-2 mb-1 block">Peso (g)</label>
                                <input className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-14 sm:h-16 text-center font-bold text-lg sm:text-xl" placeholder="0" type="number" inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value)} />
                            </div>
                            <div className="flex-[1.5]">
                                <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase ml-2 mb-1 block">Preço (R$/Kg)</label>
                                <input className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-14 sm:h-16 text-center font-bold text-lg sm:text-xl text-primary" placeholder="0,00" type="text" inputMode="numeric" value={priceInput} onChange={(e) => setPriceInput(formatPriceInput(e.target.value))} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-4 animate-fadeIn">
                            <div className="flex-1">
                                <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase ml-2 mb-1 block">Quantidade</label>
                                <input className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-14 sm:h-16 text-center font-bold text-lg sm:text-xl" placeholder="1" type="number" min="1" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                            </div>
                            <div className="flex-[1.5]">
                                <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase ml-2 mb-1 block">Preço Unitário</label>
                                <input className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-14 sm:h-16 text-center font-bold text-lg sm:text-xl text-primary" placeholder="R$ 0,00" type="text" inputMode="numeric" value={pricePerUnit} onChange={(e) => setPricePerUnit(formatPriceInput(e.target.value))} />
                            </div>
                        </div>
                    )}
                    
                    {error && <p className="text-sm text-red-600 text-center font-bold animate-bounce">{error}</p>}
                    
                    <div className="flex gap-3 pt-2 sm:pt-4">
                        <button type="button" onClick={onClose} className="flex-1 h-16 sm:h-20 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/10 text-text-secondary-light dark:text-text-secondary-dark text-base sm:text-lg font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-all">Cancelar</button>
                        <button 
                            type="submit" 
                            className="flex-[1.5] h-16 sm:h-20 flex items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-lg sm:text-xl uppercase italic tracking-tighter shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 gap-2"
                        >
                            <span className="material-symbols-outlined !text-2xl sm:!text-3xl">check</span>
                            <span>Salvar Alterações</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};