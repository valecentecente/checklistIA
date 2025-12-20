
import React, { useState, useEffect } from 'react';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

interface ShareListModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShareListModal: React.FC<ShareListModalProps> = ({ isOpen, onClose }) => {
    const { shareListWithPartner, participants, removeParticipant } = useShoppingList();
    const { user } = useAuth();
    const { showToast, setIsSharedSession, isSharedSession, stopSharing } = useApp();
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIdentifier('');
            setStatus(null);
            setIsAddingNew(false);
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
            if (!user) {
                setStatus({ type: 'error', message: "Você precisa estar logado." });
                return;
            }
            
            const listToShareId = user.uid;

            const result = await shareListWithPartner(identifier, listToShareId);

            if (result.success) {
                setStatus({ type: 'success', message: result.message });
                showToast("Convite enviado!");
                setIsSharedSession(true);
                setIdentifier(''); // Limpa o campo para o próximo se quiser
                
                // Se for o primeiro compartilhamento, encerra o modo de adição para mostrar a lista
                if (!isAddingNew) {
                    setTimeout(() => setStatus(null), 2000);
                } else {
                    setIsAddingNew(false);
                    setTimeout(() => setStatus(null), 2000);
                }
            } else {
                setStatus({ type: 'error', message: result.message });
            }
        } catch (error) {
            console.error("Erro ao enviar convite:", error);
            setStatus({ type: 'error', message: "Erro ao enviar convite." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleStopSharing = () => {
        if (window.confirm("Isso interromperá a sincronização para TODOS os participantes. Continuar?")) {
            stopSharing();
            onClose();
        }
    };

    const handleRemovePartner = async (invId: string, name: string) => {
        if (window.confirm(`Remover ${name} desta sessão?`)) {
            await removeParticipant(invId);
            showToast(`${name} removido(a).`);
        }
    };

    if (!isOpen) return null;

    const showManagement = isSharedSession && !isAddingNew;

    return (
        <div className="fixed inset-0 z-[160] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl p-6 animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                {showManagement ? (
                    /* TELA DE GESTÃO DE SESSÃO ATIVA + LISTA DE PARTICIPANTES */
                    <div className="flex flex-col animate-fadeIn">
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative mb-3">
                                <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                                    <span className="material-symbols-outlined !text-3xl animate-pulse">sync</span>
                                </div>
                                <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-white dark:border-surface-dark"></div>
                            </div>
                            <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Sessão Compartilhada</h2>
                        </div>

                        {/* LISTA DE PARTICIPANTES */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Participantes</p>
                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{participants.length + 1}</span>
                            </div>

                            <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1 scrollbar-hide">
                                {/* Você (Dono) */}
                                <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                    <div className="h-10 w-10 rounded-full overflow-hidden border border-white shadow-sm bg-orange-100">
                                        {user?.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-orange-600 font-bold">V</div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">Você (Dono)</p>
                                        <p className="text-[10px] text-green-600 font-bold uppercase tracking-tighter">Online</p>
                                    </div>
                                </div>

                                {/* Parceiros Convidados */}
                                {participants.length > 0 ? participants.map((p) => (
                                    <div key={p.id} className="flex items-center gap-3 p-2 bg-white dark:bg-black/20 rounded-xl border border-gray-100 dark:border-gray-800 animate-fadeIn">
                                        <div className="h-10 w-10 rounded-full overflow-hidden border border-white shadow-sm bg-blue-100 relative">
                                            {p.toPhotoURL ? (
                                                <img src={p.toPhotoURL} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold">
                                                    {p.toDisplayName?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{p.toDisplayName || 'Parceiro'}</p>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'accepted' ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`}></span>
                                                <p className={`text-[10px] font-bold uppercase tracking-tighter ${p.status === 'accepted' ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {p.status === 'accepted' ? 'Sincronizado' : 'Aguardando...'}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemovePartner(p.id, p.toDisplayName || 'este parceiro')}
                                            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                            title="Remover participante"
                                        >
                                            <span className="material-symbols-outlined text-xl">close</span>
                                        </button>
                                    </div>
                                )) : (
                                    <div className="text-center py-4 bg-gray-50 dark:bg-black/10 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                                        <p className="text-[11px] text-gray-400 font-medium italic">Convide alguém para começar a colaborar.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="w-full flex flex-col gap-3">
                            <button 
                                onClick={() => setIsAddingNew(true)}
                                className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary text-white font-black shadow-lg hover:bg-primary/90 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined">person_add</span>
                                CONVIDAR MAIS
                            </button>
                            
                            <button 
                                onClick={handleStopSharing}
                                className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold border border-red-100 dark:border-red-900/30 transition-all"
                            >
                                <span className="material-symbols-outlined">cloud_off</span>
                                Encerrar Sincronização Geral
                            </button>

                            <button onClick={onClose} className="mt-2 text-[10px] font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-[0.2em] text-center">
                                FECHAR DASHBOARD
                            </button>
                        </div>
                    </div>
                ) : (
                    /* TELA DE CONVITE (NOVO PARCEIRO) */
                    <>
                        <div className="flex flex-col items-center mb-6">
                            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined !text-4xl">
                                    group_add
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark text-center">
                                Convidar Parceiro(a)
                            </h2>
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center mt-1">
                                Digite o @username para sincronizar.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="w-full">
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">E-mail ou @username</label>
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="ex: @amor ou e-mail"
                                    className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-14 px-4 text-base font-bold focus:ring-blue-500 focus:border-blue-500 dark:text-white shadow-inner"
                                    required
                                />
                            </div>

                            {status && (
                                <div className={`p-4 rounded-xl text-sm font-bold flex items-start gap-3 animate-fadeIn ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    <span className="material-symbols-outlined text-lg">{status.type === 'success' ? 'check_circle' : 'error'}</span>
                                    <span>{status.message}</span>
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="flex h-14 w-full items-center justify-center rounded-xl bg-blue-600 text-white font-black text-lg shadow-lg hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed mt-2 active:scale-95 transition-all"
                            >
                                {isLoading ? (
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                ) : 'ENVIAR CONVITE'}
                            </button>
                            
                            <div className="flex flex-col items-center gap-2 mt-2">
                                <button 
                                    type="button"
                                    onClick={() => isSharedSession ? setIsAddingNew(false) : onClose()}
                                    className="text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    Voltar
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};
