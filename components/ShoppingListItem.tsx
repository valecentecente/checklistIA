
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
  
  const textClasses = `flex-1 text-base font-normal leading-normal cursor-pointer ${
    item.isPurchased 
    ? 'text-text-muted-light line-through dark:text-text-muted-dark' 
    : 'text-text-light dark:text-text-dark'
  }`;

  // Filter out the legacy text "Pendente (clique para editar)" and empty strings
  const showDetails = item.details && item.details.trim() !== '' && item.details !== 'Pendente (clique para editar)';

  return (
    <label className="flex flex-row items-center gap-x-4 py-3.5">
      <input 
        type="checkbox"
        checked={item.isPurchased}
        onChange={handleCheckboxChange}
        className="h-5 w-5 rounded border-gray-400 bg-transparent text-blue-600 focus:ring-blue-600 focus:ring-offset-background-light dark:border-gray-600 dark:focus:ring-offset-background-dark dark:text-blue-500 dark:focus:ring-blue-500"
      />
      <div className="flex-1 min-w-0" onClick={handleTextClick}>
        <p className={textClasses}>
            {item.name}
        </p>
         {/* Detalhes ocultos no mobile (padrão) e visíveis apenas em telas grandes (lg:block) */}
         {showDetails && <p className="text-sm text-slate-500 hidden lg:block">{item.details}</p>}
      </div>

      {item.isPurchased ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="flex-shrink-0 flex items-center justify-center h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors"
          aria-label={`Remover ${item.name}`}
        >
          <span className="material-symbols-outlined !text-xl">delete</span>
        </button>
      ) : (
        <div className="w-8 h-8 flex-shrink-0"></div> // Placeholder to prevent layout shift
      )}

      <span className="text-sm text-text-muted-light dark:text-text-muted-dark w-24 text-right">{item.displayPrice}</span>
    </label>
  );
};
