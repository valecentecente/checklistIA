
import React, { useState, useEffect } from 'react';

interface StartShoppingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (marketName: string) => void;
    onShareAndStart: (marketName: string) => void;
    initialMarketName?: string | null;
}

export const StartShoppingModal: React.FC<StartShoppingModalProps> = ({ isOpen, onClose, onStart, onShareAndStart, initialMarketName }) => {
    const [marketName, setMarketName] = useState('');
    const [isSharingIntent, setIsSharingIntent] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMarketName(initialMarketName || '');
            setIsSharingIntent(false);
            document.body.style.overflow = 'hidden';
            // Força o blur em qualquer elemento ativo para garantir que o teclado não abra automaticamente
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen, initialMarketName]);

    const handleStart = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = marketName.trim();
        if (isSharingIntent) {
            onShareAndStart(trimmedName);
        } else {
            onStart(trimmedName);
        }
    };

    const isEditing = !!initialMarketName;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl p-6 animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark text-center mb-2">
                    {isEditing ? 'Renomear Local de Compra' : 'Iniciar Nova Compra'}
                </h2>
                
                <form onSubmit={handleStart} className="flex flex-col gap-4">
                    <label className="flex flex-col w-full">
                        <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal pb-2">Nome do Mercado</p>
                        <input
                            className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-12 px-4 text-base focus:ring-primary focus:border-primary dark:text-white"
                            placeholder="Ex: Mercado Central"
                            value={marketName}
                            onChange={(e) => setMarketName(e.target.value)}
                            autoFocus={false}
                        />
                    </label>

                    {/* Opção de Compartilhamento (Oculta se estiver apenas editando o nome) */}
                    {!isEditing && (
                        <div 
                            className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                isSharingIntent 
                                ? 'border-primary bg-primary/5 dark:bg-primary/20' 
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                            onClick={() => setIsSharingIntent(!isSharingIntent)}
                        >
                            <span className="material-symbols-outlined !text-2xl mr-3 text-primary">group_add</span>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-text-primary-light dark:text-text-primary-dark">Lista Compartilhada?</p>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Sincronize esta lista em tempo real com seu parceiro(a).</p>
                            </div>
                            <span className="material-symbols-outlined text-primary text-2xl">
                                {isSharingIntent ? 'check_box' : 'check_box_outline_blank'}
                            </span>
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-white font-bold shadow-lg transition-colors hover:bg-primary/90"
                    >
                        {isEditing ? 'Salvar Nome' : 'Continuar e Adicionar'}
                    </button>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
                    >
                        Cancelar
                    </button>
                </form>
            </div>
        </div>
    );
};
