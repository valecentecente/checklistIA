
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useApp, callGenAIWithRetry } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { FullRecipe } from '../types';

interface FactoryLog {
    text: string;
    type: 'info' | 'error' | 'success' | 'separator' | 'warning';
}

export const AdminContentFactoryModal: React.FC = () => {
    const { isContentFactoryModalOpen, closeModal, showToast, generateKeywords } = useApp();
    const { user } = useAuth();
    const [category, setCategory] = useState('Sobremesas');
    const [customSazonal, setCustomSazonal] = useState('');
    const [quantity, setQuantity] = useState(10);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<FactoryLog[]>([]);
    const [shouldStop, setShouldStop] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const isGuest = user?.uid?.startsWith('offline-user-');
    const isFirebaseAuthenticated = !!auth?.currentUser;

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

    const categoriesOptions = ["--- TODAS AS CATEGORIAS ---", ...baseCategories];
    const apiKey = process.env.API_KEY as string;

    // --- LÓGICA DE LEMBRETE DE CALENDÁRIO ---
    const upcomingHoliday = useMemo(() => {
        const now = new Date();
        const month = now.getMonth(); // 0-11
        const day = now.getDate();

        // Verificamos com antecedência de ~30 dias
        if (month === 1 || (month === 2 && day < 15)) return "Páscoa";
        if (month === 4 || (month === 5 && day < 12)) return "Festa Junina";
        if (month === 7 || (month === 8 && day < 20)) return "Semana do Gaúcho / Primavera";
        if (month === 9 || (month === 10 && day < 15)) return "Natal & Ceias";
        if (month === 11) return "Ano Novo / Verão";
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
        if (!apiKey) {
            showToast("Erro: API Key não encontrada.");
            return;
        }

        if (isGuest || !isFirebaseAuthenticated) {
            showToast("Erro: Faça login real para usar a fábrica.");
            return;
        }

        setIsGenerating(true);
        setShouldStop(false);
        setLogs([]);
        setProgress(0);

        const categoriesToProcess = category === "--- TODAS AS CATEGORIAS ---" ? baseCategories.filter(c => c !== "Sazonal / Datas Comemorativas") : [category];
        addLog(`--- INICIANDO FÁBRICA INTELIGENTE ---`, 'separator');

        try {
            const ai = new GoogleGenAI({ apiKey });
            
            for (const currentCat of categoriesToProcess) {
                if (shouldStop) break;
                
                // Determina o tema sazonal se aplicável
                let holidayTheme = "";
                if (currentCat === "Sazonal / Datas Comemorativas") {
                    holidayTheme = customSazonal || upcomingHoliday || "Próximo Feriado Brasileiro";
                }

                addLog(`CATEGORIA: [${currentCat}] ${holidayTheme ? `| TEMA: ${holidayTheme}` : ''}`, 'separator');
                
                // 1. Busca nomes potenciais
                const listPrompt = `Gere uma lista JSON com ${quantity * 2} nomes das receitas mais populares da categoria "${currentCat}" no Brasil. 
                ${holidayTheme ? `FOCO TOTAL NO TEMA: "${holidayTheme}".` : ''}
                Retorne apenas o JSON array de strings.`;

                const listResponse = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: listPrompt,
                    config: { responseMimeType: "application/json" }
                }));

                const recipeNames: string[] = JSON.parse(listResponse.text || "[]");
                addLog(`Analisando banco de dados para evitar duplicatas...`, 'info');

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
                            addLog(`> Ignorado: "${name}" já existe.`, 'warning');
                            continue;
                        }
                    }
                    
                    addLog(`> [${successCount + 1}/${quantity}] Gerando: ${name} ${holidayTheme ? `(${holidayTheme})` : ''}...`, 'info');
                    
                    try {
                        const detailPrompt = `Gere a receita completa para "${name}" em JSON. 
                        ${holidayTheme ? `Certifique-se que a receita combine com o tema "${holidayTheme}".` : ''}
                        Inclua 4 tags específicas (Ex: Fit, Almoço, ${holidayTheme || 'Geral'}). 
                        Formato: { "name": "${name}", "ingredients": [{"simplifiedName": "x", "detailedName": "y"}], "instructions": [], "imageQuery": "v", "prepTimeInMinutes": 30, "difficulty": "Fácil", "cost": "Médio", "isAlcoholic": false, "tags": ["tag1"] }`;

                        const detailRes = await callGenAIWithRetry(() => ai.models.generateContent({
                            model: 'gemini-3-flash-preview',
                            contents: detailPrompt,
                            config: { responseMimeType: "application/json" }
                        }));

                        const recipeData = JSON.parse(detailRes.text || "{}");
                        
                        const imageRes: any = await callGenAIWithRetry(() => ai.models.generateContent({
                            model: 'gemini-2.5-flash-image',
                            contents: { parts: [{ text: `Foto profissional de alta gastronomia, close-up, luz natural, tema ${holidayTheme || 'comida'}: ${recipeData.imageQuery || name}` }] },
                            config: { responseModalities: [Modality.IMAGE] }
                        }));

                        let imageUrl = null;
                        if (imageRes.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
                            const rawBase64 = imageRes.candidates[0].content.parts[0].inlineData.data;
                            imageUrl = await compressImage(`data:image/jpeg;base64,${rawBase64}`);
                        }

                        const finalTags = Array.from(new Set([
                            ...(recipeData.tags || []), 
                            currentCat.toLowerCase().replace(' / datas comemorativas', ''),
                            ...(holidayTheme ? [holidayTheme.toLowerCase()] : []),
                            'factory_v2'
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
                            addLog(`> SUCESSO: ${name} adicionado.`, 'success');
                            
                            const totalToProcess = categoriesToProcess.length * quantity;
                            const currentOverallSuccess = (categoriesToProcess.indexOf(currentCat) * quantity) + successCount;
                            setProgress((currentOverallSuccess / totalToProcess) * 100);
                        }

                        if (successCount < quantity) await new Promise(r => setTimeout(r, 8000));

                    } catch (err: any) {
                        addLog(`> Falha em ${name}: ${err.message}`, 'error');
                        if (err.message.includes('403')) { setShouldStop(true); break; }
                    }
                }
                
                if (successCount < quantity && !shouldStop) {
                    addLog(`Alerta: Categoria [${currentCat}] finalizada com ${successCount}/${quantity}.`, 'warning');
                }

                if (categoriesToProcess.indexOf(currentCat) < categoriesToProcess.length - 1 && !shouldStop) {
                    addLog("Trocando categoria. Cool-down (15s)...", "warning");
                    await new Promise(r => setTimeout(r, 15000));
                }
            }

            addLog(`--- OPERAÇÃO FINALIZADA ---`, 'separator');

        } catch (error: any) {
            addLog(`ERRO FATAL: ${error.message}`, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isContentFactoryModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] bg-black/90 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('contentFactory')}>
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>
                
                <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
                    <div className="flex flex-col">
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-400">factory</span>
                            Fábrica de Conteúdo
                        </h2>
                        <span className="text-[10px] text-gray-500 uppercase font-black">Versão Contextual 2025</span>
                    </div>
                    <button onClick={() => closeModal('contentFactory')} className="text-gray-400 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* --- MENSAGEM DE LEMBRETE DA IA --- */}
                {upcomingHoliday && (
                    <div className="mx-4 mt-4 bg-blue-900/40 border border-blue-500/30 rounded-xl p-3 flex items-center gap-4 animate-fadeIn">
                        <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0 shadow-lg">
                            <span className="material-symbols-outlined text-white">event_upcoming</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Dica de Planejamento</p>
                            <p className="text-xs text-white/90">A IA identificou que o <strong>{upcomingHoliday}</strong> está próximo. Que tal abastecer essa categoria hoje?</p>
                        </div>
                    </div>
                )}

                <div className="p-4 bg-slate-800/50 flex flex-col gap-4 border-b border-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Categoria</label>
                            <select 
                                value={category} 
                                onChange={e => setCategory(e.target.value)}
                                disabled={isGenerating}
                                className="w-full bg-slate-700 text-white border-slate-600 rounded-lg h-10 px-3 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                            >
                                {categoriesOptions.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Meta de Inéditos</label>
                            <input 
                                type="number" 
                                value={quantity} 
                                onChange={e => setQuantity(parseInt(e.target.value))}
                                disabled={isGenerating}
                                min={1} max={50}
                                className="w-full bg-slate-700 text-white border-slate-600 rounded-lg h-10 px-3 focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* CAMPO SAZONAL MANUAL */}
                    {(category === "Sazonal / Datas Comemorativas" || category === "--- TODAS AS CATEGORIAS ---") && (
                        <div className="animate-fadeIn">
                            <label className="text-xs text-blue-400 uppercase font-bold block mb-1">Definir Tema da Data (Manual)</label>
                            <input 
                                type="text"
                                value={customSazonal}
                                onChange={e => setCustomSazonal(e.target.value)}
                                disabled={isGenerating}
                                placeholder={upcomingHoliday ? `Ex: ${upcomingHoliday}, Inverno...` : "Ex: Natal, Festa Junina, Pascoa..."}
                                className="w-full bg-slate-700/50 text-white border-blue-500/30 rounded-lg h-10 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-600"
                            />
                        </div>
                    )}

                    <button 
                        onClick={isGenerating ? () => setShouldStop(true) : handleStart}
                        className={`h-12 w-full rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl ${isGenerating ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'} ${isGuest ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                        <span className="material-symbols-outlined">{isGenerating ? 'stop' : 'bolt'}</span>
                        {isGenerating ? 'Parar Produção' : 'Iniciar Abastecimento'}
                    </button>
                </div>

                <div className="h-1.5 bg-slate-700 w-full">
                    <div className="h-full bg-green-500 transition-all duration-300 shadow-[0_0_10px_#22c55e]" style={{ width: `${progress}%` }}></div>
                </div>

                <div className="flex-1 bg-black p-4 overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-hide">
                    {logs.map((log, i) => (
                        <p key={i} className={`break-words ${
                            log.type === 'error' ? 'text-red-500 font-bold bg-red-500/10 p-1 rounded' : 
                            log.type === 'success' ? 'text-green-400' : 
                            log.type === 'warning' ? 'text-yellow-500 italic' : 
                            log.type === 'separator' ? 'text-blue-400 pt-3 border-t border-slate-800 font-black' : 
                            'text-gray-400'
                        }`}>
                            {log.text}
                        </p>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};
