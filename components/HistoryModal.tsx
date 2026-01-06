import React, { useState, useMemo, useEffect } from 'react';
import type { PurchaseRecord, HistoricItem, AuthorMetadata, ReceivedListRecord } from '../types';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useApp } from '../contexts/AppContext';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: PurchaseRecord[];
    onRepeatPurchase: (purchase: PurchaseRecord) => void;
    onAddItem: (item: HistoricItem, marketName?: string) => void;
    formatCurrency: (value: number) => string;
}

const HistoryListItem: React.FC<{ 
    purchase: PurchaseRecord; 
    onClick: () => void; 
    formatCurrency: (value: number) => string;
    onDelete: (id: string) => void;
}> = ({ purchase, onClick, formatCurrency, onDelete }) => {
    const purchaseDate = new Date(purchase.date);
    const formattedDate = purchaseDate.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' ', ' - ');

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Deseja apagar o registro da compra em "${purchase.marketName || 'Compra Geral'}" do seu histórico?`)) {
            onDelete(purchase.id);
        }
    };

    return (
        <div className="w-full relative group">
            <button onClick={onClick} className="w-full text-left p-4 rounded-lg bg-surface-light dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-border-light dark:border-border-dark flex justify-between items-center pr-12">
                <div>
                    <p className="font-bold text-primary dark:text-orange-400">{purchase.marketName || "Compra Geral"}</p>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{formattedDate}</p>
                </div>
                <div className="text-right mr-2">
                    <p className="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">{formatCurrency(purchase.total)}</p>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{purchase.items.length} itens</p>
                </div>
            </button>
            
            <button 
                onClick={handleDelete}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-90"
                title="Apagar do histórico"
            >
                <span className="material-symbols-outlined !text-xl">delete</span>
            </button>
        </div>
    );
};

const ReceivedListItem: React.FC<{ record: ReceivedListRecord; onProfileClick: (e: React.MouseEvent, author: AuthorMetadata) => void; onClick: () => void; }> = ({ record, onProfileClick, onClick }) => {
    const receivedDate = new Date(record.date);
    const formattedDate = receivedDate.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <button onClick={onClick} className={`w-full text-left p-4 rounded-lg bg-surface-light dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-border-light dark:border-border-dark flex items-center gap-4 relative ${!record.read ? 'border-l-4 border-l-primary' : ''}`}>
            {!record.read && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            )}
            
            {record.author && (
                <div 
                    onClick={(e) => onProfileClick(e, record.author)}
                    className="flex-shrink-0 h-12 w-12 rounded-full border-2 border-white shadow-sm overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                >
                    {record.author.photoURL ? (
                        <img src={record.author.photoURL} alt={record.author.displayName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-orange-100 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">person</span>
                        </div>
                    )}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className={`font-bold text-text-primary-light dark:text-text-primary-dark truncate ${!record.read ? 'text-primary' : ''}`}>{record.marketName}</p>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    {record.author ? `De ${record.author.displayName}` : 'Recebido'} • {formattedDate}
                </p>
            </div>
            <div className="flex-shrink-0 text-right">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                    <span className="material-symbols-outlined text-lg">download</span>
                </span>
            </div>
        </button>
    );
};

const SocialProfileModal: React.FC<{ author: AuthorMetadata; onClose: () => void; }> = ({ author, onClose }) => {
    return (
        <div className="fixed inset-0 z-[220] bg-black/60 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-xs bg-white dark:bg-surface-dark rounded-2xl shadow-2xl p-6 flex flex-col items-center animate-slideUp" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                    <span className="material-symbols-outlined">close</span>
                </button>
                
                <div className="h-24 w-24 rounded-full border-4 border-white shadow-lg overflow-hidden mb-4">
                    {author.photoURL ? (
                        <img src={author.photoURL} alt={author.displayName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-orange-100 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined !text-5xl">person</span>
                        </div>
                    )}
                </div>
                
                <h3 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">{author.displayName}</h3>
                {author.username && <p className="text-sm font-semibold text-primary dark:text-orange-400 mb-1">@{author.username}</p>}
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-6">Membro do ChecklistIA</p>
                
                <div className="flex gap-3 w-full">
                    <button className="flex-1 h-10 rounded-xl bg-primary text-white font-bold text-sm shadow hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        Seguir
                    </button>
                    <button className="flex-1 h-10 rounded-xl bg-gray-100 dark:bg-white/10 text-text-primary-light dark:text-text-primary-dark font-bold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg">chat</span>
                        Mensagem
                    </button>
                </div>
            </div>
        </div>
    );
};

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onRepeatPurchase, onAddItem, formatCurrency }) => {
    const { receivedHistory, shareListWithEmail, markReceivedListAsRead, searchUser, deleteHistoryRecord } = useShoppingList();
    const { showToast, historyActiveTab, setHistoryActiveTab, setHomeViewActive } = useApp();
    const [activeTab, setActiveTab] = useState<'my' | 'received'>(historyActiveTab);
    const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<AuthorMetadata | null>(null);
    
    // Share States
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareIdentifier, setShareIdentifier] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    
    const [shareStep, setShareStep] = useState<'input' | 'confirm' | 'result'>('input');
    const [foundUser, setFoundUser] = useState<AuthorMetadata | null>(null);
    const [shareResult, setShareResult] = useState<{ type: 'direct' | 'link', url?: string, recipient?: string } | null>(null);
    const [notFoundError, setNotFoundError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(historyActiveTab);
        }
    }, [isOpen, historyActiveTab]);

    const handleClose = () => {
        setHistoryActiveTab('my');
        onClose();
        setTimeout(() => {
            setSelectedPurchase(null);
            setSelectedProfile(null);
            setActiveTab('my');
            setIsShareModalOpen(false);
            setShareResult(null);
            setShareIdentifier('');
            setShareStep('input');
            setFoundUser(null);
            setNotFoundError(false);
        }, 300);
    }
    
    const handleReactivate = (purchase: PurchaseRecord) => {
        onRepeatPurchase(purchase);
        setHomeViewActive(false);
        onClose();
    };

    if (!isOpen) return null;

    const handleSearchUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shareIdentifier.trim()) return;
        setIsSharing(true);
        setNotFoundError(false);
        try {
            const user = await searchUser(shareIdentifier);
            if (user) {
                setFoundUser(user);
                setShareStep('confirm');
            } else { setNotFoundError(true); }
        } catch (error) { setNotFoundError(true); } finally { setIsSharing(false); }
    };

    const handleConfirmShare = async () => {
        if (!selectedPurchase || !foundUser) return;
        setIsSharing(true);
        try {
            const result = await shareListWithEmail(selectedPurchase, shareIdentifier);
            if (result.success) {
                setShareResult({ type: result.type, url: result.shareUrl, recipient: result.recipientName });
                setShareStep('result');
                if (result.type === 'direct') {
                    showToast("Lista enviada com sucesso!");
                    setTimeout(() => {
                        setIsShareModalOpen(false);
                        setShareStep('input');
                        setShareIdentifier('');
                        setFoundUser(null);
                    }, 2500);
                }
            }
        } catch (error) { showToast("Erro ao compartilhar."); } finally { setIsSharing(false); }
    };

    const handleCopyInvite = async () => {
        if (shareResult?.url) {
            const inviteText = `Olá! Quero compartilhar minha lista de compras "${selectedPurchase?.marketName}" com você no app ChecklistIA. Acesse aqui: ${shareResult.url}`;
            await navigator.clipboard.writeText(inviteText);
            showToast("Convite copiado! Envie para seu amigo.");
        }
    };

    const handleViewReceived = (record: ReceivedListRecord) => {
        const url = new URL(window.location.href);
        url.searchParams.set('share_id', record.shareId);
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new Event('popstate'));
        if (!record.read) { markReceivedListAsRead(record.id); }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 animate-fadeIn" onClick={handleClose} aria-modal="true" role="dialog">
            <div className="absolute inset-x-0 bottom-0 top-12" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col h-full bg-background-light dark:bg-background-dark rounded-t-xl animate-slideUp overflow-hidden shadow-2xl">
                    {selectedPurchase ? (
                        <div className="flex flex-col h-full relative">
                            <header className="flex-shrink-0 p-4 border-b border-border-light dark:border-border-dark flex items-center gap-4">
                                <button onClick={() => setSelectedPurchase(null)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                    <span className="material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark">arrow_back</span>
                                </button>
                                <h2 className="text-lg font-bold truncate flex-1 text-text-primary-light dark:text-text-primary-dark">{selectedPurchase.marketName}</h2>
                                <button 
                                    onClick={() => { setIsShareModalOpen(true); setShareStep('input'); }}
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                    title="Compartilhar Lista"
                                >
                                    <span className="material-symbols-outlined">share</span>
                                </button>
                            </header>
                            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-black/20">
                                <button 
                                    onClick={() => handleReactivate(selectedPurchase)} 
                                    className="w-full flex items-center justify-center gap-3 h-14 mb-4 rounded-2xl bg-blue-600 text-white font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined !text-3xl">settings_backup_restore</span> 
                                    RETOMAR ESTA LISTA
                                </button>
                                
                                <div className="flex flex-col gap-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1">Itens desta compra</p>
                                    {selectedPurchase.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 rounded-xl bg-white dark:bg-surface-dark shadow-sm border border-border-light dark:border-border-dark">
                                            <div className="flex flex-col flex-1 min-w-0 pr-4">
                                                <span className="font-medium text-text-primary-light dark:text-text-primary-dark truncate">{item.name}</span>
                                                {item.details && <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{item.details}</span>}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold text-text-primary-light dark:text-text-primary-dark whitespace-nowrap">
                                                    {formatCurrency(item.calculatedPrice)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {isShareModalOpen && (
                                <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn">
                                    <div className="bg-white dark:bg-surface-dark w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-slideUp relative">
                                        <button onClick={() => { setIsShareModalOpen(false); setShareResult(null); setShareIdentifier(''); setShareStep('input'); setFoundUser(null); setNotFoundError(false); }} className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                        <h3 className="text-xl font-bold text-center mb-4 text-text-primary-light dark:text-text-primary-dark">Compartilhar Lista</h3>
                                        {shareStep === 'input' && (
                                            <form onSubmit={handleSearchUser}>
                                                <p className="text-sm text-center text-gray-500 mb-4">Envie para o app de outra pessoa.</p>
                                                <input type="text" placeholder="E-mail ou @username" value={shareIdentifier} onChange={(e) => setShareIdentifier(e.target.value)} className={`form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border h-12 px-4 mb-2 transition-colors ${notFoundError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`} required />
                                                {notFoundError && <div className="text-xs text-red-500 mb-3 text-center">Usuário não encontrado.</div>}
                                                <button type="submit" disabled={isSharing} className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 flex items-center justify-center gap-2 mt-2">
                                                    {isSharing ? 'Buscando...' : 'Buscar'}
                                                </button>
                                            </form>
                                        )}
                                        {shareStep === 'confirm' && foundUser && (
                                            <div className="flex flex-col items-center">
                                                <div className="h-20 w-20 rounded-full border-4 border-white shadow-lg overflow-hidden mb-3">
                                                    {foundUser.photoURL ? <img src={foundUser.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-orange-100 flex items-center justify-center text-primary"><span className="material-symbols-outlined !text-4xl">person</span></div>}
                                                </div>
                                                <h4 className="font-bold text-lg">{foundUser.displayName}</h4>
                                                <p className="text-sm text-center text-gray-500 mb-4">Confirmar envio para este usuário?</p>
                                                <button onClick={handleConfirmShare} disabled={isSharing} className="w-full h-12 bg-green-600 text-white font-bold rounded-xl mb-3 shadow-md">Confirmar e Enviar</button>
                                                <button onClick={() => setShareStep('input')} className="text-sm text-gray-500 underline">Voltar</button>
                                            </div>
                                        )}
                                        {shareStep === 'result' && shareResult && (
                                            <div className="text-center">
                                                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><span className="material-symbols-outlined text-4xl text-green-500">check_circle</span></div>
                                                <p className="font-bold text-lg">Enviado!</p>
                                                <p className="text-sm text-gray-500 mt-1">A lista apareceu para <span className="font-bold">{shareResult.recipient}</span>.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                         <>
                            <header className="flex-shrink-0 bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between p-4 pb-0">
                                    <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Histórico</h2>
                                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-text-secondary-light dark:text-text-secondary-dark"><span className="material-symbols-outlined">close</span></button>
                                </div>
                                <div className="flex px-4 mt-4 gap-6">
                                    <button onClick={() => setActiveTab('my')} className={`pb-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'my' ? 'border-primary text-primary' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>Minhas Compras</button>
                                    <button onClick={() => setActiveTab('received')} className={`pb-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'received' ? 'border-primary text-primary' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>Recebidos</button>
                                </div>
                            </header>
                            
                            <main className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-black/20">
                                {activeTab === 'my' ? (
                                    history.length > 0 ? (
                                        <div className="flex flex-col gap-3">
                                            {history.map(p => (
                                                <HistoryListItem 
                                                    key={p.id} 
                                                    purchase={p} 
                                                    onClick={() => setSelectedPurchase(p)} 
                                                    formatCurrency={formatCurrency}
                                                    onDelete={deleteHistoryRecord}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-64 text-center">
                                            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">history</span>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma compra salva ainda.</p>
                                        </div>
                                    )
                                ) : (
                                    receivedHistory.length > 0 ? (
                                        <div className="flex flex-col gap-3">
                                            {receivedHistory.map(r => (
                                                <ReceivedListItem key={r.id} record={r} onProfileClick={(e, author) => { e.stopPropagation(); setSelectedProfile(author); }} onClick={() => handleViewReceived(r)} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-64 text-center">
                                            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">share</span>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma lista recebida.</p>
                                        </div>
                                    )
                                )}
                            </main>
                         </>
                    )}
                </div>
            </div>
            {selectedProfile && <SocialProfileModal author={selectedProfile} onClose={() => setSelectedProfile(null)} />}
        </div>
    );
};