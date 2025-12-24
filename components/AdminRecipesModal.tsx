
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, limit, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { db, auth } from '../firebase';
import { useApp, callGenAIWithRetry } from '../contexts/AppContext';
import type { FullRecipe } from '../types';

interface RecipeWithId extends FullRecipe {
    id: string;
}

export const AdminRecipesModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { showToast, generateKeywords, totalRecipeCount } = useApp();
    const [recipes, setRecipes] = useState<RecipeWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados de Edição Avançada
    const [editingRecipe, setEditingRecipe] = useState<RecipeWithId | null>(null);
    const [editName, setEditName] = useState('');
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editLeads, setEditLeads] = useState<string[]>([]);
    const [editIngredients, setEditIngredients] = useState<{simplifiedName: string, detailedName: string}[]>([]);
    const [editInstructions, setEditInstructions] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [leadInput, setLeadInput] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);
    const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
    const [isRegeneratingText, setIsRegeneratingText] = useState(false);

    useEffect(() => {
        if (!isOpen || !db || !auth?.currentUser) {
            if (isOpen && !auth?.currentUser) setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        const q = query(collection(db, 'global_recipes'), orderBy('createdAt', 'desc'), limit(1000));
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const loadedRecipes: RecipeWithId[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data() as FullRecipe;
                    if (data.name) loadedRecipes.push({ ...data, id: doc.id });
                });
                setRecipes(loadedRecipes);
                setIsLoading(false);
            }, 
            (error) => {
                console.warn("[Admin] Erro de permissão em 'recipes':", error.message);
                setIsLoading(false);
            }
        );
        return () => unsubscribe();
    }, [isOpen]);

    const handleOpenEdit = (recipe: RecipeWithId) => {
        setEditingRecipe(recipe);
        setEditName(recipe.name);
        setEditTags(recipe.tags || []);
        setEditLeads(recipe.suggestedLeads || []);
        setEditIngredients(recipe.ingredients || []);
        setEditInstructions(recipe.instructions || []);
        setTagInput('');
        setLeadInput('');
    };

    const handleCloseEdit = () => {
        setEditingRecipe(null);
        setIsRegeneratingImage(false);
        setIsRegeneratingText(false);
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

    const handleAddLead = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && leadInput.trim()) {
            e.preventDefault();
            const newLead = leadInput.trim().toLowerCase();
            if (!editLeads.includes(newLead)) {
                setEditLeads([...editLeads, newLead]);
            }
            setLeadInput('');
        }
    };

    const handleIngredientChange = (index: number, field: 'simplifiedName' | 'detailedName', value: string) => {
        const newIngs = [...editIngredients];
        newIngs[index] = { ...newIngs[index], [field]: value };
        setEditIngredients(newIngs);
    };

    const handleAddIngredient = () => {
        setEditIngredients([...editIngredients, { simplifiedName: '', detailedName: '' }]);
    };

    const handleRemoveIngredient = (index: number) => {
        setEditIngredients(editIngredients.filter((_, i) => i !== index));
    };

    const handleInstructionChange = (index: number, value: string) => {
        const newInst = [...editInstructions];
        newInst[index] = value;
        setEditInstructions(newInst);
    };

    const handleAddInstruction = () => {
        setEditInstructions([...editInstructions, '']);
    };

    const handleRemoveInstruction = (index: number) => {
        setEditInstructions(editInstructions.filter((_, i) => i !== index));
    };

    // Normalização local para o editor
    const normalizeIngredientsLocal = (ingredients: any[]) => {
        if (!Array.isArray(ingredients)) return [];
        return ingredients.map(ing => {
            if (typeof ing === 'string') {
                return { simplifiedName: ing.split(' ').slice(0, 2).join(' '), detailedName: ing };
            }
            return {
                simplifiedName: String(ing.simplifiedName || ing.name || ''),
                detailedName: String(ing.detailedName || ing.description || ing.name || '')
            };
        });
    };

    // FUNÇÃO "RE-CHEF": Regenera apenas o texto via IA
    const handleRegenerateText = async () => {
        if (!editingRecipe || isRegeneratingText) return;
        const apiKey = process.env.API_KEY as string;
        if (!apiKey) { showToast("Chave IA ausente."); return; }

        setIsRegeneratingText(true);
        showToast("O Chef está reescrevendo a receita...");

        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Gere os dados JSON para a receita: "${editName}". 
            Retorne APENAS o JSON com: ingredients (array {simplifiedName, detailedName}), instructions (array string), servings, prepTimeInMinutes, difficulty, cost, tags (array), suggestedLeads (itens de cozinha para venda). 
            Seja detalhado e gourmet.`;

            const response: GenerateContentResponse = await callGenAIWithRetry(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            }));

            const details = JSON.parse(response.text || "{}");
            
            if (details.ingredients) {
                setEditIngredients(normalizeIngredientsLocal(details.ingredients));
            }
            if (details.instructions) setEditInstructions(details.instructions);
            if (details.tags) setEditTags(prev => Array.from(new Set([...prev, ...details.tags])));
            if (details.suggestedLeads) setEditLeads(prev => Array.from(new Set([...prev, ...details.suggestedLeads])));
            
            showToast("Receita reescrita! Revise e confirme.");
        } catch (error) {
            showToast("Erro ao regenerar texto.");
        } finally {
            setIsRegeneratingText(false);
        }
    };

    const handleSaveRecipe = async () => {
        if (!editingRecipe || isSaving) return;
        setIsSaving(true);

        try {
            // Lógica de Busca Aprimorada: Mescla Título + Tags nas Keywords
            const baseKeywords = generateKeywords(editName);
            const tagKeywords = editTags.flatMap(t => generateKeywords(t));
            const finalKeywords = Array.from(new Set([...baseKeywords, ...tagKeywords]));

            await updateDoc(doc(db!, 'global_recipes', editingRecipe.id), {
                name: editName,
                tags: editTags,
                suggestedLeads: editLeads,
                ingredients: editIngredients,
                instructions: editInstructions,
                keywords: finalKeywords,
                updatedAt: serverTimestamp()
            });
            showToast("Alterações salvas no acervo!");
            handleCloseEdit();
        } catch (error) {
            showToast("Erro ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutoCleanup = async () => {
        const recipesToDelete = recipes.filter(r => !r.imageUrl || !r.ingredients || r.ingredients.length === 0);
        const count = recipesToDelete.length;
        if (count === 0) { showToast("O acervo está íntegro!"); return; }
        if (!window.confirm(`⚠️ LIMPEZA DE DADOS\n\nIsso apagará permanentemente ${count} receitas incompletas.\n\nDeseja continuar?`)) return;
        try {
            const deletePromises = recipesToDelete.map(r => deleteDoc(doc(db!, 'global_recipes', r.id)));
            await Promise.all(deletePromises);
            showToast(`${count} itens removidos.`);
        } catch (error) { showToast("Erro na limpeza."); }
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
                contents: { parts: [{ text: `Foto profissional de: ${editName}. Gastronomia, close-up, luz natural.` }] },
                config: { responseModalities: [Modality.IMAGE] },
            }), 3);
            const part = response.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData) {
                const generatedUrl = `data:image/jpeg;base64,${part.inlineData.data}`;
                await updateDoc(doc(db!, 'global_recipes', editingRecipe.id), { imageUrl: generatedUrl, imageSource: 'genai', updatedAt: serverTimestamp() });
                setEditingRecipe(prev => prev ? {...prev, imageUrl: generatedUrl} : null);
                showToast("Imagem atualizada!");
            }
        } catch (error) { showToast("Erro ao gerar imagem."); } finally { setIsRegeneratingImage(false); }
    };

    const handleDelete = async (recipeId: string, recipeName: string) => {
        if (!window.confirm(`Apagar "${recipeName}" permanentemente?`)) return;
        try { await deleteDoc(doc(db!, 'global_recipes', recipeId)); showToast("Removido."); if (editingRecipe?.id === recipeId) handleCloseEdit(); } catch (error) { showToast("Erro ao deletar."); }
    };

    const processedRecipes = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return recipes.filter(r => r.name.toLowerCase().includes(lowerSearch) || r.tags?.some(tag => tag.toLowerCase().includes(lowerSearch)));
    }, [recipes, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-5xl bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-400">menu_book</span>
                            <h2 className="text-lg font-bold">Gestão de Acervo</h2>
                        </div>
                        <div className="bg-orange-500/20 text-orange-400 px-3 py-0.5 rounded-full border border-orange-500/30 flex items-center gap-1.5">
                             <span className="text-sm font-black font-mono">{totalRecipeCount || recipes.length}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleAutoCleanup} className="text-[10px] bg-red-600 text-white px-3 py-1.5 rounded-lg font-black uppercase hover:bg-red-700 transition-all flex items-center gap-2"><span className="material-symbols-outlined text-sm">cleaning_services</span> Limpeza</button>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
                    </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <input type="text" placeholder="Buscar no acervo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-sm" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-black/20">
                    {isLoading ? <div className="flex flex-col items-center justify-center py-20"><span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span></div> : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {processedRecipes.map((recipe) => (
                                <div key={recipe.id} onClick={() => handleOpenEdit(recipe)} className="bg-white dark:bg-surface-dark rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col group relative cursor-pointer hover:border-primary/50">
                                    <div className="aspect-square bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
                                        {recipe.imageUrl ? <img src={recipe.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="absolute inset-0 flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-4xl">image</span></div>}
                                        {(!recipe.ingredients || recipe.ingredients.length === 0) && <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center backdrop-blur-[2px]"><span className="bg-white text-red-600 text-[10px] font-black px-2 py-1 rounded uppercase">Vazia</span></div>}
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-bold text-[10px] text-gray-800 dark:text-gray-200 line-clamp-2 uppercase">{recipe.name}</h3>
                                        <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">sell</span>{recipe.tags?.length || 0} Tags</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MODAL DE EDIÇÃO AVANÇADA (ACESSO TOTAL) */}
                {editingRecipe && (
                    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-slideUp flex flex-col max-h-[95vh]">
                            
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-black/40">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-black text-gray-800 dark:text-white uppercase italic tracking-tighter">Editor Mestre de Receita</h3>
                                </div>
                                <button onClick={handleCloseEdit} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full"><span className="material-symbols-outlined">close</span></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 scrollbar-hide">
                                
                                {/* COLUNA ESQUERDA: IDENTIDADE & VENDAS */}
                                <div className="space-y-6">
                                    {/* Imagem e Botão Trocar */}
                                    <div className="relative group rounded-[2rem] overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-video border-2 border-dashed border-gray-300 dark:border-gray-700">
                                        {editingRecipe.imageUrl ? <img src={editingRecipe.imageUrl} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-6xl text-gray-300">image</span>}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                            <button onClick={handleRegenerateImage} disabled={isRegeneratingImage} className="px-6 py-2 bg-white text-black rounded-full text-xs font-black uppercase shadow-xl flex items-center gap-2 transition-all active:scale-95">
                                                <span className={`material-symbols-outlined text-sm ${isRegeneratingImage ? 'animate-spin' : ''}`}>photo_camera</span>
                                                Nova Foto IA
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Título da Receita</label>
                                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-2xl h-14 px-4 font-black text-lg text-gray-800 dark:text-white" />
                                    </div>

                                    {/* SEÇÃO DE LEADS (UTENSÍLIOS / VENDAS) */}
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-[2rem] border border-blue-100 dark:border-blue-900/30">
                                        <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">shopping_bag</span>
                                            Match de Inventário (Leads)
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {editLeads.map((lead, idx) => (
                                                <span key={idx} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-sm">
                                                    {lead}
                                                    <button onClick={() => setEditLeads(editLeads.filter(l => l !== lead))} className="opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-sm">close</span></button>
                                                </span>
                                            ))}
                                        </div>
                                        <input type="text" value={leadInput} onChange={(e) => setLeadInput(e.target.value)} onKeyDown={handleAddLead} placeholder="Adicionar utensílio/eletro..." className="w-full bg-white dark:bg-black/20 border-0 rounded-xl h-10 px-4 text-xs font-bold" />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Categorias & Tags</label>
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-[2rem] min-h-[100px]">
                                            {editTags.map((tag, idx) => (
                                                <span key={idx} className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                                    {tag}
                                                    <button onClick={() => setEditTags(editTags.filter(t => t !== tag))}><span className="material-symbols-outlined text-sm">close</span></button>
                                                </span>
                                            ))}
                                            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} placeholder="Nova tag..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold min-w-[80px]" />
                                        </div>
                                    </div>
                                </div>

                                {/* COLUNA DIREITA: COMPOSIÇÃO (UNIFICADO) */}
                                <div className="space-y-6 bg-zinc-50 dark:bg-black/20 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex flex-col h-full">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex flex-col">
                                            <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] italic">Composição do Prato</h4>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">Ingredientes e Modo de Preparo</p>
                                        </div>
                                        <button 
                                            onClick={handleRegenerateText} 
                                            disabled={isRegeneratingText}
                                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase shadow-xl transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <span className={`material-symbols-outlined text-[16px] ${isRegeneratingText ? 'animate-spin' : ''}`}>auto_fix_high</span>
                                            {isRegeneratingText ? 'Chef Escrevendo...' : 'IA: Re-gerar Texto'}
                                        </button>
                                    </div>

                                    {/* Sub-seção: Ingredientes */}
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-sm">grocery</span>
                                                Ingredientes ({editIngredients.length})
                                            </label>
                                            <button onClick={handleAddIngredient} className="text-primary font-black text-[10px] uppercase flex items-center gap-1 hover:underline"><span className="material-symbols-outlined text-sm">add_circle</span> Novo</button>
                                        </div>
                                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
                                            {editIngredients.map((ing, idx) => (
                                                <div key={idx} className="flex gap-2 bg-white dark:bg-zinc-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 animate-fadeIn shadow-sm">
                                                    <input value={ing.simplifiedName} onChange={e => handleIngredientChange(idx, 'simplifiedName', e.target.value)} placeholder="Curto" className="w-1/3 bg-gray-50 dark:bg-black/20 border-0 rounded-lg text-[11px] font-black h-8 px-2" />
                                                    <input value={ing.detailedName} onChange={e => handleIngredientChange(idx, 'detailedName', e.target.value)} placeholder="Detalhes" className="flex-1 bg-gray-50 dark:bg-black/20 border-0 rounded-lg text-[11px] font-medium h-8 px-2" />
                                                    <button onClick={() => handleRemoveIngredient(idx)} className="text-red-500 p-1 hover:scale-110 transition-transform"><span className="material-symbols-outlined text-sm">delete</span></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-200 dark:bg-gray-800 mx-2"></div>

                                    {/* Sub-seção: Modo de Preparo */}
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-sm">cooking</span>
                                                Modo de Preparo ({editInstructions.length})
                                            </label>
                                            <button onClick={handleAddInstruction} className="text-primary font-black text-[10px] uppercase flex items-center gap-1 hover:underline"><span className="material-symbols-outlined text-sm">add_circle</span> Passo</button>
                                        </div>
                                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
                                            {editInstructions.map((inst, idx) => (
                                                <div key={idx} className="flex gap-3 items-start animate-fadeIn group">
                                                    <span className="w-6 h-6 shrink-0 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-sm">{idx + 1}</span>
                                                    <textarea value={inst} onChange={e => handleInstructionChange(idx, e.target.value)} className="flex-1 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs p-3 min-h-[70px] resize-none font-medium shadow-sm focus:ring-1 focus:ring-primary/30" />
                                                    <button onClick={() => handleRemoveInstruction(idx)} className="text-red-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-sm">close</span></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 dark:bg-black/40 border-t border-gray-100 dark:border-gray-800 flex gap-4 shrink-0">
                                <button onClick={handleCloseEdit} className="flex-1 h-14 rounded-2xl bg-gray-200 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-black uppercase text-xs tracking-widest active:scale-95 transition-all">Descartar</button>
                                <button onClick={handleSaveRecipe} disabled={isSaving} className="flex-[2] h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black shadow-xl transition-all active:scale-95 disabled:opacity-50 uppercase text-sm tracking-widest flex items-center justify-center gap-2">
                                    {isSaving ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">save</span>}
                                    {isSaving ? 'Salvando...' : 'Confirmar & Publicar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700 p-3 text-center text-[10px] text-gray-500 flex justify-between px-6 shrink-0 font-bold uppercase tracking-widest">
                    <span>Exibindo: <strong>{processedRecipes.length}</strong></span>
                    <span>Acervo Global: <strong>{totalRecipeCount} / 2000</strong></span>
                </div>
            </div>
        </div>
    );
};
