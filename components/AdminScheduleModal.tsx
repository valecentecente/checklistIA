
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { ScheduleRule } from '../types';

const DEFAULT_GRID: ScheduleRule[] = [
    { id: '1', label: '☕ Café da Manhã', startHour: 6, endHour: 10, tags: ['Café', 'Suco', 'Pão', 'Fruta', 'Ovo', 'Tapioca'] },
    { id: '2', label: '🥩 Almoço', startHour: 11, endHour: 14, tags: ['Almoço', 'Carne', 'Arroz', 'Feijão', 'Massa', 'Salada'] },
    { id: '3', label: '🍰 Lanche da Tarde', startHour: 15, endHour: 18, tags: ['Lanche', 'Bolo', 'Torta', 'Café', 'Salgado'] },
    { id: '4', label: '🥗 Jantar', startHour: 19, endHour: 22, tags: ['Jantar', 'Sopa', 'Leve', 'Massa', 'Pizza'] },
    { id: '5', label: '🦉 Corujão', startHour: 23, endHour: 5, tags: ['Snack', 'Rápido', 'Hambúrguer', 'Doce'] },
    { id: 'seasonal_1', label: '🎄 Especial Natal', startHour: 0, endHour: 24, tags: ['Natal', 'Ceia', 'Peru', 'Rabanada', 'Panetone'], startDate: '12-01', endDate: '12-24' },
    { id: 'seasonal_2', label: '🥂 Réveillon', startHour: 0, endHour: 24, tags: ['Ano Novo', 'Reveillon', 'Lentilha', 'Festa', 'Drink'], startDate: '12-25', endDate: '12-31' }
];

