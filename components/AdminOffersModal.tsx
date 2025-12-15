
import React, { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../contexts/AppContext';
import { useShoppingList } from '../contexts/ShoppingListContext'; // Importar contexto
import type { Offer } from '../types';

interface AdminOffersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminOffersModal: React.FC<AdminOffersModalProps> = ({ isOpen, onClose }) => {
    const { showToast } = useApp();
    const { logAdminAction } = useShoppingList(); // Hook de Log
    const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
    const [offers, setOffers] = useState<Offer[]>([]);
    
    // Form States
    const [editingId, setEditingId] = useState<string | null>(null); // ID se estiver editando
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [oldPrice, setOldPrice] = useState('');
    const [description, setDescription] = useState(''); // NOVO: Descrição
    
    // Image States (Agora gerenciado diretamente como array de inputs)
    const [images, setImages] = useState<string[]>(['']); // Começa com um campo vazio
    const [previewIndex, setPreviewIndex] = useState(0); // Para o carrossel no admin

    const [link, setLink] = useState('');
    const [category, setCategory] = useState('Utensílios');
    const [store, setStore] = useState('Amazon');
    const [discount, setDiscount] = useState('');
    const [tags, setTags] = useState(''); // Estado para Tags (string separada por vírgula)
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen || !db) return;

        // Listener em tempo real para a lista de ofertas
        const q = query(collection(db, 'offers'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedOffers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Offer));
            setOffers(loadedOffers);
        });

        return () => unsubscribe();
    }, [isOpen]);

    // Carrossel Automático no Admin
    useEffect(() => {
        // Filtra apenas imagens válidas para o preview
        const validImages = images.filter(img => img.trim() !== '');
        if (validImages.length <= 1) return;
        
        const interval = setInterval(() => {
            setPreviewIndex(prev => (prev + 1) % validImages.length);
        }, 3000); // 3 segundos
        
        return () => clearInterval(interval);
    }, [images]);

    const handleEdit = (offer: Offer) => {
        setEditingId(offer.id);
        setName(offer.name);
        setPrice(offer.price);
        setOldPrice(offer.oldPrice || '');
        setDescription(offer.description || ''); // Popula descrição
        
        // Popula imagens: garante que tenha pelo menos um campo
        if (offer.images && offer.images.length > 0) {
            setImages(offer.images);
        } else if (offer.image) {
            setImages([offer.image]);
        } else {
            setImages(['']);
        }

        setLink(offer.link);
        setCategory(offer.category);
        setStore(offer.store);
        setDiscount(offer.discount || '');
        setTags(offer.tags ? offer.tags.join(', ') : '');
        
        setActiveTab('add'); // Muda para a aba de formulário
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setName('');
        setPrice('');
        setOldPrice('');
        setDescription('');
        setImages(['']); // Reseta para um campo vazio
        setLink('');
        setDiscount('');
        setTags('');
    };

    // Atualiza uma URL específica no array
    const handleImageChange = (index: number, value: string) => {
        const newImages = [...images];
        newImages[index] = value;
        setImages(newImages);
    };

    // Adiciona uma nova linha de input
    const handleAddImageField = () => {
        if (images.length >= 5) {
            showToast("Máximo de 5 fotos.");
            return;
        }
        setImages([...images, '']);
    };

    // Remove uma linha de input
    const handleRemoveImageField = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages.length > 0 ? newImages : ['']); // Garante pelo menos um campo
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Filtra strings vazias
        const validImages = images.map(i => i.trim()).filter(i => i !== '');

        if (validImages.length === 0) {
            showToast("Adicione a URL de pelo menos uma foto.");
            return;
        }

        // Verifica duplicatas antes de enviar
        const uniqueImages = new Set(validImages);
        if (uniqueImages.size !== validImages.length) {
            showToast("Existem URLs de imagens duplicadas. Remova as repetidas.");
            return;
        }

        setIsSubmitting(true);

        try {
            if (!db) throw new Error("DB offline");

            // Processa as tags: separa por vírgula e remove espaços
            const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t !== '');

            const offerData = {
                name,
                price,
                oldPrice: oldPrice || null,
                description: description || null,
                image: validImages[0], // A primeira imagem válida é a "capa"
                images: validImages,   // Lista completa limpa
                link,
                category,
                store,
                discount: discount || null,
                tags: tagsArray,
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                // UPDATE
                await updateDoc(doc(db, 'offers', editingId), offerData);
                await logAdminAction('update', name, `Preço: ${price}`); // LOG
                showToast("Oferta atualizada com sucesso!");
                handleCancelEdit(); // Limpa o form e sai do modo edição
            } else {
                // CREATE
                await addDoc(collection(db, 'offers'), {
                    ...offerData,
                    reviewCount: 0, // Inicia contagem de reviews
                    averageRating: 0,
                    createdAt: serverTimestamp() // Mantém created apenas na criação
                });
                await logAdminAction('create', name, `Preço: ${price}`); // LOG
                showToast("Oferta adicionada com sucesso!");
                handleCancelEdit(); // Limpa o form
            }
            
        } catch (error) {
            console.error("Erro ao salvar oferta:", error);
            showToast("Erro ao salvar oferta.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, offerName: string) => {
        if (!window.confirm("Tem certeza que deseja apagar esta oferta?")) return;
        
        try {
            if (!db) return;
            await deleteDoc(doc(db, 'offers', id));
            await logAdminAction('delete', offerName, 'Oferta removida'); // LOG
            showToast("Oferta removida.");
            
            // Se estiver editando o item que foi deletado, cancela a edição
            if (editingId === id) {
                handleCancelEdit();
            }
        } catch (error) {
            console.error("Erro ao deletar:", error);
            showToast("Erro ao deletar oferta.");
        }
    };

    // Imagens válidas para o preview
    const previewImages = images.filter(i => i.trim() !== '');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-lg bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-400">admin_panel_settings</span>
                        Painel Admin
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/20 shrink-0">
                    <button 
                        onClick={() => setActiveTab('add')}
                        className={`flex-1 py-3 text-sm font-bold ${activeTab === 'add' ? 'text-primary border-b-2 border-primary bg-white dark:bg-surface-dark' : 'text-gray-500'}`}
                    >
                        {editingId ? 'Editar Oferta' : 'Adicionar Novo'}
                    </button>
                    <button 
                        onClick={() => setActiveTab('list')}
                        className={`flex-1 py-3 text-sm font-bold ${activeTab === 'list' ? 'text-primary border-b-2 border-primary bg-white dark:bg-surface-dark' : 'text-gray-500'}`}
                    >
                        Gerenciar ({offers.length})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'add' ? (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {editingId && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-xs text-yellow-700 dark:text-yellow-400 flex justify-between items-center">
                                    <span>Editando ID: {editingId.slice(0, 8)}...</span>
                                    <button type="button" onClick={handleCancelEdit} className="underline font-bold">Cancelar</button>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nome do Produto</label>
                                <input className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-10 px-3" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Preço (R$)</label>
                                    <input className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-10 px-3" value={price} onChange={e => setPrice(e.target.value)} required placeholder="29,90" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Preço Antigo (Opcional)</label>
                                    <input className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-10 px-3" value={oldPrice} onChange={e => setOldPrice(e.target.value)} placeholder="49,90" />
                                </div>
                            </div>

                            {/* --- SEÇÃO DE IMAGENS (Inputs Dinâmicos) --- */}
                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Fotos do Produto ({images.length}/5)</label>
                                    <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Carrossel 3s</span>
                                </div>
                                
                                <div className="flex flex-col gap-2 mb-3">
                                    {images.map((imgUrl, idx) => {
                                        // Verifica duplicidade
                                        const duplicateIndex = images.findIndex((otherUrl, otherIdx) => 
                                            otherIdx !== idx && // Não é o próprio campo
                                            otherUrl.trim() !== '' && // Não está vazio
                                            otherUrl.trim() === imgUrl.trim() // É igual
                                        );
                                        const isDuplicate = duplicateIndex !== -1;

                                        return (
                                            <div key={idx} className="animate-fadeIn flex flex-col gap-1">
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${isDuplicate ? 'text-red-500' : 'text-gray-400'}`}>#{idx + 1}</span>
                                                        <input 
                                                            className={`form-input w-full rounded-lg border h-10 pl-8 pr-3 text-sm transition-colors dark:text-white ${
                                                                isDuplicate 
                                                                ? 'border-red-500 focus:border-red-500 text-red-600 focus:ring-red-200 dark:bg-red-900/10' 
                                                                : 'border-gray-300 dark:border-gray-700 dark:bg-black/20'
                                                            }`}
                                                            value={imgUrl} 
                                                            onChange={e => handleImageChange(idx, e.target.value)} 
                                                            placeholder="Cole a URL da imagem..." 
                                                        />
                                                    </div>
                                                    {/* Botão de Remover (Apenas se houver mais de 1 campo ou se não for o primeiro preenchido) */}
                                                    {images.length > 1 && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleRemoveImageField(idx)}
                                                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 transition-colors"
                                                            title="Remover linha"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                                {isDuplicate && (
                                                    <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1 animate-pulse">
                                                        <span className="material-symbols-outlined text-xs">error</span>
                                                        Esta URL já está sendo usada na foto #{duplicateIndex + 1}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Botão para Adicionar Nova Linha */}
                                {images.length < 5 && (
                                    <button 
                                        type="button"
                                        onClick={handleAddImageField}
                                        className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 text-sm font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 mb-4"
                                    >
                                        <span className="material-symbols-outlined">add_photo_alternate</span>
                                        Adicionar outra foto
                                    </button>
                                )}

                                {/* PREVIEW GRANDE (CARROSSEL) */}
                                {previewImages.length > 0 ? (
                                    <div className="relative w-full aspect-square sm:aspect-video rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200 dark:border-gray-700">
                                        {previewImages.map((img, idx) => (
                                            <div 
                                                key={idx}
                                                className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center justify-center p-4 ${idx === (previewIndex % previewImages.length) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                            >
                                                <img src={img} alt="Preview" className="max-w-full max-h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                                            </div>
                                        ))}
                                        {/* Dots */}
                                        {previewImages.length > 1 && (
                                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                                                {previewImages.map((_, idx) => (
                                                    <div key={idx} className={`h-1.5 w-1.5 rounded-full transition-colors ${idx === (previewIndex % previewImages.length) ? 'bg-primary' : 'bg-gray-300'}`}></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-32 flex items-center justify-center text-gray-400 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-black/10">
                                        As fotos aparecerão aqui
                                    </div>
                                )}
                            </div>

                            {/* --- CAMPO DE DESCRIÇÃO (NOVO) --- */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Descrição Detalhada</label>
                                <textarea
                                    className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white p-3 h-24 resize-none text-sm"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Escreva os detalhes, benefícios e características do produto..."
                                ></textarea>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Link de Afiliado</label>
                                <input className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-10 px-3" value={link} onChange={e => setLink(e.target.value)} required placeholder="https://amzn.to/..." />
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Categoria</label>
                                    <select className="form-select w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-10 px-3" value={category} onChange={e => setCategory(e.target.value)}>
                                        <option value="Utensílios">Utensílios</option>
                                        <option value="Eletro">Eletro</option>
                                        <option value="Organização">Organização</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Loja</label>
                                    <select className="form-select w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-10 px-3" value={store} onChange={e => setStore(e.target.value)}>
                                        <option value="Amazon">Amazon</option>
                                        <option value="Shopee">Shopee</option>
                                        <option value="Magalu">Magalu</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Tags (Para Busca Contextual)</label>
                                <input 
                                    className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-10 px-3" 
                                    value={tags} 
                                    onChange={e => setTags(e.target.value)} 
                                    placeholder="Ex: batedeira, bater ovos, bolo, claras em neve" 
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Separe por vírgula. Essas palavras conectarão o produto às receitas.</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Badge/Desconto (Opcional)</label>
                                <input className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-black/20 dark:text-white h-10 px-3" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="Ex: -30% ou Recomendado" />
                            </div>

                            <div className="flex gap-2 mt-4">
                                {editingId && (
                                    <button type="button" onClick={handleCancelEdit} className="flex-1 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 h-12 rounded-xl font-bold hover:bg-gray-300 transition-colors">
                                        Cancelar
                                    </button>
                                )}
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-green-600 text-white h-12 rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50">
                                    {isSubmitting ? 'Salvando...' : (editingId ? 'Atualizar Oferta' : 'Adicionar Oferta')}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-gray-400 text-center mb-2">Clique em um item para editar</p>
                            {offers.map(offer => (
                                <div 
                                    key={offer.id} 
                                    className="flex gap-3 items-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-primary/50 transition-colors group"
                                    onClick={() => handleEdit(offer)}
                                >
                                    {/* Miniatura Fixa (Usa a capa) */}
                                    <img src={offer.image} alt={offer.name} className="w-12 h-12 object-contain bg-white rounded" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate group-hover:text-primary transition-colors">{offer.name}</p>
                                        <p className="text-xs text-gray-500">{offer.price} • {offer.store}</p>
                                        {offer.images && offer.images.length > 1 && (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded mt-1 inline-block">
                                                {offer.images.length} fotos
                                            </span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(offer.id, offer.name); }}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                        title="Excluir"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            ))}
                            {offers.length === 0 && <p className="text-center text-gray-500 mt-10">Nenhuma oferta cadastrada.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
