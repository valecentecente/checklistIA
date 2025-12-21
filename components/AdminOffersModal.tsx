
import React, { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc, limit, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useApp } from '../contexts/AppContext';
import { useShoppingList } from '../contexts/ShoppingListContext'; 
import type { Offer, SalesOpportunity } from '../types';

interface AdminOffersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminOffersModal: React.FC<AdminOffersModalProps> = ({ isOpen, onClose }) => {
    const { showToast } = useApp();
    const { logAdminAction } = useShoppingList();
    const [activeTab, setActiveTab] = useState<'add' | 'list' | 'leads'>('list');
    const [offers, setOffers] = useState<Offer[]>([]);
    const [leads, setLeads] = useState<SalesOpportunity[]>([]);
    
    // Form States
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

    useEffect(() => {
        // Se o usuário for um Guest (não autenticado no Firebase), as regras vão barrar.
        // Impedimos o listener de iniciar para evitar o erro de permissão no console.
        if (!isOpen || !db || !auth?.currentUser) return;

        const q = query(collection(db, 'offers'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                setOffers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer)));
            },
            (error) => {
                console.warn("[Admin] Erro de permissão em 'offers':", error.message);
                if (activeTab === 'list') showToast("Sem acesso ao banco de ofertas.");
            }
        );

        const qLeads = query(
            collection(db, 'sales_opportunities'), 
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        const unsubscribeLeads = onSnapshot(qLeads, 
            (snapshot) => {
                setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesOpportunity)));
            },
            (error) => {
                console.warn("[Admin] Erro de permissão em 'leads':", error.message);
            }
        );

        return () => { unsubscribe(); unsubscribeLeads(); };
    }, [isOpen, activeTab]);

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

    const handleConvertLead = (lead: SalesOpportunity) => {
        setEditingId(null);
        setName(lead.term.charAt(0).toUpperCase() + lead.term.slice(1));
        setPrice('');
        setOldPrice('');
        setDescription(`Essencial para preparar ${lead.recipeName}.`);
        setImages(['']);
        setLink('');
        setCategory('Utensílios');
        setTags(`${lead.term}, ${lead.recipeName}`);
        
        // Marca o lead como convertido para sair da lista
        updateDoc(doc(db!, 'sales_opportunities', lead.id), { status: 'converted' }).catch(() => {
            showToast("Erro ao atualizar lead.");
        });
        
        setActiveTab('add');
        showToast(`Cadastrando Achadinho para: ${lead.term}`);
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
        const validImages = images.map(i => i.trim()).filter(i => i !== '');
        if (validImages.length === 0) { showToast("Adicione a URL de pelo menos uma foto."); return; }
        setIsSubmitting(true);
        try {
            const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t !== '');
            const offerData = {
                name, price, oldPrice: oldPrice || null, description: description || null,
                image: validImages[0], images: validImages, link, category, store,
                discount: discount || null, tags: tagsArray, updatedAt: serverTimestamp()
            };
            if (editingId) {
                await updateDoc(doc(db!, 'offers', editingId), offerData);
                await logAdminAction('update', name, `Preço: ${price}`);
                showToast("Achadinho atualizado!");
            } else {
                await addDoc(collection(db!, 'offers'), { ...offerData, reviewCount: 0, averageRating: 0, createdAt: serverTimestamp() });
                await logAdminAction('create', name, `Preço: ${price}`);
                showToast("Achadinho cadastrado!");
            }
            handleCancelEdit();
            setActiveTab('list');
        } catch (error) { 
            showToast("Erro ao salvar. Verifique suas permissões."); 
        } finally { setIsSubmitting(false); }
    };

    const handleDeleteOffer = async (id: string, offerName: string) => {
        if (!window.confirm("Deseja remover esta oferta?")) return;
        try {
            await deleteDoc(doc(db!, 'offers', id));
            await logAdminAction('delete', offerName, 'Oferta removida');
            showToast("Removido.");
        } catch (error) { showToast("Erro ao deletar."); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-lg bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-400">shopping_bag</span>
                        Gestão de Achadinhos
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/20 shrink-0">
                    <button onClick={() => setActiveTab('list')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${activeTab === 'list' ? 'text-primary border-b-2 border-primary bg-white dark:bg-surface-dark' : 'text-gray-500'}`}>Listagem</button>
                    <button onClick={() => setActiveTab('leads')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest relative ${activeTab === 'leads' ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-surface-dark' : 'text-gray-500'}`}>
                        IA Leads
                        {leads.length > 0 && <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>
                    <button onClick={() => setActiveTab('add')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${activeTab === 'add' ? 'text-green-600 border-b-2 border-green-600 bg-white dark:bg-surface-dark' : 'text-gray-500'}`}>{editingId ? 'Editar' : 'Novo'}</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {!auth?.currentUser && (
                        <div className="p-4 bg-orange-100 text-orange-800 rounded-lg text-sm font-bold text-center">
                            Você está em modo de demonstração. <br/>Acesse sua conta para gerenciar ofertas reais.
                        </div>
                    )}

                    {activeTab === 'leads' ? (
                        <div className="flex flex-col gap-3">
                            {leads.length === 0 ? (
                                <div className="py-20 text-center opacity-40">
                                    <span className="material-symbols-outlined text-5xl">auto_awesome</span>
                                    <p className="text-sm mt-4 font-bold">A IA ainda não encontrou novos produtos.</p>
                                </div>
                            ) : (
                                leads.map(lead => (
                                    <div key={lead.id} className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 flex justify-between items-center group animate-fadeIn">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h3 className="font-bold text-blue-900 dark:text-blue-300 capitalize truncate">{lead.term}</h3>
                                            <p className="text-[10px] text-blue-700/60 dark:text-blue-400/60 font-medium truncate">Contexto: {lead.recipeName}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleConvertLead(lead)}
                                            className="h-9 px-4 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-sm">add</span> Cadastrar
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : activeTab === 'add' ? (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Nome do Produto</label>
                                <input className="form-input w-full rounded-xl border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-12 px-4 font-bold" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Preço (R$)</label><input className="form-input w-full rounded-xl border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-12 px-4 font-bold" value={price} onChange={e => setPrice(e.target.value)} required /></div>
                                <div className="flex-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Loja</label><select className="form-select w-full rounded-xl border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-12 px-4 font-bold" value={store} onChange={e => setStore(e.target.value)}><option value="Amazon">Amazon</option><option value="Magalu">Magalu</option><option value="Shopee">Shopee</option><option value="Mercado Livre">Mercado Livre</option></select></div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Link de Afiliado</label>
                                <input className="form-input w-full rounded-xl border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-12 px-4 text-sm" value={link} onChange={e => setLink(e.target.value)} required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Foto (URL)</label>
                                <input className="form-input w-full rounded-xl border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-12 px-4 text-xs" value={images[0]} onChange={e => setImages([e.target.value])} required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Tags (separar por vírgula)</label>
                                <input className="form-input w-full rounded-xl border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-12 px-4 text-sm" value={tags} onChange={e => setTags(e.target.value)} placeholder="liquidificador, bolo, frito" />
                            </div>
                            <button type="submit" disabled={isSubmitting} className="h-14 bg-green-600 text-white rounded-xl font-black uppercase mt-4 shadow-lg active:scale-95 transition-all">{isSubmitting ? 'Salvando...' : 'Finalizar Achadinho'}</button>
                        </form>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {offers.map(offer => (
                                <div key={offer.id} className="flex gap-3 items-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <img src={offer.image} className="w-12 h-12 object-contain bg-white rounded-lg border" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate dark:text-white">{offer.name}</p>
                                        <p className="text-xs text-gray-500">{offer.price} • {offer.store}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(offer)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"><span className="material-symbols-outlined">edit</span></button>
                                        <button onClick={() => handleDeleteOffer(offer.id, offer.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"><span className="material-symbols-outlined">delete</span></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
