
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

interface PreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const preferencesOptions = [
    { id: 'vegan', label: 'Vegano', icon: 'emoji_nature', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', description: 'Sem produtos de origem animal.' },
    { id: 'vegetarian', label: 'Vegetariano', icon: 'spa', color: 'bg-green-50 text-green-500 dark:bg-green-900/20 dark:text-green-300', description: 'Sem carne, mas inclui ovos e laticínios.' },
    { id: 'fitness', label: 'Fit / Saudável', icon: 'fitness_center', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', description: 'Foco em proteínas e baixa caloria.' },
    { id: 'quick', label: 'Rápido', icon: 'timer', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', description: 'Receitas prontas em até 20 minutos.' },
    { id: 'lowcarb', label: 'Low Carb', icon: 'no_meals', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', description: 'Baixo consumo de carboidratos.' },
    { id: 'lactose_free', label: 'Sem Lactose', icon: 'water_drop', color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400', description: 'Sem leite e derivados.' },
    { id: 'gluten_free', label: 'Sem Glúten', icon: 'grain', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', description: 'Sem trigo, centeio ou cevada.' },
    { id: 'sweets', label: 'Doces', icon: 'cake', color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400', description: 'Sobremesas e confeitaria.' },
    { id: 'non_alcoholic', label: 'Bebidas (Sucos)', icon: 'local_cafe', color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400', description: 'Sucos, smoothies, vitaminas e cafés.' },
    { id: 'alcohol', label: 'Drinks (+18)', icon: 'local_bar', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', description: 'Coquetéis e bebidas alcoólicas.' },
];

export const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose }) => {
    const { user, updateDietaryPreferences } = useAuth();
    const { showToast } = useApp();
    const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
    const [activeInfo, setActiveInfo] = useState<typeof preferencesOptions[0] | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && user?.dietaryPreferences) {
            setSelectedPreferences(user.dietaryPreferences);
        } else if (isOpen) {
            setSelectedPreferences([]);
        }
    }, [isOpen, user]);

    // Calcula se é menor de 18 anos
    const isUnderage = useMemo(() => {
        if (!user?.birthDate) return false; // Se não tiver data, assume que pode ser maior (ou poderia bloquear por segurança)
        const birth = new Date(user.birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age < 18;
    }, [user?.birthDate]);

    const togglePreference = (id: string) => {
        if (id === 'alcohol' && isUnderage) {
            showToast("Esta opção é restrita para maiores de 18 anos.");
            return;
        }
        setSelectedPreferences(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        if (selectedPreferences.length === 0) {
            localStorage.setItem('preferences_dismissed', 'true');
            showToast("Combinado! Mostraremos de tudo um pouco.");
            onClose();
            return;
        }

        setIsSaving(true);
        try {
            await updateDietaryPreferences(selectedPreferences);
            localStorage.setItem('preferences_dismissed', 'true');
            showToast("Preferências salvas! O app foi personalizado para você.");
            onClose();
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar preferências.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* --- MODAL PRINCIPAL (CAMADA 1) --- */}
            <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                <div className="relative w-full max-w-sm bg-background-light dark:bg-surface-dark rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
                    
                    {/* Header Visual */}
                    <div className="p-6 bg-gradient-to-br from-primary to-orange-600 text-center relative overflow-hidden shrink-0">
                        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/food.png')]"></div>
                        <span className="material-symbols-outlined text-5xl text-white mb-2 relative z-10 animate-bounce">auto_awesome</span>
                        <h2 className="text-2xl font-bold text-white relative z-10">O que você curte?</h2>
                        <p className="text-white/90 text-sm mt-1 relative z-10">Ajude nossa IA a sugerir receitas perfeitas para o seu estilo.</p>
                    </div>

                    <div className="p-6 overflow-y-auto relative">
                        <div className="grid grid-cols-2 gap-3">
                            {preferencesOptions.map(option => {
                                const isSelected = selectedPreferences.includes(option.id);
                                const isLocked = option.id === 'alcohol' && isUnderage;

                                return (
                                    <div key={option.id} className="relative group">
                                        <button
                                            onClick={() => togglePreference(option.id)}
                                            disabled={isLocked}
                                            className={`w-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                                                isLocked
                                                ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700'
                                                : isSelected 
                                                    ? 'border-primary bg-orange-50 dark:bg-orange-900/30 shadow-md transform scale-[1.02]' 
                                                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-white/5 grayscale-[0.5] hover:grayscale-0'
                                            }`}
                                        >
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${isLocked ? 'bg-gray-300 text-gray-500' : (isSelected ? option.color : 'bg-gray-100 text-gray-400 dark:bg-gray-800')}`}>
                                                <span className="material-symbols-outlined">{isLocked ? 'lock' : option.icon}</span>
                                            </div>
                                            <span className={`text-xs font-bold text-center ${isLocked ? 'text-gray-400' : (isSelected ? 'text-primary dark:text-orange-400' : 'text-gray-500 dark:text-gray-400')}`}>
                                                {option.label}
                                            </span>
                                        </button>
                                        
                                        {/* Info Button (Top Left) */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setActiveInfo(option); }}
                                            className="absolute top-2 left-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 p-1 rounded-full hover:bg-blue-50 dark:hover:bg-white/10 transition-colors z-10"
                                            title="O que é isso?"
                                        >
                                            <span className="material-symbols-outlined text-lg">info</span>
                                        </button>

                                        {/* Check Icon (Top Right) */}
                                        {isSelected && !isLocked && (
                                            <span className="absolute top-2 right-2 text-blue-600 dark:text-blue-400 material-symbols-outlined text-lg animate-fadeIn">check_circle</span>
                                        )}
                                        
                                        {/* 18+ Label if locked */}
                                        {isLocked && (
                                            <span className="absolute top-2 right-2 bg-red-100 text-red-600 text-[10px] font-bold px-1 rounded border border-red-200">18+</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-surface-dark flex flex-col gap-2 shrink-0">
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`w-full h-12 font-bold rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 ${
                                selectedPreferences.length > 0 
                                ? 'bg-primary text-white hover:bg-primary/90' 
                                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                            }`}
                        >
                            {isSaving ? 'Salvando...' : (selectedPreferences.length > 0 ? 'Concluir Personalização' : 'Penso nisso depois')}
                            {!isSaving && selectedPreferences.length > 0 && <span className="material-symbols-outlined">arrow_forward</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MODAL INFO SOBREPOSIÇÃO (CAMADA 2) --- */}
            {activeInfo && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 animate-fadeIn" onClick={(e) => { e.stopPropagation(); setActiveInfo(null); }}>
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-6 max-w-xs w-full animate-bounce-y relative border-2 border-primary/20">
                        <button onClick={() => setActiveInfo(null)} className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <div className="flex flex-col items-center text-center">
                            <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-3 ${activeInfo.color}`}>
                                <span className="material-symbols-outlined text-3xl">{activeInfo.icon}</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{activeInfo.label}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{activeInfo.description}</p>
                            {activeInfo.id === 'alcohol' && (
                                <p className="text-xs text-red-500 font-bold mt-3 border border-red-200 bg-red-50 p-1 rounded">
                                    Proibido para menores de 18 anos.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
