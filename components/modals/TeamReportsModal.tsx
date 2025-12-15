
import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useShoppingList } from '../../contexts/ShoppingListContext';
import type { User, ActivityLog } from '../../types';

// Componente para a Timeline de Atividades
const ActivityTimeline: React.FC<{ logs: ActivityLog[] }> = ({ logs }) => {
    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">history_toggle_off</span>
                <p className="text-sm">Nenhuma atividade recente registrada.</p>
            </div>
        );
    }

    const getActionIcon = (type: string) => {
        switch(type) {
            case 'create': return { icon: 'add_circle', color: 'text-green-500 bg-green-100 dark:bg-green-900/30' };
            case 'update': return { icon: 'edit', color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' };
            case 'delete': return { icon: 'delete', color: 'text-red-500 bg-red-100 dark:bg-red-900/30' };
            case 'login': return { icon: 'login', color: 'text-gray-500 bg-gray-100 dark:bg-gray-800' };
            default: return { icon: 'info', color: 'text-gray-500 bg-gray-100' };
        }
    };

    const getActionLabel = (type: string) => {
        switch(type) {
            case 'create': return 'Adicionou oferta';
            case 'update': return 'Editou oferta';
            case 'delete': return 'Removeu oferta';
            case 'login': return 'Acessou o sistema';
            default: return 'Ação desconhecida';
        }
    };

    return (
        <div className="flex flex-col gap-0 relative pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-3 py-2">
            {logs.map((log) => {
                const style = getActionIcon(log.actionType);
                const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
                
                return (
                    <div key={log.id} className="mb-6 relative animate-fadeIn">
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[25px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white dark:border-surface-dark ${style.color}`}>
                            <span className="material-symbols-outlined text-sm font-bold">{style.icon}</span>
                        </div>
                        
                        <div className="bg-white dark:bg-white/5 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm ml-2">
                            <div className="flex justify-between items-start mb-1">
                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                                    {getActionLabel(log.actionType)}
                                </p>
                                <span className="text-[10px] text-gray-400 font-mono">
                                    {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            
                            <p className="text-sm font-medium text-primary dark:text-orange-400 mb-1">
                                {log.targetName}
                            </p>
                            
                            {log.details && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                    "{log.details}"
                                </p>
                            )}
                            
                            <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-100 dark:border-gray-700 pt-1">
                                {date.toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const TeamReportsModal: React.FC = () => {
    const { isTeamReportsModalOpen, closeModal } = useApp();
    const { getTeamMembers, getMemberLogs } = useShoppingList();
    
    const [members, setMembers] = useState<User[]>([]);
    const [selectedMember, setSelectedMember] = useState<User | null>(null);
    const [memberLogs, setMemberLogs] = useState<ActivityLog[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    // Carrega a lista de membros ao abrir o modal
    useEffect(() => {
        if (isTeamReportsModalOpen) {
            setIsLoadingMembers(true);
            getTeamMembers().then(data => {
                setMembers(data);
                setIsLoadingMembers(false);
            });
            // Reseta seleção
            setSelectedMember(null);
            setMemberLogs([]);
        }
    }, [isTeamReportsModalOpen, getTeamMembers]);

    // Carrega logs quando um membro é selecionado
    useEffect(() => {
        if (selectedMember) {
            setIsLoadingLogs(true);
            getMemberLogs(selectedMember.uid).then(logs => {
                setMemberLogs(logs);
                setIsLoadingLogs(false);
            });
        }
    }, [selectedMember, getMemberLogs]);

    if (!isTeamReportsModalOpen) return null;

    // Calcular "Último Acesso" baseado no último log (qualquer tipo)
    const getLastSeen = (logs: ActivityLog[]) => {
        if (logs.length === 0) return "Sem atividade recente";
        const lastLog = logs[0]; // Assumindo ordenação desc
        const date = lastLog.timestamp?.toDate ? lastLog.timestamp.toDate() : new Date();
        
        // Formatação amigável
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        
        if (diffMins < 60) return `Visto há ${diffMins} min`;
        if (diffHours < 24) return `Visto há ${diffHours}h`;
        return `Visto em ${date.toLocaleDateString()}`;
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('teamReports')}>
            <div className="relative w-full max-w-4xl bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-400">monitoring</span>
                            Relatórios da Equipe
                        </h2>
                        <p className="text-xs text-slate-400">Acompanhe a atividade dos editores de ofertas.</p>
                    </div>
                    <button onClick={() => closeModal('teamReports')} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar: Lista de Membros */}
                    <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/20 flex flex-col">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-bold text-gray-500 uppercase">Membros ({members.length})</p>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {isLoadingMembers ? (
                                <div className="flex justify-center p-4">
                                    <span className="material-symbols-outlined animate-spin text-gray-400">sync</span>
                                </div>
                            ) : members.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center p-4">Nenhum editor encontrado.</p>
                            ) : (
                                members.map(member => (
                                    <button
                                        key={member.uid}
                                        onClick={() => setSelectedMember(member)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                                            selectedMember?.uid === member.uid 
                                            ? 'bg-white dark:bg-surface-dark shadow-md border-l-4 border-blue-500' 
                                            : 'hover:bg-white/50 dark:hover:bg-white/5 border-l-4 border-transparent'
                                        }`}
                                    >
                                        <div className="relative">
                                            {member.photoURL ? (
                                                <img src={member.photoURL} className="w-10 h-10 rounded-full object-cover border border-gray-200" alt={member.displayName || 'User'} />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                                    <span className="material-symbols-outlined">person</span>
                                                </div>
                                            )}
                                            {/* Status Dot (Simulado, já que não temos realtime presence) */}
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 border-2 border-white rounded-full"></div>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                                                {member.displayName}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                @{member.username}
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Main Content: Relatório do Usuário */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-surface-dark overflow-hidden">
                        {selectedMember ? (
                            <>
                                {/* User Header Stats */}
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-full border-4 border-white shadow-lg overflow-hidden">
                                            {selectedMember.photoURL ? (
                                                <img src={selectedMember.photoURL} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                    <span className="material-symbols-outlined text-3xl">person</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedMember.displayName}</h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Nível 2</span>
                                                <span>•</span>
                                                <span>{selectedMember.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-400 uppercase">Status</p>
                                        <p className={`font-bold ${isLoadingLogs ? 'text-gray-400' : 'text-green-600'}`}>
                                            {isLoadingLogs ? 'Calculando...' : getLastSeen(memberLogs)}
                                        </p>
                                    </div>
                                </div>

                                {/* Timeline Content */}
                                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-black/10">
                                    {isLoadingLogs ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
                                            <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
                                            <p className="text-sm">Carregando histórico...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 sticky top-0 bg-gray-50 dark:bg-black/10 py-2 z-10">
                                                Histórico de Atividade ({memberLogs.length})
                                            </h4>
                                            <ActivityTimeline logs={memberLogs} />
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50/30 dark:bg-black/20">
                                <span className="material-symbols-outlined text-6xl mb-4 opacity-20">assignment_ind</span>
                                <p className="text-lg font-medium">Selecione um membro</p>
                                <p className="text-sm">Veja o histórico detalhado de ações.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
