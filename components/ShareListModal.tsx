
import React, { useState, useEffect } from 'react';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

interface ShareListModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShareListModal: React.FC<ShareListModalProps> = ({ isOpen, onClose }) => {
    const { shareListWithPartner } = useShoppingList();
    const { user } = useAuth();
    const { showToast, setIsSharedSession } = useApp();
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setIdentifier('');
            setStatus(null);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim()) return;
        
        setIsLoading(true);
        setStatus(null);

        try {
            // Compartilha a lista ATUAL do usuário (seja ela pessoal ou não, o convite é para "esta lista")
            // No nosso modelo simplificado, cada usuário tem SUA lista (userId).
            // Compartilhar significa convidar alguém para ver/editar a lista DO USUÁRIO ATUAL.
            // Portanto, listToShareId = user.uid.
            if (!user) {
                setStatus({ type: 'error', message: "Você precisa estar logado." });
                return;
            }
            
            const listToShareId = user.uid; // Compartilhando a MINHA lista

            const result = await shareListWithPartner(identifier, listToShareId);

            if (result.success) {
                setStatus({ type: 'success', message: result.message });
                showToast("Convite enviado com sucesso!");
                setIsSharedSession(true); // Ativa o modo visual de compartilhamento
                setTimeout(onClose, 2000);
            } else {
                setStatus({ type: 'error', message: result.message });
            }
        } catch (error) {
            console.error("Erro ao enviar convite:", error);
            setStatus({ type: 'error', message: "Erro ao enviar convite. Tente novamente." });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl p-6 animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                <div className="flex flex-col items-center mb-4">
                    <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined !text-4xl">person_add</span>
                    </div>
                    <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark text-center">Convidar Parceiro(a)</h2>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center mt-1">
                        Compartilhe sua lista em tempo real. Ambos poderão editar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail ou @username</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="ex: amor@email.com ou @amor"
                            className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-12 px-4 text-base focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                            required
                        />
                    </div>

                    {status && (
                        <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            <span className="material-symbols-outlined text-lg">{status.type === 'success' ? 'check_circle' : 'error'}</span>
                            <span>{status.message}</span>
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-lg transition-colors hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Enviar Convite'}
                    </button>
                    
                    <button 
                        type="button"
                        onClick={onClose}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-center"
                    >
                        Cancelar
                    </button>
                </form>
            </div>
        </div>
    );
};
