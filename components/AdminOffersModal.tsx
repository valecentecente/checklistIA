import React, { useState, useEffect, useMemo } from 'react';
import { addDoc, collection, serverTimestamp, deleteDoc, doc, onSnapshot, query, updateDoc, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useApp } from '../contexts/AppContext';
import { useShoppingList } from '../contexts/ShoppingListContext'; 
import type { Offer } from '../types';

const ignorePermissionError = (err: any) => {
    return err.code === 'permission-denied' || (err.message && err.message.includes('Missing or insufficient permissions'));
};

interface AdminOffersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminOffersModal: React.FC<AdminOffersModalProps> = ({ isOpen, onClose }) => {
    const app = useApp();
    const { showToast, isAdmin, pendingInventoryItem, setPendingInventoryItem } = app;
    const { logAdminAction } = useShoppingList();
    const [activeTab, setActiveTab] = useState<'add' | 'list'>('list');
    const [offers, setOffers] = useState<Offer[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [sortMode, setSortMode] = useState<'newest' | 'alphabetical'>('newest');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [oldPrice, setOldPrice] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<string[]>(['']);
    const [link, setLink] = useState('');
    const [category, setCategory] = useState('Utensílios');
    const [store, setStore] = useState('Amazon');
    const [discount, setDiscount] = useState('');
    const [tags, setTags] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Detectar item pendente da Fábrica
    useEffect(() => {
        if (isOpen && pendingInventoryItem) {
            handleCancelEdit(); 
            setName(pendingInventoryItem.name);
            setTags(pendingInventoryItem.tags);
            setActiveTab('add'); 
            setPendingInventoryItem(null); 
        }
    }, [isOpen, pendingInventoryItem]);

    useEffect(() => {
        if (!isOpen || !db || !auth?.currentUser || !isAdmin) return;

        const qOffers = query(collection(db, 'offers'), limit(300));
        const unsubscribeOffers = onSnapshot(qOffers, 
            (snapshot) => {
                setOffers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer)));
            },
            (error) => {
                if (!ignorePermissionError(error)) {
                    console.warn("[Admin Offers] Erro:", error.message);
                }
            }
        );

