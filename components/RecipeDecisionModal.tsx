import React from 'react';

interface RecipeDecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentMarketName: string | null;
    onAddToCurrent: () => void;
    onStartNew: () => void;
}

export const RecipeDecisionModal: React.FC<RecipeDecisionModalProps> = ({ 
    isOpen, 
    onClose, 
    currentMarketName, 
    onAddToCurrent, 
    onStartNew 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl p-6 animate-slideUp border border-orange-100 dark:border-white/5" onClick={(e) => e.stopPropagation()}>
                
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="h-16 w-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4 shadow-sm relative">
                        <span className="material-symbols-outlined !text-4xl text-primary">shopping_cart_checkout</span>
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-white dark:border-surface-dark">
                             <span className="material-symbols-outlined text-white text-xs">question_mark</span>
                        </div>
                    </div>
                    
                    <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                        Lista em Andamento
                    </h2>
                    
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
                        Você já possui itens na lista <span className="font-bold text-primary dark:text-orange-400">"{currentMarketName || 'Minha Lista'}"</span>. 
                        Onde deseja incluir esta receita?
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={onAddToCurrent}
                        className="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">playlist_add</span>
                        Adicionar à Lista Atual
                    </button>
                    
                    <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                        <span className="flex-shrink-0 mx-3 text-gray-400 text-[10px] uppercase tracking-widest">Ou</span>
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                    </div>

                    <button 
                        onClick={onStartNew}
                        className="w-full h-14 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-text-primary-light dark:text-text-primary-dark font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">delete_sweep</span>
                        Limpar e Iniciar Nova
                    </button>
                    
                    <button 
                        onClick={onClose}
                        className="mt-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};