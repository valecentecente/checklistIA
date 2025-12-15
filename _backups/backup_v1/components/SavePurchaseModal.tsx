
import React, { useState, useEffect, useRef } from 'react';

interface SavePurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (marketName: string) => void;
    onFinishWithoutSaving: () => void;
    isLoggedIn: boolean;
    onLoginRequest: () => void;
    initialMarketName: string | null;
}

export const SavePurchaseModal: React.FC<SavePurchaseModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    onFinishWithoutSaving, 
    isLoggedIn, 
    onLoginRequest,
    initialMarketName 
}) => {
    const [marketName, setMarketName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setMarketName(initialMarketName || '');
            // Se não tiver nome inicial, já abre em modo de edição
            setIsEditing(!initialMarketName);
        }
    }, [isOpen, initialMarketName]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(marketName);
    };

    const toggleEdit = () => {
        setIsEditing(!isEditing);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[130] bg-black/50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-xl bg-background-light dark:bg-surface-dark shadow-2xl p-6 animate-slideUp" onClick={(e) => e.stopPropagation()}>
                {!isLoggedIn ? (
                    <>
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-primary dark:bg-orange-900/40 dark:text-orange-400">
                            <span className="material-symbols-outlined !text-3xl">cloud_off</span>
                        </div>
                        <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark text-center">Salvar no Histórico</h2>
                        <p className="mt-2 text-text-secondary-light dark:text-text-secondary-dark text-center">
                            Para salvar suas compras e acessá-las de qualquer dispositivo, é necessário fazer login.
                        </p>
                        <div className="flex flex-col gap-3 mt-6">
                            <button 
                                onClick={onLoginRequest}
                                className="flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-bold text-white shadow-lg transition-colors hover:bg-primary/90"
                            >
                                Fazer Login
                            </button>
                            <button
                                onClick={onFinishWithoutSaving}
                                className="flex h-12 w-full items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40 px-6 text-base font-bold text-red-600 dark:text-red-400 shadow-sm transition-colors hover:bg-red-200 dark:hover:bg-red-900/60"
                            >
                                Finalizar sem salvar
                            </button>
                            <button 
                                onClick={onClose}
                                className="flex h-12 w-full items-center justify-center rounded-xl bg-transparent text-text-secondary-light dark:text-text-secondary-dark font-semibold hover:bg-gray-100 dark:hover:bg-white/5"
                            >
                                Voltar
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Salvar Compra</h2>
                        <p className="mt-2 text-text-secondary-light dark:text-text-secondary-dark">
                            Os itens marcados serão salvos e removidos da lista atual.
                        </p>
                        <form onSubmit={handleSave} className="mt-6">
                            <div className="flex flex-col w-full">
                                <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal pb-2">Local da Compra</p>
                                
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <input
                                            ref={inputRef}
                                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-primary h-12 placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal"
                                            placeholder="Nome do Mercado"
                                            value={marketName}
                                            onChange={(e) => setMarketName(e.target.value)}
                                            onBlur={() => { if(marketName) setIsEditing(false) }}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setIsEditing(false)}
                                            className="h-12 w-12 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 text-green-600 dark:text-green-400"
                                        >
                                            <span className="material-symbols-outlined">check</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-primary">
                                                <span className="material-symbols-outlined text-lg">storefront</span>
                                            </div>
                                            <span className="font-bold text-lg text-text-primary-light dark:text-text-primary-dark truncate max-w-[180px]">
                                                {marketName || "Sem nome definido"}
                                            </span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={toggleEdit}
                                            className="flex items-center justify-center h-8 w-8 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                            title="Editar nome"
                                        >
                                            <span className="material-symbols-outlined text-xl">edit</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                                <button type="button" onClick={onClose} className="flex h-12 w-full items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 px-6 text-base font-bold text-text-secondary-light dark:text-text-secondary-dark shadow-sm transition-colors hover:bg-gray-200 dark:hover:bg-white/20">
                                    Voltar
                                </button>
                                <button type="submit" className="flex h-12 w-full items-center justify-center rounded-xl bg-green-600 px-6 text-base font-bold text-white shadow-lg transition-colors hover:bg-green-700">
                                    Salvar no Histórico
                                </button>
                            </div>
                        </form>
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={onFinishWithoutSaving}
                                className="flex h-10 w-full items-center justify-center rounded-lg text-red-500 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                            >
                                Finalizar e limpar lista (sem salvar)
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
    