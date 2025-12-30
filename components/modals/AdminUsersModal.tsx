import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import type { User } from '../../types';

const ignorePermissionError = (err: any) => {
    return err.code === 'permission-denied' || (err.message && err.message.includes('Missing or insufficient permissions'));
};

export const AdminUsersModal: React.FC = () => {
    const { isAdminUsersModalOpen, closeModal, showToast, isAdmin } = useApp();
    const { user: currentUser, banUser, deleteUserProfile, updateUserRole } = useAuth();
    
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAdminUsersModalOpen || !db || !isAdmin) return;

        setIsLoading(true);
        setError(null);
        
        const q = query(collection(db, 'users'), limit(500));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userList: User[] = snapshot.docs.map(docSnap => ({
                uid: docSnap.id,
                ...docSnap.data()
            } as User));

            userList.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

            setUsers(userList);
            setIsLoading(false);
        }, (err: any) => {
            if (ignorePermissionError(err)) {
                setIsLoading(false);
                setError("Acesso restrito. Verificando permissões...");
                return;
            }

            console.error("Erro ao carregar usuários:", err);
            setIsLoading(false);
            setError("Ocorreu um erro ao carregar a lista. Verifique sua conexão.");
        });

        return () => unsubscribe();
    }, [isAdminUsersModalOpen, isAdmin]);

    const filteredUsers = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return users;
        return users.filter(u => 
            (u.displayName?.toLowerCase().includes(term)) || 
            (u.email?.toLowerCase().includes(term)) ||
            (u.username?.toLowerCase().includes(term))
        );
    }, [users, searchTerm]);

    const handleBan = async (user: User) => {
        const newStatus = user.status === 'banned' ? 'active' : 'banned';
        const actionLabel = newStatus === 'banned' ? 'BANIR' : 'REATIVAR';
        
        if (!window.confirm(`Deseja realmente ${actionLabel} o acesso de ${user.displayName || 'este usuário'}?`)) return;

        try {
            await banUser(user.uid, newStatus);
            showToast(`Usuário ${newStatus === 'banned' ? 'suspenso' : 'reativado'} com sucesso.`);
        } catch (e) {
            showToast("Falha na operação.");
        }
    };

    const handleDelete = async (user: User) => {
        if (!window.confirm(`⚠️ AÇÃO IRREVERSÍVEL!\n\nDeseja apagar permanentemente o perfil de ${user.displayName}?\nIsso não apagará as listas de compras, apenas o acesso dele.`)) return;

        try {
            await deleteUserProfile(user.uid, user.email || '');
            showToast("Perfil deletado com sucesso.");
        } catch (e) {
            showToast("Erro ao deletar perfil.");
        }
    };

    const handleRoleChange = async (user: User, newRole: 'user' | 'admin_l1' | 'admin_l2') => {
        if (user.uid === currentUser?.uid) {
            showToast("Você não pode alterar seu próprio cargo.");
            return;
        }
        try {
            await updateUserRole(user.uid, newRole);
            showToast("Cargo atualizado com sucesso.");
        } catch (e) {
            showToast("Erro ao mudar cargo.");
        }
    };

    if (!isAdminUsersModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('adminUsers')}>
            <div className="bg-white dark:bg-surface-dark w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-slideUp" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-400">group_manage</span>
                        <h2 className="text-lg font-bold">Gestão de Usuários</h2>
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-black">{users.length}</span>
                    </div>
                    <button onClick={() => closeModal('adminUsers')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Busca */}
                <div className="p-4 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar por nome, e-mail ou @username..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide bg-gray-50 dark:bg-black/10">
                    {isLoading ? (
                        <div className="flex justify-center py-20"><span className="material-symbols-outlined animate-spin text-4xl text-gray-400">sync</span></div>
                    ) : error ? (
                        <div className="text-center py-20 px-6">
                            <span className="material-symbols-outlined text-6xl mb-4 text-red-500">gpp_maybe</span>
                            <p className="font-bold text-gray-800 dark:text-gray-100 mb-2">{error}</p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg"
                            >
                                Recarregar App
                            </button>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-20 opacity-40">
                            <span className="material-symbols-outlined text-6xl mb-2">person_search</span>
                            <p className="font-bold">Nenhum usuário encontrado.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {filteredUsers.map(u => (
                                <div key={u.uid} className={`bg-white dark:bg-surface-dark p-4 rounded-xl border transition-all flex items-center gap-4 group ${u.status === 'banned' ? 'border-red-500/30 opacity-70 grayscale' : 'border-gray-100 dark:border-gray-800 hover:border-blue-500/30'}`}>
                                    
                                    {/* Foto */}
                                    <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                                        {u.photoURL ? (
                                            <img src={u.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                <span className="material-symbols-outlined">person</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{u.displayName || 'Sem Nome'}</h3>
                                            {u.status === 'banned' && (
                                                <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Banido</span>
                                            )}
                                            {u.uid === currentUser?.uid && (
                                                <span className="bg-blue-100 text-blue-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Você</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                                            <span className="font-bold">@{u.username || 'n/a'}</span>
                                            <span>•</span>
                                            <span className="select-all">{u.email || 'N/A'}</span>
                                        </div>
                                    </div>

                                    {/* Ações */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        
                                        {/* Cargo Selector */}
                                        <select 
                                            value={u.role || 'user'}
                                            disabled={u.uid === currentUser?.uid}
                                            onChange={e => handleRoleChange(u, e.target.value as any)}
                                            className="text-[10px] font-black uppercase rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/30 px-2 py-1 outline-none h-8"
                                        >
                                            <option value="user">Usuário</option>
                                            <option value="admin_l2">Editor L2</option>
                                            <option value="admin_l1">Super Admin L1</option>
                                        </select>

                                        {/* Ban Button */}
                                        <button 
                                            onClick={() => handleBan(u)}
                                            disabled={u.uid === currentUser?.uid}
                                            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${u.status === 'banned' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                            title={u.status === 'banned' ? "Reativar usuário" : "Banir usuário"}
                                        >
                                            <span className="material-symbols-outlined text-lg">{u.status === 'banned' ? 'person_check' : 'person_off'}</span>
                                        </button>

                                        {/* Delete Profile */}
                                        <button 
                                            onClick={() => handleDelete(u)}
                                            disabled={u.uid === currentUser?.uid}
                                            className="h-8 w-8 bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-red-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                                            title="Excluir Perfil"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-gray-700 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Privacidade ChecklistIA • Gerenciamento Seguro
                </div>
            </div>
        </div>
    );
};