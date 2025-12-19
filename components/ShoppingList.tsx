
import React, { useState } from 'react';
import type { ShoppingItem } from '../types';
import { ShoppingListItem } from './ShoppingListItem';

interface ShoppingListProps {
  groupedItems: Record<string, ShoppingItem[]>;
  onDeleteItem: (id: string) => void;
  onDeleteGroup: (recipeName: string) => void;
  onStartEdit: (id: string) => void;
  onShowRecipe: (recipeName: string) => void;
  onTogglePurchased: (id: string) => void;
}

const RecipeBookIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
);

const ShoppingListGroup: React.FC<{
    groupName: string;
    items: ShoppingItem[];
    onDeleteItem: (id: string) => void;
    onDeleteGroup: (recipeName: string) => void;
    onStartEdit: (id: string) => void;
    onShowRecipe: (recipeName: string) => void;
    onTogglePurchased: (id: string) => void;
}> = ({ groupName, items, onDeleteItem, onDeleteGroup, onStartEdit, onShowRecipe, onTogglePurchased }) => {
    const [isOpen, setIsOpen] = useState(true);
    const isRecipeGroup = groupName.startsWith('Receita: ');
    const isResponsibleGroup = groupName.startsWith('Responsável: ');
    const isOthersGroup = groupName === 'Não Atribuído';
    
    const recipeName = isRecipeGroup ? groupName.replace('Receita: ', '') : '';
    const responsibleName = isResponsibleGroup ? groupName.replace('Responsável: ', '') : '';

    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        action();
    };

    return (
        <div className="flex flex-col rounded-2xl shadow-sm overflow-hidden bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 transition-all relative z-10">
            <div 
                className="cursor-pointer select-none p-5 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors border-b border-gray-100 dark:border-gray-800"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isResponsibleGroup || isOthersGroup ? (
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600/60 dark:text-orange-400/60 mb-1">
                                {isOthersGroup ? 'Lista Geral' : 'Responsável'}
                            </p>
                            <h3 className="text-lg font-bold text-orange-900 dark:text-orange-200 leading-tight truncate font-display">
                                {isOthersGroup ? 'Itens Avulsos' : responsibleName}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className={`material-symbols-outlined text-orange-900/40 dark:text-orange-300/40 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </div>
                    </div>
                ) : isRecipeGroup ? (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600/60 dark:text-orange-400/60">
                                Sugestão ChecklistIA
                            </span>
                            <div className="flex items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={(e) => handleActionClick(e, () => onShowRecipe(recipeName))}
                                    className="flex items-center justify-center h-8 px-4 bg-primary text-white font-black rounded-full hover:bg-primary-hover shadow-md shadow-primary/20 transition-all z-10 text-[10px] uppercase tracking-widest active:scale-95"
                                >
                                    <span>Ver Receita</span>
                                </button>
                                
                                <span className={`material-symbols-outlined text-orange-900/40 dark:text-orange-300/40 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-orange-900 dark:text-orange-200 leading-tight break-words pr-2 font-display capitalize">
                            {recipeName}
                        </h3>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-lg font-bold leading-normal text-orange-900 dark:text-orange-300 flex-1 truncate font-display">{groupName}</p>
                        
                        <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-orange-900/40 dark:text-orange-300/40 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </div>
                    </div>
                )}
            </div>
            
            {isOpen && (
                <div className="px-5 pb-4 bg-white dark:bg-surface-dark">
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {items.map((item) => (
                            <ShoppingListItem
                                key={item.id}
                                item={item}
                                onDelete={onDeleteItem}
                                onEdit={onStartEdit}
                                onTogglePurchased={onTogglePurchased}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export const ShoppingList: React.FC<ShoppingListProps> = ({
  groupedItems,
  onDeleteItem,
  onDeleteGroup,
  onStartEdit,
  onShowRecipe,
  onTogglePurchased,
}) => {
  if (Object.keys(groupedItems).length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-white dark:bg-surface-dark rounded-3xl shadow-sm border border-dashed border-gray-200 dark:border-gray-800">
        <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-gray-300 text-4xl">inventory_2</span>
        </div>
        <p className="text-slate-500 dark:text-text-muted-dark font-medium">Sua lista está pronta para ser preenchida.</p>
        <p className="text-xs text-slate-400 dark:text-text-muted-dark/60 mt-2">Toque no botão central para começar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 relative z-10">
      {Object.entries(groupedItems).map(([groupName, itemsInGroup]) => (
        <ShoppingListGroup
            key={groupName}
            groupName={groupName}
            items={itemsInGroup}
            onDeleteItem={onDeleteItem}
            onDeleteGroup={onDeleteGroup}
            onStartEdit={onStartEdit}
            onShowRecipe={onShowRecipe}
            onTogglePurchased={onTogglePurchased}
        />
      ))}
    </div>
  );
};
