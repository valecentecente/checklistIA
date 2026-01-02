
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
        if (!isAdminUsersModalOpen || !db || !isAdmin || currentUser?.uid.startsWith('offline-')) return;

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
            setError("Ocorreu um erro ao carregar a lista.");
        });

        return () => unsubscribe();
    }, [isAdminUsersModalOpen, isAdmin, currentUser]);

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
        if (!window.confirm(`Deseja realmente alterar o acesso de ${user.displayName}?`)) return;
        try {
            await banUser(user.uid, newStatus);
            showToast("Status alterado.");
        } catch (e) {
            showToast("Falha na operação.");
        }
    };

    if (!isAdminUsersModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('adminUsers')}>
            <div className="bg-white dark:bg-surface-dark w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3"><span className="material-symbols-outlined text-blue-400">group_manage</span><h2 className="text-lg font-bold">Usuários</h2></div>
                    <button onClick={() => closeModal('adminUsers')} className="p-1 hover:bg-white/10 rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <input type="text" placeholder="Buscar usuários..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-12 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 px-4" />
                </div>
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide bg-gray-50 dark:bg-black/10">
                    {isLoading ? <div className="flex justify-center py-20"><span className="material-symbols-outlined animate-spin text-4xl text-gray-400">sync</span></div> : error ? <div className="text-center py-20 text-red-500 font-bold">{error}</div> : filteredUsers.map(u => (
                        <div key={u.uid} className={`bg-white dark:bg-surface-dark p-4 rounded-xl border mb-2 flex items-center gap-4 ${u.status === 'banned' ? 'opacity-50 grayscale' : 'border-gray-100 dark:border-gray-800'}`}>
                            <div className="h-10 w-10 rounded-full overflow-hidden shrink-0">{u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><span className="material-symbols-outlined text-gray-400">person</span></div>}</div>
                            <div className="flex-1 min-w-0"><h3 className="font-bold text-sm truncate">{u.displayName}</h3><p className="text-xs text-gray-500 truncate">{u.email}</p></div>
                            <div className="flex gap-2"><button onClick={() => handleBan(u)} disabled={u.uid === currentUser?.uid} className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${u.status === 'banned' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><span className="material-symbols-outlined text-lg">{u.status === 'banned' ? 'person_check' : 'person_off'}</span></button></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
