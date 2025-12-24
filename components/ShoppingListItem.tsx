
import React from 'react';
import type { ShoppingItem } from '../types';

interface ShoppingListItemProps {
  item: ShoppingItem;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onTogglePurchased: (id: string) => void;
}

export const ShoppingListItem: React.FC<ShoppingListItemProps> = ({ item, onDelete, onEdit, onTogglePurchased }) => {
  
  const handleTextClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent label from toggling checkbox
    onEdit(item.id);
  };

  const handleCheckboxChange = () => {
    // If price is 0, open edit modal instead of toggling.
    if (item.calculatedPrice === 0 && !item.isPurchased) {
      onEdit(item.id);
    } else {
      onTogglePurchased(item.id);
    }
  };
  
  const textClasses = `flex-1 text-base font-bold leading-tight cursor-pointer ${
    item.isPurchased 
    ? 'text-text-muted-light line-through dark:text-text-muted-dark' 
    : 'text-text-light dark:text-text-dark'
  }`;

  // Filter out the legacy text "Pendente (clique para editar)" and empty strings
  const showDetails = item.details && item.details.trim() !== '' && item.details !== 'Pendente (clique para editar)';

  return (
    <label className="flex flex-row items-center gap-x-4 py-3.5 group">
      <input 
        type="checkbox"
        checked={item.isPurchased}
        onChange={handleCheckboxChange}
        className="h-6 w-6 rounded-lg border-gray-400 bg-transparent text-blue-600 focus:ring-blue-600 focus:ring-offset-background-light dark:border-gray-600 dark:focus:ring-offset-background-dark dark:text-blue-500 dark:focus:ring-blue-500 transition-all cursor-pointer"
      />
      <div className="flex-1 min-w-0" onClick={handleTextClick}>
        <p className={textClasses}>
            {item.name}
        </p>
         {/* Detalhes (Peso/Qtd/Contexto) visíveis em Mobile e Desktop */}
         {showDetails && (
             <p className={`text-xs mt-1 font-medium transition-colors ${item.isPurchased ? 'text-gray-400 line-through' : 'text-gray-500 dark:text-gray-400'}`}>
                {item.details}
             </p>
         )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className={`text-sm font-black whitespace-nowrap ${item.calculatedPrice > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-700'}`}>
            {item.displayPrice}
        </span>
        
        {item.isPurchased && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="flex items-center justify-center h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
              aria-label={`Remover ${item.name}`}
            >
              <span className="material-symbols-outlined !text-lg">delete</span>
            </button>
        )}
      </div>
    </label>
  );
};
