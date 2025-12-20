
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, limit, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { db } from '../firebase';
import { useApp, callGenAIWithRetry } from '../contexts/AppContext';
import type { FullRecipe } from '../types';

interface RecipeWithId extends FullRecipe {
    id: string;
}

export const AdminRecipesModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { showToast, generateKeywords } = useApp();
    const [recipes, setRecipes] = useState<RecipeWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados de Edição
    const [editingRecipe, setEditingRecipe] = useState<RecipeWithId | null>(null);
    const [editName, setEditName] = useState('');
    const [editTags, setEditTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);

    useEffect(() => {
        if (!isOpen || !db) return;
        setIsLoading(true);
        const q = query(collection(db, 'global_recipes'), orderBy('createdAt', 'desc'), limit(500));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedRecipes: RecipeWithId[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as FullRecipe;
                if (data.name) loadedRecipes.push({ ...data, id: doc.id });
            });
            setRecipes(loadedRecipes);
            setIsLoading(false);
        }, (error) => {
            console.error("Firestore error:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [isOpen]);

    const handleOpenEdit = (recipe: RecipeWithId) => {
        setEditingRecipe(recipe);
        setEditName(recipe.name);
        setEditTags(recipe.tags || []);
        setTagInput('');
    };

    const handleCloseEdit = () => {
        setEditingRecipe(null);
        setIsRegeneratingImage(false);
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim().toLowerCase();
            if (!editTags.includes(newTag)) {
                setEditTags([...editTags, newTag]);
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setEditTags(editTags.filter(t => t !== tagToRemove));
    };

    const compressImage = (base64Str: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 512; 
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                } else {
                    resolve(base64Str);
                }
            };
            img.onerror = () => resolve(base64Str);
        });
    };

    const handleRegenerateImage = async () => {
        if (!editingRecipe || isRegeneratingImage) return;
        const apiKey = process.env.API_KEY as string;
        if (!apiKey) { showToast("Chave IA ausente."); return; }

        setIsRegeneratingImage(true);
        showToast("Gerando nova foto via IA...");

        try {
            const ai = new GoogleGenAI({ apiKey });
            const response: any = await callGenAIWithRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [{ text: `Foto profissional e apetitosa de: ${editingRecipe.imageQuery || editName}. Fotografia de comida realística, luz natural.` }]
                },
                config: { responseModalities: [Modality.IMAGE] },
            }), 3);

            const part = response.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData) {
                const base64ImageBytes = part.inlineData.data;
                const generatedUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
                const compressedUrl = await compressImage(generatedUrl);
                
                await updateDoc(doc(db!, 'global_recipes', editingRecipe.id), {
                    imageUrl: compressedUrl,
                    imageSource: 'genai',
                    updatedAt: serverTimestamp()
                });
                
                setEditingRecipe(prev => prev ? {...prev, imageUrl: compressedUrl} : null);
                showToast("Imagem atualizada!");
            }
        } catch (error) {
            showToast("Erro ao gerar imagem.");
        } finally {
            setIsRegeneratingImage(false);
        }
    };

    const handleSaveRecipe = async () => {
        if (!editingRecipe || isSaving) return;
        setIsSaving(true);

        try {
            await updateDoc(doc(db!, 'global_recipes', editingRecipe.id), {
                name: editName,
                tags: editTags,
                keywords: generateKeywords(editName),
                updatedAt: serverTimestamp()
            });
            showToast("Receita salva!");
            handleCloseEdit();
        } catch (error) {
            showToast("Erro ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (recipeId: string, recipeName: string) => {
        if (!window.confirm(`Apagar "${recipeName}" permanentemente?`)) return;
        try {
            await deleteDoc(doc(db!, 'global_recipes', recipeId));
            showToast("Removido.");
            if (editingRecipe?.id === recipeId) handleCloseEdit();
        } catch (error) { showToast("Erro ao deletar."); }
    };

    const processedRecipes = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return recipes.filter(r => 
            r.name.toLowerCase().includes(lowerSearch) || 
            r.tags?.some(tag => tag.toLowerCase().includes(lowerSearch))
        );
    }, [recipes, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-5xl bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header Principal */}
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-orange-400">menu_book</span>
                        Gestão de Acervo
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
                </div>

                {/* Filtro */}
                <div className="p-3 bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <input type="text" placeholder="Buscar no acervo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-sm font-medium" />
                </div>

                {/* Grid de Receitas */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-black/20">
                    {isLoading ? (
                        <div className="flex justify-center py-10"><span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span></div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {processedRecipes.map((recipe) => (
                                <div 
                                    key={recipe.id} 
                                    onClick={() => handleOpenEdit(recipe)}
                                    className="bg-white dark:bg-surface-dark rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col group relative cursor-pointer hover:border-primary/50 transition-all"
                                >
                                    <div className="aspect-square bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
                                        {recipe.imageUrl ? <img src={recipe.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="absolute inset-0 flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-4xl">image</span></div>}
                                        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id, recipe.name); }} className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-sm">delete</span></button>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-bold text-[10px] text-gray-800 dark:text-gray-200 line-clamp-2 uppercase leading-tight">{recipe.name}</h3>
                                        <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">{recipe.tags?.length || 0} Tags</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MODAL DE EDIÇÃO (OVERLAY) */}
                {editingRecipe && (
                    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slideUp flex flex-col max-h-[85vh]">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-black/20">
                                <h3 className="font-bold text-gray-800 dark:text-white uppercase tracking-tighter">Editar Receita</h3>
                                <button onClick={handleCloseEdit} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full"><span className="material-symbols-outlined">close</span></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Preview Imagem & Botão Regenerar */}
                                <div className="relative group rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-video flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700">
                                    {editingRecipe.imageUrl ? (
                                        <img src={editingRecipe.imageUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-6xl text-gray-300">image</span>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                        <button 
                                            onClick={handleRegenerateImage}
                                            disabled={isRegeneratingImage}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold uppercase shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <span className={`material-symbols-outlined text-sm ${isRegeneratingImage ? 'animate-spin' : ''}`}>refresh</span>
                                            {isRegeneratingImage ? 'Gerando...' : 'Gerar Nova Foto IA'}
                                        </button>
                                        <p className="text-[10px] text-white/80 font-medium px-4 text-center italic">Usa Gemini 2.5 Image para criar uma nova foto profissional.</p>
                                    </div>
                                </div>

                                {/* Nome da Receita */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Título do Prato</label>
                                    <input 
                                        type="text" 
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-xl h-12 px-4 font-bold text-gray-800 dark:text-white"
                                    />
                                </div>

                                {/* Tags (Chips) */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Categorias & Tags (Enter para add)</label>
                                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[100px]">
                                        {editTags.map((tag, idx) => (
                                            <span key={idx} className="flex items-center gap-1 bg-primary/10 text-primary dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold border border-primary/20 animate-fadeIn">
                                                {tag}
                                                <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 transition-colors">
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </span>
                                        ))}
                                        <input 
                                            type="text" 
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={handleAddTag}
                                            placeholder="Nova tag..."
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm h-7 min-w-[80px] dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-black/40 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                                <button onClick={handleCloseEdit} className="flex-1 h-12 rounded-xl bg-gray-200 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-300 transition-all uppercase text-xs">Descartar</button>
                                <button 
                                    onClick={handleSaveRecipe}
                                    disabled={isSaving}
                                    className="flex-[2] h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 uppercase text-xs flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">save</span>}
                                    {isSaving ? 'Salvando...' : 'Confirmar Alterações'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
