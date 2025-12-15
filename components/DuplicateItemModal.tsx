import React from 'react';
import type { ShoppingItem } from '../types';

interface DuplicateItemModalProps {
  newItemName: string;
  existingItem: ShoppingItem;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DuplicateItemModal: React.FC<DuplicateItemModalProps> = ({
  newItemName,
  existingItem,
  onConfirm,
  onCancel,
}) => {
  const contextText = existingItem.recipeName
    ? `(na receita de ${existingItem.recipeName})`
    : 'em "Outros Itens"';

  return (
    <div 
      className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fadeIn" 
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="duplicate-dialog-title"
      aria-describedby="duplicate-dialog-description"
    >
      <div 
        className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-sm transform transition-all duration-300 animate-slideUp"
        role="document"
      >
        <h2 id="duplicate-dialog-title" className="text-xl font-bold text-slate-800">Item Duplicado Encontrado</h2>
        <p id="duplicate-dialog-description" className="mt-2 text-slate-600">
          O item <strong className="text-orange-600">'{newItemName}'</strong> já está na sua lista {contextText}. Deseja adicioná-lo mesmo assim?
        </p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto justify-center rounded-md border border-transparent bg-orange-500 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Adicionar Mesmo Assim
          </button>
        </div>
      </div>
    </div>
  );
};