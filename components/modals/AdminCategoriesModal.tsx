
import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import type { HomeCategory } from '../../types';

export const AdminCategoriesModal: React.FC = () => {
    const { isAdminCategoriesModalOpen, closeModal, homeCategories, saveHomeCategories, showToast } = useApp();
    const { user } = useAuth();
    const [localCats, setLocalCats] = useState<HomeCategory[]>([]);
    
    useEffect(() => {
        if (isAdminCategoriesModalOpen) {
            setLocalCats([...homeCategories].sort((a, b) => a.order - b.order));
        }
    }, [isAdminCategoriesModalOpen, homeCategories]);

    if (!isAdminCategoriesModalOpen) return null;

    const handleAdd = () => {
        const newCat: HomeCategory = {
            id: 'cat_' + Date.now(),
            label: 'Nova Coleção',
            icon: 'restaurant',
            tags: ['Geral'],
            order: localCats.length,
            active: true
        };
        setLocalCats([...localCats, newCat]);
    };

    const handleRemove = (id: string) => {
        setLocalCats(localCats.filter(c => c.id !== id));
    };

    const handleUpdate = (id: string, field: keyof HomeCategory, value: any) => {
        setLocalCats(localCats.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const moveOrder = (index: number, direction: 'up' | 'down') => {
        const newArr = [...localCats];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= newArr.length) return;
        
        [newArr[index], newArr[target]] = [newArr[target], newArr[index]];
        // Re-assign order numbers
        const updated = newArr.map((c, i) => ({...c, order: i}));
        setLocalCats(updated);
    };

    const handleSave = async () => {
        try {
            await saveHomeCategories(localCats);
            closeModal('adminCategories');
        } catch (error) {
            showToast("Erro ao salvar categorias.");
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('adminCategories')}>
            <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>
                
                <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">dashboard_customize</span>
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg leading-none">Coleções da Home</h2>
                            <p className="text-[10px] text-gray-400 uppercase mt-1 font-black">Layout Dinâmico do App</p>
                        </div>
                    </div>
                    <button onClick={() => closeModal('adminCategories')} className="text-gray-400 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 scrollbar-hide">
                    {localCats.map((cat, idx) => (
                        <div key={cat.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-4 animate-fadeIn group">
                            <div className="flex flex-col sm:flex-row gap-4 items-start">
                                {/* Icon & Label */}
                                <div className="flex-1 w-full space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center border border-slate-600 shrink-0">
                                            <span className="material-symbols-outlined text-orange-400">{cat.icon || 'restaurant'}</span>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Título Exibido</label>
                                            <input 
                                                type="text" 
                                                value={cat.label}
                                                onChange={e => handleUpdate(cat.id, 'label', e.target.value)}
                                                className="w-full bg-slate-700 border-0 rounded-lg text-white font-bold h-10 px-3 text-sm"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Tags de Busca (IA)</label>
                                        <input 
                                            type="text" 
                                            value={cat.tags.join(', ')}
                                            onChange={e => handleUpdate(cat.id, 'tags', e.target.value.split(',').map(t => t.trim()))}
                                            placeholder="Ex: sorvete, gelato, refrescante"
                                            className="w-full bg-slate-700 border-0 rounded-lg text-white font-bold h-10 px-3 text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex sm:flex-col gap-2 shrink-0">
                                    <button onClick={() => moveOrder(idx, 'up')} disabled={idx === 0} className="h-10 w-10 flex items-center justify-center bg-slate-700 text-gray-400 hover:text-white rounded-lg disabled:opacity-20"><span className="material-symbols-outlined">expand_less</span></button>
                                    <button onClick={() => moveOrder(idx, 'down')} disabled={idx === localCats.length - 1} className="h-10 w-10 flex items-center justify-center bg-slate-700 text-gray-400 hover:text-white rounded-lg disabled:opacity-20"><span className="material-symbols-outlined">expand_more</span></button>
                                    <button onClick={() => handleRemove(cat.id)} className="h-10 w-10 flex items-center justify-center bg-red-900/20 text-red-500 hover:bg-red-900/40 rounded-lg"><span className="material-symbols-outlined">delete</span></button>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button 
                        onClick={handleAdd}
                        className="w-full py-6 border-2 border-dashed border-slate-700 rounded-xl text-gray-500 font-bold hover:border-orange-500 hover:text-orange-400 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                        Adicionar Coleção Sugerida
                    </button>
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-800 flex gap-3 shrink-0">
                    <button onClick={() => closeModal('adminCategories')} className="flex-1 h-12 rounded-xl bg-slate-700 text-white font-bold">Cancelar</button>
                    <button onClick={handleSave} className="flex-[2] h-12 rounded-xl bg-orange-600 text-white font-black uppercase tracking-widest shadow-lg hover:bg-orange-500 transition-all">Salvar Layout</button>
                </div>
            </div>
        </div>
    );
};