        return () => { unsubscribeOffers(); };
    }, [isOpen, isAdmin]);

    const processedOffers = useMemo(() => {
        let result = [...offers];

        if (searchTerm.trim()) {
            const lowTerm = searchTerm.toLowerCase();
            result = result.filter(o => 
                o.name.toLowerCase().includes(lowTerm) || 
                (o.tags && o.tags.some(t => t.toLowerCase().includes(lowTerm))) ||
                o.store.toLowerCase().includes(lowTerm)
            );
        }

        result.sort((a, b) => {
            if (sortMode === 'alphabetical') {
                return a.name.localeCompare(b.name);
            } else {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            }
        });

        return result;
    }, [offers, searchTerm, sortMode]);

    const handleEdit = (offer: Offer) => {
        setEditingId(offer.id);
        setName(offer.name);
        setPrice(offer.price);
        setOldPrice(offer.oldPrice || '');
        setDescription(offer.description || '');
        setImages(offer.images && offer.images.length > 0 ? offer.images : [offer.image]);
        setLink(offer.link);
        setCategory(offer.category);
        setStore(offer.store);
        setDiscount(offer.discount || '');
        setTags(offer.tags ? offer.tags.join(', ') : '');
        setActiveTab('add');
    };

    const handleDeleteOffer = async (id: string, name: string) => {
        if (!window.confirm(`Apagar "${name}" permanentemente?`)) return;
        try {
            await deleteDoc(doc(db!, 'offers', id));
            showToast("Oferta removida!");
        } catch (e) {
            showToast("Erro ao deletar.");
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setName('');
        setPrice('');
        setOldPrice('');
        setDescription('');
        setImages(['']);
        setLink('');
        setDiscount('');
        setTags('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const tagsArray = tags.split(',')
                .map(t => t.trim())
                .filter(t => t !== '');

            const offerData = {
                name, price, oldPrice: oldPrice || null, description: description || null,
                image: images[0], images: images, link, category, store,
                discount: discount || null, tags: tagsArray, updatedAt: serverTimestamp()
            };
            if (editingId) {
                await updateDoc(doc(db!, 'offers', editingId), offerData);
                showToast("Atualizado!");
            } else {
                await addDoc(collection(db!, 'offers'), { ...offerData, reviewCount: 0, averageRating: 0, createdAt: serverTimestamp() });
                showToast("Cadastrado!");
            }
            handleCancelEdit();
            setActiveTab('list');
        } catch (error) { 
            showToast("Erro ao salvar."); 
        } finally { setIsSubmitting(false); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-lg bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-slideUp" onClick={e => e.stopPropagation()}>
                
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">Gestão de Inventário</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/20 shrink-0">
                    <button onClick={() => setActiveTab('list')} className={`flex-1 py-3 text-[10px] font-black uppercase transition-all ${activeTab === 'list' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>Listagem</button>
                    <button onClick={() => setActiveTab('add')} className={`flex-1 py-3 text-[10px] font-black uppercase transition-all ${activeTab === 'add' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>{editingId ? 'Editar' : 'Novo'}</button>
                </div>

                {activeTab === 'list' && (
                    <div className="p-3 bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2 shrink-0 animate-fadeIn">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input 
                                type="text" 
                                placeholder="Pesquisar no inventário..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                                    <span className="material-symbols-outlined text-sm">cancel</span>
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setSortMode('newest')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[9px] font-black uppercase transition-all border ${sortMode === 'newest' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}
                            >
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                Recentes
                            </button>
                            <button 
                                onClick={() => setSortMode('alphabetical')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[9px] font-black uppercase transition-all border ${sortMode === 'alphabetical' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}
                            >
                                <span className="material-symbols-outlined text-[14px]">sort_by_alpha</span>
                                Nome A-Z
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide bg-gray-50 dark:bg-black/10">
                    {activeTab === 'add' ? (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fadeIn pb-8">
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Nome do Produto</label>
                                <input className="form-input w-full rounded-xl dark:bg-black/20 dark:text-white h-12 px-4 font-bold border-gray-200 dark:border-gray-700 mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Panificadora Britânia" required />
                            </div>
                            
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Preço Atual</label>
                                    <input className="form-input w-full rounded-xl dark:bg-black/20 dark:text-white h-12 px-4 border-gray-200 dark:border-gray-700 mt-1" value={price} onChange={e => setPrice(e.target.value)} placeholder="R$ 0,00" required />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Loja Parceira</label>
                                    <select className="form-select w-full rounded-xl dark:bg-black/20 dark:text-white h-12 px-4 border-gray-200 dark:border-gray-700 mt-1" value={store} onChange={e => setStore(e.target.value)}><option value="Amazon">Amazon</option><option value="Magalu">Magalu</option><option value="Shopee">Shopee</option><option value="Mercado Livre">Mercado Livre</option></select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Link de Afiliado</label>
                                <input className="form-input w-full rounded-xl dark:bg-black/20 dark:text-white h-12 px-4 border-gray-200 dark:border-gray-700 mt-1" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." required />
                            </div>
                            
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">URL da Imagem</label>
                                <input className="form-input w-full rounded-xl dark:bg-black/20 dark:text-white h-12 px-4 border-gray-200 dark:border-gray-700 mt-1" value={images[0]} onChange={e => setImages([e.target.value])} placeholder="https://image..." required />
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Tags (use vírgula para separar)</label>
                                <textarea 
                                    className="form-input w-full rounded-xl dark:bg-black/20 dark:text-white h-20 px-4 py-3 border-gray-200 dark:border-gray-700 mt-1 text-xs font-medium resize-none" 
                                    value={tags} 
                                    onChange={e => setTags(e.target.value)} 
                                    placeholder="Ex: batedeira, inox, bolo, confeitaria" 
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Descrição Curta</label>
                                <textarea 
                                    className="form-input w-full rounded-xl dark:bg-black/20 dark:text-white h-24 px-4 py-3 border-gray-200 dark:border-gray-700 mt-1 text-xs font-medium resize-none" 
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)} 
                                    placeholder="Descreva o produto..." 
                                />
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={handleCancelEdit} className="flex-1 h-14 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-xl font-bold uppercase text-xs">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="flex-[2] h-14 bg-green-600 text-white rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all">{isSubmitting ? 'Salvando...' : 'Finalizar'}</button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex flex-col gap-3 animate-fadeIn">
                            {processedOffers.length === 0 ? (
                                <div className="py-20 text-center opacity-40">
                                    <p className="text-sm font-bold italic text-gray-500">Nenhum item corresponde à sua busca.</p>
                                </div>
                            ) : (
                                processedOffers.map(offer => (
                                    <div key={offer.id} className="flex gap-3 items-center p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-gray-800 group hover:border-primary/40 transition-colors">
                                        <img src={offer.image} className="w-12 h-12 object-contain bg-white rounded-lg border shrink-0" alt={offer.name} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm truncate dark:text-white">{offer.name}</p>
                                            <p className="text-[10px] text-gray-500">{offer.price} • {offer.store} • {offer.category}</p>
                                        </div>
                                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(offer)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors" title="Editar"><span className="material-symbols-outlined text-xl">edit</span></button>
                                            <button onClick={() => handleDeleteOffer(offer.id, offer.name)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Deletar"><span className="material-symbols-outlined text-xl">delete</span></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                
                <div className="p-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center px-6 shrink-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Exibindo {processedOffers.length} de {offers.length} produtos
                    </p>
                </div>
            </div>
        </div>
    );
};