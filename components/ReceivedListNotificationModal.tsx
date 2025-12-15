
import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useShoppingList } from '../contexts/ShoppingListContext';

export const ReceivedListNotificationModal: React.FC = () => {
    const { incomingList, clearIncomingList, showToast, openModal } = useApp();
    const { addIngredientsBatch } = useShoppingList();

    if (!incomingList) return null;

    const handleAccept = async () => {
        // Verifica se existem itens na lista recebida
        const listItems = incomingList.items || [];

        if (listItems.length === 0) {
            showToast("A lista recebida está vazia.");
            clearIncomingList();
            return;
        }

        // Prepara os itens para adicionar à lista de compras
        const itemsToAdd = listItems.map(i => ({
            name: i.name,
            details: i.details || '',
            recipeName: `Recebido de ${incomingList.author?.displayName || 'Alguém'}`,
            calculatedPrice: 0,
            isNew: true,
            isPurchased: false
        }));

        // Adiciona em lote
        await addIngredientsBatch(itemsToAdd);
        
        showToast(`${itemsToAdd.length} itens adicionados à sua lista!`);
        clearIncomingList();
    };

    const handleViewHistory = () => {
        clearIncomingList();
        openModal('history');
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm">
            <div className="relative w-full max-w-sm bg-background-light dark:bg-surface-dark rounded-2xl shadow-2xl p-6 flex flex-col items-center animate-bounce-y border-2 border-primary/50">
                
                <div className="h-20 w-20 rounded-full overflow-hidden border-4 border-white shadow-lg mb-4 relative">
                    {incomingList.author?.photoURL ? (
                        <img src={incomingList.author.photoURL} alt="Sender" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-orange-100 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined !text-4xl">person</span>
                        </div>
                    )}
                    <div className="absolute bottom-0 right-0 bg-green-500 border-2 border-white w-6 h-6 rounded-full"></div>
                </div>

                <h3 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark text-center mb-1">
                    Nova Lista Recebida!
                </h3>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center mb-4">
                    <span className="font-bold">{incomingList.author?.displayName || 'Alguém'}</span> compartilhou <span className="font-bold">"{incomingList.marketName}"</span> com você.
                </p>

                <div className="bg-gray-50 dark:bg-white/5 w-full rounded-xl p-3 mb-6 border border-border-light dark:border-border-dark">
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-2">{incomingList.itemCount} itens incluídos</p>
                    <div className="flex justify-center gap-1">
                        {[...Array(Math.min(3, incomingList.itemCount))].map((_, i) => (
                            <div key={i} className="h-2 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                        ))}
                        {incomingList.itemCount > 3 && <span className="text-xs text-gray-400">+</span>}
                    </div>
                </div>

                <div className="w-full flex flex-col gap-3">
                    <button 
                        onClick={handleAccept}
                        className="h-12 w-full rounded-xl bg-green-600 text-white font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">add_shopping_cart</span>
                        Adicionar à Minha Lista
                    </button>
                    <button 
                        onClick={handleViewHistory}
                        className="h-12 w-full rounded-xl bg-primary text-white font-bold shadow-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">visibility</span>
                        Ver no Histórico
                    </button>
                    <button 
                        onClick={clearIncomingList}
                        className="h-12 w-full rounded-xl bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium"
                    >
                        Agora não
                    </button>
                </div>
            </div>
        </div>
    );
};
