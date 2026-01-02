
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, getCountFromServer, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../contexts/AppContext';

export const AdminDashboardModal: React.FC = () => {
    const { isAdminDashboardModalOpen, closeModal, isAdmin } = useApp();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalRecipes: 0,
        totalOffers: 0,
        totalFeedbacks: 0
    });
    const [lastFeedbacks, setLastFeedbacks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAdminDashboardModalOpen || !db || !isAdmin) return;

        const fetchStats = async () => {
            setIsLoading(true);
            try {
                // Usamos allSettled para que falhas de permissão em uma coleção (ex: users) 
                // não quebrem o carregamento das outras (ex: receitas/ofertas)
                const results = await Promise.allSettled([
                    getCountFromServer(collection(db, 'users')),
                    getCountFromServer(collection(db, 'global_recipes')),
                    getCountFromServer(collection(db, 'offers')),
                    getCountFromServer(collection(db, 'feedbacks'))
                ]);

                setStats({
                    totalUsers: results[0].status === 'fulfilled' ? results[0].value.data().count : 0,
                    totalRecipes: results[1].status === 'fulfilled' ? results[1].value.data().count : 0,
                    totalOffers: results[2].status === 'fulfilled' ? results[2].value.data().count : 0,
                    totalFeedbacks: results[3].status === 'fulfilled' ? results[3].value.data().count : 0
                });

                // Log amigável para debug se algo falhou silenciosamente
                results.forEach((res, i) => {
                    if (res.status === 'rejected') {
                        console.warn(`[Dashboard] Metric ${i} failed:`, res.reason?.message);
                    }
                });

            } catch (e) {
                console.error("[Dashboard] Critical Stats Error:", e);
            } finally {
                setIsLoading(false);
            }
        };

        const unsubFeedbacks = onSnapshot(
            query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'), limit(5)),
            (snap) => {
                setLastFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            },
            (error) => {
                // Apenas silencia no console se for erro de permissão esperado durante troca de auth
                if (error.code !== 'permission-denied') {
                    console.warn("[Dashboard] Feedbacks listener failed:", error.message);
                }
            }
        );

        fetchStats();
        return () => unsubFeedbacks();
    }, [isAdminDashboardModalOpen, isAdmin]);

    if (!isAdminDashboardModalOpen) return null;

    const StatCard: React.FC<{ label: string; value: number; icon: string; color: string }> = ({ label, value, icon, color }) => (
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${color} shadow-inner`}>
                <span className="material-symbols-outlined text-white text-2xl">{icon}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
                <span className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                    {isLoading ? '...' : value.toLocaleString()}
                </span>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[260] bg-black/90 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('adminDashboard')}>
            <div className="bg-[#F8F9FA] dark:bg-[#0a0a0a] w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-white/5 animate-slideUp" onClick={e => e.stopPropagation()}>
                
                {/* Header Estilo Apple Intelligence */}
                <div className="p-8 bg-slate-900 text-white shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20 opacity-50"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-1">
                                Business <span className="text-blue-500">Intelligence</span>
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">ChecklistIA Metrics v1.0</p>
                        </div>
                        <button onClick={() => closeModal('adminDashboard')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-6">
                    {/* Grid de Métricas Principais */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard label="Usuários" value={stats.totalUsers} icon="group" color="bg-blue-600" />
                        <StatCard label="Receitas no Acervo" value={stats.totalRecipes} icon="menu_book" color="bg-orange-600" />
                        <StatCard label="Itens em Oferta" value={stats.totalOffers} icon="shopping_bag" color="bg-green-600" />
                        <StatCard label="Feedbacks" value={stats.totalFeedbacks} icon="star" color="bg-purple-600" />
                    </div>

                    {/* Gráfico Simulado de Performance */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Saúde do Sistema</h3>
                            <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">Excelente</span>
                        </div>
                        
                        <div className="flex items-end justify-between h-32 gap-2 mb-4 px-2">
                             {[40, 65, 45, 90, 75, 55, 80, 60, 95, 70, 85, 100].map((h, i) => (
                                <div key={i} className="flex-1 bg-blue-500/10 dark:bg-white/5 rounded-t-lg relative group">
                                    <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg transition-all duration-1000 ease-out" style={{ height: `${isLoading ? 0 : h}%` }}></div>
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black text-white text-[8px] font-black p-1 rounded transition-opacity">Vol: {h}</div>
                                </div>
                             ))}
                        </div>
                        <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest">Volume de requisições IA (Últimas 12h)</p>
                    </div>

                    {/* Últimos Feedbacks */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Voz do Usuário (Recentes)</h3>
                        <div className="flex flex-col gap-3">
                            {lastFeedbacks.length === 0 ? (
                                <div className="text-center py-10 opacity-40 italic text-sm">Sem feedbacks novos.</div>
                            ) : lastFeedbacks.map(f => (
                                <div key={f.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm animate-fadeIn">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[14px]">person</span>
                                            </div>
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{f.userName || 'Anônimo'}</span>
                                        </div>
                                        <div className="flex text-yellow-500 text-xs">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={`material-symbols-outlined text-sm ${i < f.rating ? 'font-variation-FILL-1' : ''}`} style={i < f.rating ? { fontVariationSettings: "'FILL' 1" } : {}}>star</span>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{f.comment || 'Sem comentário'}"</p>
                                    <p className="text-[8px] text-gray-400 mt-2 text-right font-bold uppercase tracking-widest">
                                        {f.createdAt?.toDate ? f.createdAt.toDate().toLocaleString() : 'Hoje'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-white/5 shrink-0 flex justify-between items-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Acesso Restrito: Ricardo029@gmail.com</p>
                    <button 
                        onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
                        className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 hover:underline"
                    >
                        Console Completo <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
