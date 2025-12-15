
import React, { useState } from 'react';
import { useShoppingList } from '../contexts/ShoppingListContext';

interface PriceHistoryWidgetProps {
    itemName: string;
    currentPrice: number;
    isWeightBased?: boolean;
}

export const PriceHistoryWidget: React.FC<PriceHistoryWidgetProps> = ({ itemName, currentPrice, isWeightBased }) => {
    const { getItemHistory, formatCurrency } = useShoppingList();
    const [showHistory, setShowHistory] = useState(false);
    
    // Se não tem nome, não faz nada. Se preço for inválido, assume 0 para não quebrar.
    if (!itemName) return null;
    const safePrice = isNaN(currentPrice) ? 0 : currentPrice;

    const history = getItemHistory(itemName);
    
    // Se nunca comprou antes, não mostra nada
    if (!history || history.length === 0) return null;

    const lastPurchase = history[0];
    const lastPrice = lastPurchase.price;
    
    // Só compara se tiver preço atual
    const hasPrice = safePrice > 0;
    const isCheaper = hasPrice && safePrice < lastPrice;
    const isMoreExpensive = hasPrice && safePrice > lastPrice;
    const isSame = hasPrice && safePrice === lastPrice;

    // Cálculo da porcentagem
    let percentageStr = '';
    if (hasPrice && lastPrice > 0 && !isSame) {
        const diff = safePrice - lastPrice;
        const percent = Math.round(Math.abs((diff / lastPrice) * 100));
        if (percent > 0) {
            percentageStr = `${percent}%`;
        }
    }

    return (
        <>
            <button 
                type="button"
                onClick={() => setShowHistory(true)}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm border text-xs font-bold w-full sm:w-auto ${
                    hasPrice
                        ? (isCheaper 
                            ? 'bg-green-100 border-green-200 text-green-700 hover:bg-green-200' 
                            : isMoreExpensive 
                                ? 'bg-red-100 border-red-200 text-red-700 hover:bg-red-200' 
                                : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200')
                        : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100'
                }`}
                title="Ver histórico de preços"
            >
                {hasPrice ? (
                    <>
                        {isCheaper && <span className="material-symbols-outlined text-base">trending_down</span>}
                        {isMoreExpensive && <span className="material-symbols-outlined text-base">trending_up</span>}
                        {isSame && <span className="material-symbols-outlined text-base">remove</span>}
                        
                        <div className="flex items-center gap-2">
                            <span>{isCheaper ? 'Mais barato' : isMoreExpensive ? 'Mais caro' : 'Mesmo preço'}</span>
                            {percentageStr && (
                                <span className={`text-xs font-black px-2 py-0.5 rounded-md shadow-sm ${isCheaper ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                    {isCheaper ? '-' : '+'}{percentageStr}
                                </span>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-base">history</span>
                        <span>Ver Histórico ({history.length})</span>
                    </>
                )}
            </button>

            {showHistory && (
                <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={() => setShowHistory(false)}>
                    <div className="relative w-full max-w-xs bg-white dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden animate-bounce-y" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gray-50 dark:bg-black/20 p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Histórico de Preços</p>
                            <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto p-2">
                            {hasPrice && (
                                <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl mb-2 border border-orange-100 dark:border-white/5">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Preço Atual</p>
                                        {percentageStr && (
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isCheaper ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {isCheaper ? '↓' : '↑'} {percentageStr}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-lg font-bold text-primary dark:text-orange-400">{formatCurrency(safePrice)}</p>
                                </div>
                            )}

                            {history.map((record, idx) => (
                                <div key={idx} className="p-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{new Date(record.date).toLocaleDateString()}</p>
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{record.marketName || 'Sem mercado'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{formatCurrency(record.price)}</p>
                                        <p className="text-[10px] text-gray-400">{record.details}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
