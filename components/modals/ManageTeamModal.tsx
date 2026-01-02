
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import type { AdminPermissions, AdminInvite } from '../../types';

const ignorePermissionError = (err: any) => {
    return err.code === 'permission-denied' || (err.message && err.message.includes('Missing or insufficient permissions'));
};

export const ManageTeamModal: React.FC = () => {
    const { isManageTeamModalOpen, closeModal, showToast, isAdmin } = useApp();
    const { user, sendAdminInvite, cancelAdminInvite } = useAuth();
    
    const [activeTab, setActiveTab] = useState<'invite' | 'pending'>('invite');
    const [identifier, setIdentifier] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingInvites, setPendingInvites] = useState<AdminInvite[]>([]);
    
    const [permissions, setPermissions] = useState<AdminPermissions>({
        offers: true,
        factory: false,
        recipes: false,
        reviews: false,
        team: false,
        reports: false
    });

    useEffect(() => {
        if (!isManageTeamModalOpen || !db || !user || !isAdmin || user.uid.startsWith('offline-')) return;

        const q = query(
            collection(db, 'admin_invites'),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const invites = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            } as AdminInvite));

            invites.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            setPendingInvites(invites);
        }, (error) => {
            if (!ignorePermissionError(error)) {
                console.warn("[ManageTeam] Erro ao buscar convites pendentes:", error.message);
            }
        });

        return () => unsubscribe();
    }, [isManageTeamModalOpen, user, isAdmin]);

    if (!isManageTeamModalOpen) return null;

    const togglePermission = (key: keyof AdminPermissions) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleCancel = async (id: string, name: string) => {
        if (window.confirm(`Deseja realmente cancelar o convite para ${name}?`)) {
            await cancelAdminInvite(id);
            showToast("Convite cancelado.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await sendAdminInvite(identifier, permissions);
            if (result.success) {
                showToast(result.message);
                setIdentifier('');
                setActiveTab('pending');
            } else {
                showToast(result.message);
            }
        } catch (error) {
            console.error(error);
            showToast("Erro inesperado ao enviar convite.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const permissionLabels = [
        { id: 'offers', label: 'Admin Ofertas', icon: 'shopping_bag' },
        { id: 'factory', label: 'Fábrica de Conteúdo', icon: 'factory' },
        { id: 'recipes', label: 'Acervo de Receitas', icon: 'menu_book' },
        { id: 'reviews', label: 'Admin Avaliações', icon: 'rate_review' },
        { id: 'team', label: 'Gerenciar Equipe', icon: 'group' },
        { id: 'reports', label: 'Relatórios Equipe', icon: 'monitoring' },
    ];

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('manageTeam')}>
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[2.5rem] shadow-2xl animate-slideUp relative flex flex-col h-[85vh] max-h-[700px] overflow-hidden" onClick={e => e.stopPropagation()}>
                
                <div className="p-6 text-center relative overflow-hidden shrink-0 bg-blue-600">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <button onClick={() => closeModal('manageTeam')} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                        <span className="material-symbols-outlined text-white text-3xl">group</span>
                    </div>
                    <h2 className="text-white font-black text-xl uppercase italic tracking-tighter">Gestão de Equipe</h2>
                </div>

                <div className="flex bg-gray-100 dark:bg-black/20 p-1 shrink-0">
                    <button onClick={() => setActiveTab('invite')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-2xl transition-all flex items-center justify-center gap-2 ${activeTab === 'invite' ? 'bg-white dark:bg-zinc-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}><span className="material-symbols-outlined text-sm">person_add</span> Novo</button>
                    <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-2xl transition-all flex items-center justify-center gap-2 relative ${activeTab === 'pending' ? 'bg-white dark:bg-zinc-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}>Enviados {pendingInvites.length > 0 && <span className="absolute top-2 right-4 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>}</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {activeTab === 'invite' ? (
                        <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">E-mail ou Username</label>
                                <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} className="form-input w-full h-14 rounded-2xl border-gray-200 dark:border-gray-800 dark:bg-black/20 font-bold" placeholder="E-mail ou @usuario" required />
                            </div>
                            <div className="flex flex-col gap-2">
                                {permissionLabels.map((p) => (
                                    <button key={p.id} type="button" onClick={() => togglePermission(p.id as keyof AdminPermissions)} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${permissions?.[p.id as keyof AdminPermissions] ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-100 dark:border-gray-800 grayscale'}`}>
                                        <div className="flex items-center gap-3"><span className="material-symbols-outlined">{p.icon}</span><span className="text-[11px] font-black uppercase">{p.label}</span></div>
                                        <div className={`w-10 h-6 rounded-full relative transition-colors duration-300 ${permissions?.[p.id as keyof AdminPermissions] ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${permissions?.[p.id as keyof AdminPermissions] ? 'left-5' : 'left-1'}`}></div></div>
                                    </button>
                                ))}
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4 animate-fadeIn">
                            {pendingInvites.length === 0 ? <p className="text-center py-20 text-sm text-gray-400">Nenhum convite pendente.</p> : pendingInvites.map((invite) => (
                                <div key={invite.id} className="bg-gray-50 dark:bg-white/5 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <div className="min-w-0 flex-1"><p className="text-xs font-black uppercase truncate">{invite.toIdentifier}</p></div>
                                    <button onClick={() => handleCancel(invite.id, invite.toIdentifier)} className="h-10 w-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><span className="material-symbols-outlined text-lg">delete</span></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {activeTab === 'invite' && (
                    <div className="p-6 pt-2 shrink-0"><button onClick={handleSubmit} disabled={isSubmitting || !identifier} className="w-full h-16 rounded-[1.5rem] bg-blue-600 text-white font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all">Enviar Convite</button></div>
                )}
            </div>
        </div>
    );
};
