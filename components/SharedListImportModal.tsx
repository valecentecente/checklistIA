
import React from 'react';
import type { HistoricItem, AuthorMetadata } from '../types';

interface SharedListImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: () => void;
    listData: { marketName: string; items: HistoricItem[]; author?: AuthorMetadata } | null;
    isLoading: boolean;
}

export const SharedListImportModal: React.FC<SharedListImportModalProps> = ({ isOpen, onClose, onImport, listData, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-xl bg-background-light dark:bg-surface-dark shadow-2xl p-6 animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark">Buscando lista compartilhada...</p>
                    </div>
                ) : listData ? (
                    <>
                        {/* Author Info Header */}
                        {listData.author ? (
                            <div className="flex flex-col items-center mb-4">
                                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-md mb-2">
                                    {listData.author.photoURL ? (
                                        <img src={listData.author.photoURL} alt={listData.author.displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-orange-100 flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined !text-3xl">person</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Recebido de</p>
                                <h3 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">{listData.author.displayName}</h3>
                            </div>
                        ) : (
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <span className="material-symbols-outlined !text-3xl">download</span>
                            </div>
                        )}

                        <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark text-center">Importar Lista?</h2>
                        
                        <div className="mt-4 bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-border-light dark:border-border-dark">
                            <p className="font-bold text-primary dark:text-orange-400 text-center mb-1">{listData.marketName || "Lista de Compras"}</p>
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center">
                                {listData.items.length} itens encontrados
                            </p>
                            <div className="mt-3 max-h-32 overflow-y-auto text-xs text-gray-500 dark:text-gray-400 px-2">
                                <ul className="list-disc list-inside">
                                    {listData.items.slice(0, 5).map((item, i) => (
                                        <li key={i}>{item.name}</li>
                                    ))}
                                    {listData.items.length > 5 && <li>... e mais {listData.items.length - 5}</li>}
                                </ul>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                            <button 
                                onClick={onImport}
                                className="flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-bold text-white shadow-lg transition-colors hover:bg-primary/90"
                            >
                                Sim, Adicionar à Minha Lista
                            </button>
                            <button 
                                onClick={onClose}
                                className="flex h-12 w-full items-center justify-center rounded-xl bg-transparent text-text-secondary-light dark:text-text-secondary-dark font-semibold hover:bg-gray-100 dark:hover:bg-white/5"
                            >
                                Cancelar
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-6">
                        <span className="material-symbols-outlined text-4xl text-red-500 mb-3">link_off</span>
                        <h2 className="text-lg font-bold mb-2">Lista não encontrada</h2>
                        <p className="text-sm text-gray-500">Este link pode ter expirado ou ser inválido.</p>
                        <button onClick={onClose} className="mt-6 w-full bg-gray-100 dark:bg-white/10 py-2 rounded-lg font-semibold">Fechar</button>
                    </div>
                )}
            </div>
        </div>
    );
};
