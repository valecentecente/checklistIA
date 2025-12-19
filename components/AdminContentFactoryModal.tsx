
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useApp, callGenAIWithRetry } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { FullRecipe } from '../types';

interface FactoryLog {
    text: string;
    type: 'info' | 'error' | 'success' | 'separator' | 'warning';
}

interface CategoryStat {
    name: string;
    count: number;
}

export const AdminContentFactoryModal: React.FC = () => {
    const { isContentFactoryModalOpen, closeModal, showToast, generateKeywords } = useApp();
    const { user } = useAuth();
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [customSazonal, setCustomSazonal] = useState('');
    const [quantity, setQuantity] = useState(10);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<FactoryLog[]>([]);
    const [shouldStop, setShouldStop] = useState(false);
    const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    
    const logsEndRef = useRef<HTMLDivElement>(null);

    const isGuest = user?.uid?.startsWith('offline-user-');
    const isFirebaseAuthenticated = !!auth?.currentUser;
    const apiKey = process.env.API_KEY as string;

    const baseCategories = [
        "Sazonal / Datas Comemorativas", 
        "Café da Manhã", 
        "Almoço Rápido", 
        "Sobremesas", 
        "Massas", 
        "Sucos",
        "Fit / Saudável", 
        "Vegano", 
        "Drinks", 
        "Bolos", 
        "Carnes", 
        "Lanches", 
        "Brasileira Clássica"
    ];

    const fetchCategoryStats = async () => {
        if (!db) return;
        setIsStatsLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'global_recipes'));
            const allRecipes: FullRecipe[] = [];
            querySnapshot.forEach(doc => allRecipes.push(doc.data() as FullRecipe));

            const stats = baseCategories.map(cat => {
                const searchLabel = cat.toLowerCase().replace(' / datas comemorativas', '');
                const count = allRecipes.filter(r => {
                    const hasTag = r.tags?.some(t => t.toLowerCase().includes(searchLabel));
                    const hasName = r.name.toLowerCase().includes(searchLabel);
                    return hasTag || hasName;
                }).length;
                return { name: cat, count };
            });

            const sortedStats = stats.sort((a, b) => a.count - b.count);
            setCategoryStats(sortedStats);
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

    const upcomingHoliday = useMemo(() => {
        const now = new Date();
        const month = now.getMonth(); 
        const day = now.getDate();
        if (month === 1 || (month === 2 && day < 15)) return "Páscoa";
        if (month === 4 || (month === 5 && day < 12)) return "Festa Junina";
        if (month === 7 || (month === 8 && day < 20)) return "Semana do Gaúcho";
        if (month === 9 || (month === 10 && day < 15)) return "Natal";
        if (month === 11) return "Ano Novo";
        return null;
    }, []);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const addLog = (msg: string, type: 'info' | 'error' | 'success' | 'separator' | 'warning' = 'info') => {
        setLogs(prev => [...prev, { text: msg, type }]);
    };

    const toggleCategory = (name: string) => {
        setSelectedCategories(prev => 
            prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
        );
    };

    const selectCritical = () => {
        const critical = categoryStats.filter(s => s.count < 10).map(s => s.name);
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

    const handleStart = async () => {
        if (!apiKey) { showToast("API Key ausente."); return; }
        if (isGuest || !isFirebaseAuthenticated) { showToast("Login real necessário."); return; }
        if (selectedCategories.length === 0) { showToast("Selecione categorias."); return; }

        setIsGenerating(true);
        setShouldStop(false);
        setLogs([]);
        setProgress(0);

        addLog("--- INICIANDO PRODUÇÃO EM LOTE ---", 'separator');

        try {
            const ai = new GoogleGenAI({ apiKey });
            
            for (const currentCat of selectedCategories) {
                if (shouldStop) break;
                
                let holidayTheme = "";
                if (currentCat === "Sazonal / Datas Comemorativas") {
                    holidayTheme = customSazonal || upcomingHoliday || "Próximo Feriado";
                }

                addLog("PROCESSANDO: " + currentCat, 'separator');
                
                const listPrompt = "Gere uma lista JSON com " + (quantity * 2) + " nomes das receitas mais populares da categoria '" + currentCat + "' no Brasil. " + (holidayTheme ? "Foco total no tema: " + holidayTheme : "") + ". Retorne apenas o JSON array de strings.";

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
                    const docId = name.trim().toLowerCase().replace(/[\/\s]+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80);
                    
                    if (db) {
                        const docRef = doc(db, 'global_recipes', docId);
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists()) {
                            addLog("> Ignorado: " + name + " (já existe)", 'warning');
                            continue;
                        }
                    }
                    
                    addLog("> Gerando [" + (successCount + 1) + "/" + quantity + "]: " + name, 'info');
                    
                    try {
                        const detailPrompt = "Gere a receita completa para '" + name + "' em JSON. Formato: { 'name': '" + name + "', 'ingredients': [{'simplifiedName': 'x', 'detailedName': 'y'}], 'instructions': [], 'imageQuery': 'v', 'prepTimeInMinutes': 30, 'difficulty': 'Fácil', 'cost': 'Médio', 'isAlcoholic': false, 'tags': ['tag1'] }";

                        const detailRes = await callGenAIWithRetry(() => ai.models.generateContent({
                            model: 'gemini-3-flash-preview',
                            contents: detailPrompt,
                            config: { responseMimeType: "application/json" }
                        }));

                        const recipeData = JSON.parse(detailRes.text || "{}");
                        const imageRes: any = await callGenAIWithRetry(() => ai.models.generateContent({
                            model: 'gemini-2.5-flash-image',
                            contents: { parts: [{ text: "Foto profissional de alta gastronomia: " + (recipeData.imageQuery || name) }] },
                            config: { responseModalities: [Modality.IMAGE] }
                        }));

                        let imageUrl = null;
                        if (imageRes.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
                            const rawBase64 = imageRes.candidates[0].content.parts[0].inlineData.data;
                            imageUrl = await compressImage("data:image/jpeg;base64," + rawBase64);
                        }

                        const finalTags = Array.from(new Set([
                            ...(recipeData.tags || []), 
                            currentCat.toLowerCase().replace(' / datas comemorativas', ''),
                            ...(holidayTheme ? [holidayTheme.toLowerCase()] : []),
                            'factory_v3'
                        ]));

                        if (db) {
                            await setDoc(doc(db, 'global_recipes', docId), {
                                ...recipeData,
                                imageUrl,
                                imageSource: 'genai',
                                keywords: generateKeywords(name),
                                tags: finalTags,
                                createdAt: serverTimestamp()
                            }, { merge: true });
                            
                            successCount++;
                            addLog("> SUCESSO: " + name, 'success');
                            const totalToProcess = selectedCategories.length * quantity;
                            const currentOverallIndex = selectedCategories.indexOf(currentCat);
                            setProgress(((currentOverallIndex * quantity + successCount) / totalToProcess) * 100);
                        }
                        if (successCount < quantity) await new Promise(r => setTimeout(r, 8000));
                    } catch (err: any) {
                        addLog("> Falha: " + name, 'error');
                        if (err.message.includes('403')) { setShouldStop(true); break; }
                    }
                }
            }
            addLog("--- OPERAÇÃO FINALIZADA ---", 'separator');
            fetchCategoryStats(); 
        } catch (error: any) {
            addLog("ERRO FATAL", 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isContentFactoryModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] bg-black/90 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('contentFactory')}>
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex flex-col">
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-400">factory</span>
                            Fábrica de Inventário
                        </h2>
                    </div>
                    <button onClick={() => closeModal('contentFactory')} className="text-gray-400 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="p-4 bg-slate-800/50 flex flex-col gap-4 border-b border-slate-700 shrink-0">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                            <label className="text-xs text-gray-400 uppercase font-black">Categorias ({selectedCategories.length})</label>
                            <button onClick={selectCritical} disabled={isGenerating} className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded font-bold uppercase hover:bg-orange-500/30">Selecionar Críticos</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-900/50 p-3 rounded-xl border border-slate-700 max-h-40 overflow-y-auto">
                            {categoryStats.map(stat => (
                                <label key={stat.name} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${selectedCategories.includes(stat.name) ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                                    <input type="checkbox" checked={selectedCategories.includes(stat.name)} onChange={() => toggleCategory(stat.name)} disabled={isGenerating} className="rounded border-slate-600 text-green-500" />
                                    <div className="flex justify-between items-center w-full">
                                        <span className={`text-xs font-bold ${stat.count < 6 ? 'text-orange-400' : 'text-gray-300'}`}>{stat.count < 6 ? '⚠️ ' : ''}{stat.name}</span>
                                        <span className="text-[10px] font-mono text-gray-500">{stat.count}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} disabled={isGenerating} min={1} max={50} className="w-full bg-slate-700 text-white rounded-lg h-10 px-3" />
                        {selectedCategories.includes("Sazonal / Datas Comemorativas") && (
                            <input type="text" value={customSazonal} onChange={e => setCustomSazonal(e.target.value)} disabled={isGenerating} placeholder="Tema..." className="w-full bg-slate-700/50 text-white rounded-lg h-10 px-3" />
                        )}
                    </div>
                    <button onClick={isGenerating ? () => setShouldStop(true) : handleStart} className={`h-12 w-full rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 ${isGenerating ? 'bg-red-600' : 'bg-green-600'}`}>
                        <span className="material-symbols-outlined">{isGenerating ? 'stop' : 'bolt'}</span>
                        {isGenerating ? 'Parar' : 'Abastecer (' + selectedCategories.length + ')'}
                    </button>
                </div>
                <div className="h-1.5 bg-slate-700 w-full shrink-0">
                    <div className="h-full bg-green-500 transition-all duration-300" style={{ width: progress + "%" }}></div>
                </div>
                <div className="flex-1 bg-black p-4 overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-hide">
                    {logs.map((log, i) => (
                        <p key={i} className={`break-words ${log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-400' : log.type === 'warning' ? 'text-yellow-500' : log.type === 'separator' ? 'text-blue-400 pt-2 border-t border-slate-800' : 'text-gray-400'}`}>
                            {log.text}
                        </p>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};
