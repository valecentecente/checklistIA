
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useApp, callGenAIWithRetry } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { FullRecipe } from '../types';

interface FactoryLog {
    text: string;
    type: 'info' | 'error' | 'success' | 'separator' | 'warning' | 'quota' | 'lead';
}

interface CategoryStat {
    name: string;
    count: number | null;
}

export const AdminContentFactoryModal: React.FC = () => {
    const { isContentFactoryModalOpen, closeModal, showToast, generateKeywords } = useApp();
    const { user } = useAuth();
    
    const baseCategories = useMemo(() => [
        "Sazonal / Datas Comemorativas", 
        "Café da Manhã", 
        "Almoço Rápido", 
        "Sobremesas", 
        "Sorvetes",
        "Massas", 
        "Pizzas",
        "Sucos",
        "Fit / Saudável", 
        "Vegano", 
        "Sem Glúten",
        "Drinks", 
        "Bolos", 
        "Carnes", 
        "Lanches", 
        "Brasileira Clássica",
        "Comida Japonesa",
        "Comida Árabe",
        "Hambúrgueres & Sanduíches"
    ], []);

    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [customSazonal, setCustomSazonal] = useState('');
    const [quantity, setQuantity] = useState(10);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<FactoryLog[]>([]);
    const [shouldStop, setShouldStop] = useState(false);
    
    const [categoryStats, setCategoryStats] = useState<CategoryStat[]>(
        baseCategories.map(cat => ({ name: cat, count: null }))
    );
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    
    const logsEndRef = useRef<HTMLDivElement>(null);
    const isGuest = user?.uid?.startsWith('offline-user-');
    const isFirebaseAuthenticated = !!auth?.currentUser;
    const apiKey = process.env.API_KEY as string;

    const fetchCategoryStats = async () => {
        if (!db) return;
        setIsStatsLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'global_recipes'));
            const allRecipes: FullRecipe[] = [];
            querySnapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data) {
                    allRecipes.push(data as FullRecipe);
                }
            });

            const stats = baseCategories.map(cat => {
                const searchLabel = cat.toLowerCase().replace(' / datas comemorativas', '').trim();
                const count = allRecipes.filter(r => {
                    const nameMatch = r.name && typeof r.name === 'string' 
                        ? r.name.toLowerCase().includes(searchLabel) 
                        : false;
                    
                    const tagMatch = Array.isArray(r.tags) 
                        ? r.tags.some(t => typeof t === 'string' && t.toLowerCase().includes(searchLabel)) 
                        : false;
                        
                    return nameMatch || tagMatch;
                }).length;
                return { name: cat, count };
            });

            setCategoryStats(stats.sort((a, b) => (a.count ?? 0) - (b.count ?? 0)));
        } catch (error) {
            console.error("Erro ao calcular estatísticas:", error);
        } finally {
            setIsStatsLoading(false);
        }
    };

    useEffect(() => {
        if (isContentFactoryModalOpen) {
            fetchCategoryStats();
        }
    }, [isContentFactoryModalOpen]);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const addLog = (msg: string, type: 'info' | 'error' | 'success' | 'separator' | 'warning' | 'quota' | 'lead' = 'info') => {
        setLogs(prev => [...prev, { text: msg, type }]);
    };

    const toggleCategory = (name: string) => {
        setSelectedCategories(prev => 
            prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
        );
    };

    const selectCritical = () => {
        const critical = categoryStats.filter(s => s.count !== null && s.count < 10).map(s => s.name);
        if (critical.length === 0) {
            showToast("Nenhuma categoria crítica detectada.");
            return;
        }
        setSelectedCategories(critical);
    };

    const compressImage = (base64Str: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; 
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

    const normalizeIngredients = (raw: any[]) => {
        if (!Array.isArray(raw)) return [];
        return raw.map(ing => {
            if (typeof ing === 'string') {
                return { simplifiedName: ing.split(',')[0].split('(')[0].trim(), detailedName: ing };
            }
            if (typeof ing === 'object' && ing !== null) {
                return {
                    simplifiedName: String(ing.simplifiedName || ing.name || 'Ingrediente'),
                    detailedName: String(ing.detailedName || ing.description || ing.simplifiedName || 'Item detalhado')
                };
            }
            return { simplifiedName: 'Ingrediente', detailedName: 'Item processado' };
        });
    };

    const createLeads = async (recipeName: string, suggestedLeads: string[]) => {
        if (!db || !suggestedLeads || suggestedLeads.length === 0) return;
        
        const offersSnap = await getDocs(collection(db, 'offers'));
        const inventoryItems: string[] = [];
        
        offersSnap.forEach(oDoc => {
            const o = oDoc.data();
            if (o.name) inventoryItems.push(o.name.toLowerCase().trim());
            if (o.tags && Array.isArray(o.tags)) {
                o.tags.forEach((t: string) => inventoryItems.push(t.toLowerCase().trim()));
            }
        });

        const cleanRecipePart = recipeName.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '');

        for (const term of suggestedLeads) {
            try {
                const termLower = term.toLowerCase().trim();
                
                const alreadyHasInStock = inventoryItems.some(item => 
                    item.includes(termLower) || termLower.includes(item)
                );

                if (alreadyHasInStock) {
                    addLog(`[ESTOQUE] Pulando: "${term}"`, 'info');
                    continue;
                }

                const cleanTermPart = termLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                // ID ULTRA-SIMPLIFICADO E CURTO PARA EVITAR ERROS
                const leadId = `LEAD-${cleanRecipePart.slice(0,12)}-${cleanTermPart.slice(0,15)}`;
                
                const leadRef = doc(db, 'sales_opportunities', leadId);
                
                await setDoc(leadRef, {
                    term: termLower,
                    recipeName: recipeName,
                    status: 'pending',
                    createdAt: serverTimestamp()
                }, { merge: true });
                
                addLog(`[IA LEAD] Gravado: ${term}`, 'lead');
            } catch (e) {
                console.warn("Erro ao gravar lead:", e);
            }
        }
    };

    const handleRetroactiveScan = async () => {
        if (!apiKey || !db) return;
        setIsScanning(true);
        setShouldStop(false);
        setLogs([]);
        setProgress(0);
        addLog("--- INICIANDO SCANNER DE OPORTUNIDADES ---", 'separator');

        try {
            const querySnapshot = await getDocs(collection(db, 'global_recipes'));
            const allRecipes: any[] = [];
            querySnapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.name) {
                    allRecipes.push({ id: docSnap.id, ...data });
                }
            });

            if (allRecipes.length === 0) {
                addLog("Nenhuma receita encontrada.", 'warning');
                setIsScanning(false);
                return;
            }

            addLog(`Analisando acervo de ${allRecipes.length} receitas...`, 'info');
            const ai = new GoogleGenAI({ apiKey });

            let processed = 0;
            for (const recipe of allRecipes) {
                if (shouldStop) break;
                addLog(`Analisando prato: ${recipe.name}`, 'info');

                const scanPrompt = `Analise a receita '${recipe.name}'. 
                Quais equipamentos, acessórios de cozinha ou eletros são necessários? 
                Ex: batedeira, airfryer, forma de bolo, espátula, liquidificador.
                Retorne APENAS um JSON com array 'suggestedLeads'. 
                Formato: { "suggestedLeads": ["item1", "item2"] }`;

                try {
                    const res = await callGenAIWithRetry(() => ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: scanPrompt,
                        config: { responseMimeType: "application/json" }
                    }));

                    const data = JSON.parse(res.text || "{}");
                    const leads = data.suggestedLeads || [];

                    if (leads.length > 0) {
                        await updateDoc(doc(db, 'global_recipes', recipe.id), { suggestedLeads: leads });
                        await createLeads(recipe.name, leads);
                        addLog(`> ${recipe.name}: ${leads.length} itens mapeados.`, 'success');
                    } else {
                        addLog(`> ${recipe.name}: Nenhum utensílio novo.`, 'info');
                    }
                    
                    processed++;
                    setProgress((processed / allRecipes.length) * 100);
                    await new Promise(r => setTimeout(r, 2000));
                } catch (err) {
                    addLog(`Erro ao analisar: ${recipe.name}`, 'error');
                }
            }

            addLog("--- SCANNER FINALIZADO ---", 'separator');
            showToast("IA Leads Atualizado!");
        } finally {
            setIsScanning(false);
        }
    };

    const handleStart = async () => {
        if (!apiKey) { showToast("API Key ausente."); return; }
        if (isGuest || !isFirebaseAuthenticated) { showToast("Login real necessário."); return; }
        if (selectedCategories.length === 0) { showToast("Selecione categorias."); return; }

        setIsGenerating(true);
        setShouldStop(false);
        setLogs([]);
        setProgress(0);

        addLog("--- INICIANDO PRODUÇÃO EM MASSA ---", 'separator');

        try {
            const ai = new GoogleGenAI({ apiKey });
            
            for (const currentCat of selectedCategories) {
                if (shouldStop) break;
                addLog(`CATEGORIA: ${currentCat}`, 'separator');
                
                const listPrompt = `Gere uma lista JSON com 100 nomes das receitas mais populares da categoria '${currentCat}'. Retorne apenas o JSON array de strings.`;

                try {
                    const listResponse = await callGenAIWithRetry(() => ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: listPrompt,
                        config: { responseMimeType: "application/json" }
                    }));

                    const recipeNames: string[] = JSON.parse(listResponse.text || "[]");
                    let successCount = 0;
                    let attemptCount = 0;

                    while (successCount < quantity && attemptCount < recipeNames.length) {
                        if (shouldStop) break;
                        
                        const name = recipeNames[attemptCount];
                        attemptCount++;
                        
                        const docId = name.trim().toLowerCase()
                            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
                            .replace(/[\/\s]+/g, '-') 
                            .replace(/[^a-z0-9-]/g, '') 
                            .slice(0, 80);
                        
                        try {
                            const checkSnap = await getDoc(doc(db!, 'global_recipes', docId));
                            if (checkSnap.exists()) {
                                addLog(`> Pulo: "${name}" já existe.`, 'warning');
                                continue;
                            }
                        } catch (checkErr) {}

                        addLog(`${successCount + 1}/${quantity} - Produzindo: ${name}`, 'info');
                        
                        try {
                            const detailPrompt = `Gere a receita completa para '${name}' em JSON.
                            O campo 'ingredients' deve ser um array de objetos {simplifiedName, detailedName}.
                            No campo 'suggestedLeads', liste utensílios e equipamentos.
                            Formato: { 'name': '${name}', 'ingredients': [], 'instructions': [], 'prepTimeInMinutes': 30, 'difficulty': 'Fácil', 'cost': 'Médio', 'tags': [], 'suggestedLeads': [] }`;

                            const detailRes = await callGenAIWithRetry(() => ai.models.generateContent({
                                model: 'gemini-3-flash-preview',
                                contents: detailPrompt,
                                config: { responseMimeType: "application/json" }
                            }));

                            const recipeData = JSON.parse(detailRes.text || "{}");
                            
                            const imageRes: any = await callGenAIWithRetry(() => ai.models.generateContent({
                                model: 'gemini-2.5-flash-image',
                                contents: { parts: [{ text: "Foto gourmet realística de " + name }] },
                                config: { responseModalities: [Modality.IMAGE] }
                            }));

                            let imageUrl = null;
                            if (imageRes.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
                                imageUrl = await compressImage("data:image/jpeg;base64," + imageRes.candidates[0].content.parts[0].inlineData.data);
                            }

                            if (db) {
                                const finalRecipe = {
                                    ...recipeData,
                                    ingredients: normalizeIngredients(recipeData.ingredients),
                                    imageUrl,
                                    imageSource: 'genai',
                                    keywords: generateKeywords(name),
                                    createdAt: serverTimestamp()
                                };

                                await setDoc(doc(db, 'global_recipes', docId), finalRecipe, { merge: true });
                                
                                if (recipeData.suggestedLeads && recipeData.suggestedLeads.length > 0) {
                                    await createLeads(name, recipeData.suggestedLeads);
                                }
                                
                                successCount++; 
                                addLog(`> SUCESSO: ${name}`, 'success');
                                setProgress(((selectedCategories.indexOf(currentCat) * quantity + successCount) / (selectedCategories.length * quantity)) * 100);
                            }
                            
                            await new Promise(r => setTimeout(r, 12000));
                        } catch (err) {
                            addLog(`> ERRO no item: ${name}`, 'error');
                        }
                    }
                } catch (catErr) {
                    addLog(`Erro crítico na categoria ${currentCat}`, 'error');
                }
            }
            addLog("--- OPERAÇÃO FINALIZADA ---", 'separator');
            fetchCategoryStats(); 
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isContentFactoryModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] bg-black/90 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('contentFactory')}>
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center shrink-0">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-400">factory</span>
                        Fábrica de Inventário
                    </h2>
                    <button onClick={() => closeModal('contentFactory')} className="text-gray-400 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="p-4 bg-slate-800/50 flex flex-col gap-4 border-b border-slate-700 shrink-0">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                            <label className="text-xs text-gray-400 uppercase font-black">Categorias ({selectedCategories.length})</label>
                            <div className="flex gap-2">
                                <button onClick={handleRetroactiveScan} disabled={isGenerating || isScanning} className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded font-bold uppercase hover:bg-blue-500/30 flex items-center gap-1 transition-all">
                                    <span className="material-symbols-outlined text-[12px]">search_check</span>
                                    Scanner de Leads (Acervo)
                                </button>
                                <button onClick={selectCritical} disabled={isGenerating || isScanning || isStatsLoading} className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded font-bold uppercase hover:bg-orange-500/30">Auto-Selecionar Críticos</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-900/50 p-3 rounded-xl border border-slate-700 max-h-40 overflow-y-auto">
                            {categoryStats.map(stat => (
                                <label key={stat.name} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${selectedCategories.includes(stat.name) ? 'bg-green-50/10 border-green-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                                    <input type="checkbox" checked={selectedCategories.includes(stat.name)} onChange={() => toggleCategory(stat.name)} disabled={isGenerating || isScanning} className="rounded border-slate-600 text-green-500" />
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-xs font-bold text-gray-300">{stat.name}</span>
                                        <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-400/10 px-1.5 rounded">
                                            {stat.count === null ? '...' : stat.count}
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-gray-500 uppercase font-bold ml-1">Meta de Novos Pratos</span>
                            <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} disabled={isGenerating || isScanning} min={1} max={50} className="w-full bg-slate-700 text-white rounded-lg h-10 px-3" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-gray-500 uppercase font-bold ml-1">Tema Sazonal Ativo</span>
                            <input type="text" value={customSazonal} onChange={e => setCustomSazonal(e.target.value)} disabled={isGenerating || isScanning} placeholder="Ex: Natal" className="w-full bg-slate-700/50 text-white rounded-lg h-10 px-3" />
                        </div>
                    </div>
                    <button onClick={isGenerating ? () => setShouldStop(true) : handleStart} disabled={isScanning} className={`h-12 w-full rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 transition-all active:scale-95 ${isGenerating ? 'bg-red-600' : 'bg-green-600 hover:bg-green-500 disabled:opacity-50'}`}>
                        <span className="material-symbols-outlined">{isGenerating ? 'stop' : 'bolt'}</span>
                        {isGenerating ? 'Parar Produção' : 'Iniciar Abastecimento'}
                    </button>
                </div>
                <div className="h-1.5 bg-slate-700 w-full shrink-0">
                    <div className={`h-full transition-all duration-300 ${isScanning ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: progress + "%" }}></div>
                </div>
                <div className="flex-1 bg-black p-4 overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-hide">
                    {logs.length === 0 && <p className="text-gray-600 italic">Aguardando comando...</p>}
                    {logs.map((log, i) => (
                        <p key={i} className={`break-words ${
                            log.type === 'error' ? 'text-red-500' : 
                            log.type === 'success' ? 'text-green-400' : 
                            log.type === 'warning' ? 'text-yellow-500' : 
                            log.type === 'quota' ? 'text-orange-400 font-bold bg-orange-400/5 p-1 rounded' : 
                            log.type === 'lead' ? 'text-blue-300 font-bold bg-blue-500/5 p-1 rounded italic' :
                            log.type === 'separator' ? 'text-blue-400 pt-2 border-t border-slate-800' : 'text-gray-400'}`}>
                            {log.text}
                        </p>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};