export const AdminScheduleModal: React.FC = () => {
    const { isAdminScheduleModalOpen, closeModal, scheduleRules, saveScheduleRules, showToast } = useApp();
    const { user } = useAuth();
    const [localRules, setLocalRules] = useState<ScheduleRule[]>([]);
    
    useEffect(() => {
        if (isAdminScheduleModalOpen) {
            // Se já existem regras no banco, usa elas. Se estiver vazio, carrega a Grade Mestra Padrão.
            const rulesToDisplay = scheduleRules.length > 0 ? scheduleRules : DEFAULT_GRID;
            
            setLocalRules([...rulesToDisplay].sort((a, b) => {
                if (a.startDate && !b.startDate) return -1;
                if (!a.startDate && b.startDate) return 1;
                return a.startHour - b.startHour;
            }));
        }
    }, [isAdminScheduleModalOpen, scheduleRules]);

    if (!isAdminScheduleModalOpen) return null;

    const handleAddRule = () => {
        const newRule: ScheduleRule = {
            id: Date.now().toString(),
            label: 'Novo Período',
            startHour: 0,
            endHour: 24,
            tags: ['Geral'],
            startDate: '',
            endDate: ''
        };
        setLocalRules([...localRules, newRule]);
    };

    const handleResetToDefault = () => {
        if (!window.confirm("Isso irá carregar a Grade Mestra padrão do ChecklistIA. Deseja continuar?")) return;
        setLocalRules(DEFAULT_GRID);
        showToast("Grade Mestra carregada!");
    };

    const handleRemoveRule = (id: string) => {
        setLocalRules(localRules.filter(r => r.id !== id));
    };

    const handleUpdateRule = (id: string, field: keyof ScheduleRule, value: any) => {
        setLocalRules(localRules.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleSave = async () => {
        try {
            await saveScheduleRules(localRules);
            closeModal('adminSchedule');
        } catch (error) {
            showToast("Erro ao salvar regras.");
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('adminSchedule')}>
            <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>
                
                <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">calendar_view_day</span>
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg leading-none">Calendário de Vitrine</h2>
                            <p className="text-[10px] text-gray-400 uppercase mt-1 font-black">Grade Estratégica Ativa</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleResetToDefault}
                            className="text-[10px] font-black uppercase bg-white/10 hover:bg-white/20 text-indigo-300 px-3 py-1.5 rounded-lg border border-white/10 transition-all"
                        >
                            Reset Grade Mestra
                        </button>
                        <button onClick={() => closeModal('adminSchedule')} className="text-gray-400 hover:text-white">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
                    {localRules.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-gray-500 font-bold mb-4">Nenhuma regra definida.</p>
                            <button onClick={handleResetToDefault} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">Carregar Sugestões</button>
                        </div>
                    )}

                    {localRules.map((rule) => {
                        const isSeasonal = !!rule.startDate;

                        return (
                            <div key={rule.id} className={`bg-slate-800 border ${isSeasonal ? 'border-indigo-500/50 bg-indigo-900/10' : 'border-slate-700'} rounded-xl p-4 flex flex-col gap-4 animate-fadeIn group relative`}>
                                {isSeasonal && (
                                    <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-widest">Período Sazonal</div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                    <div className="flex-1 w-full">
                                        <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Nome do Período</label>
                                        <input 
                                            type="text" 
                                            value={rule.label}
                                            onChange={e => handleUpdateRule(rule.id, 'label', e.target.value)}
                                            className="w-full bg-slate-700 border-0 rounded-lg text-white font-bold h-10 px-3 focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Ex: Hora do Almoço"
                                        />
                                    </div>

                                    <div className="flex gap-2 shrink-0">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Início</label>
                                            <select 
                                                value={rule.startHour}
                                                onChange={e => handleUpdateRule(rule.id, 'startHour', parseInt(e.target.value))}
                                                className="bg-slate-700 border-0 rounded-lg text-white h-10 px-2 font-mono text-sm"
                                            >
                                                {[...Array(25)].map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}h</option>)}
                                            </select>
                                        </div>
                                        <div className="pt-6 text-gray-600">às</div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Fim</label>
                                            <select 
                                                value={rule.endHour}
                                                onChange={e => handleUpdateRule(rule.id, 'endHour', parseInt(e.target.value))}
                                                className="bg-slate-700 border-0 rounded-lg text-white h-10 px-2 font-mono text-sm"
                                            >
                                                {[...Array(25)].map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}h</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 shrink-0">
                                        <div>
                                            <label className="text-[10px] font-black text-blue-400 uppercase mb-1 block">Data Início</label>
                                            <input 
                                                type="text"
                                                placeholder="MM-DD"
                                                value={rule.startDate || ''}
                                                onChange={e => handleUpdateRule(rule.id, 'startDate', e.target.value)}
                                                className="bg-slate-700 border-0 rounded-lg text-white h-10 px-3 font-mono text-xs w-20"
                                            />
                                        </div>
                                        <div className="pt-6 text-gray-600">até</div>
                                        <div>
                                            <label className="text-[10px] font-black text-blue-400 uppercase mb-1 block">Data Fim</label>
                                            <input 
                                                type="text"
                                                placeholder="MM-DD"
                                                value={rule.endDate || ''}
                                                onChange={e => handleUpdateRule(rule.id, 'endDate', e.target.value)}
                                                className="bg-slate-700 border-0 rounded-lg text-white h-10 px-3 font-mono text-xs w-20"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-center">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Palavras-Chave (Tags para busca IA)</label>
                                        <input 
                                            type="text" 
                                            value={rule.tags.join(', ')}
                                            onChange={e => handleUpdateRule(rule.id, 'tags', e.target.value.split(',').map(t => t.trim()))}
                                            className="w-full bg-slate-700 border-0 rounded-lg text-white h-10 px-3 focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Ex: Almoço, Massa, Carne"
                                        />
                                    </div>

                                    <button 
                                        onClick={() => handleRemoveRule(rule.id)}
                                        className="h-10 w-10 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 self-end"
                                        title="Remover Regra"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    <button 
                        onClick={handleAddRule}
                        className="w-full py-6 border-2 border-dashed border-slate-700 rounded-xl text-gray-500 font-bold hover:border-indigo-500 hover:text-indigo-400 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                        Adicionar Novo Slot Personalizado
                    </button>
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-800 flex gap-3">
                    <button 
                        onClick={() => closeModal('adminSchedule')}
                        className="flex-1 h-12 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex-1 h-12 rounded-xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-500 transition-all"
                    >
                        Salvar e Ativar Grade
                    </button>
                </div>
            </div>
        </div>
    );
};
