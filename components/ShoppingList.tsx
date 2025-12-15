

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
        <div className="flex flex-col rounded-xl shadow-sm overflow-hidden bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 transition-all">
            <div 
                className="cursor-pointer select-none p-4 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isResponsibleGroup || isOthersGroup ? (
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-orange-600/80 dark:text-orange-400/80 mb-0.5">
                                {isOthersGroup ? 'Não Atribuído' : 'Responsável:'}
                            </p>
                            <h3 className="text-lg font-bold text-orange-900 dark:text-orange-200 leading-tight truncate">
                                {isOthersGroup ? 'Itens sem dono' : responsibleName}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className={`material-symbols-outlined text-orange-900 dark:text-orange-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </div>
                    </div>
                ) : isRecipeGroup ? (
                    <div className="flex flex-col gap-1">
                        {/* Linha Superior: Label e Botões */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-orange-600/80 dark:text-orange-400/80">
                                Receita:
                            </span>
                            <div className="flex items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={(e) => handleActionClick(e, () => onShowRecipe(recipeName))}
                                    className="flex items-center justify-center h-8 w-8 sm:w-auto sm:px-3 sm:space-x-2 bg-orange-100 text-orange-800 font-semibold rounded-full hover:bg-orange-200 border border-orange-200/50 transition-colors z-10"
                                    title="Ver Receita"
                                >
                                    <RecipeBookIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline text-sm">Ver</span>
                                </button>
                                
                                <span className={`material-symbols-outlined text-orange-900 dark:text-orange-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                            </div>
                        </div>
                        
                        {/* Linha Inferior: Nome da Receita */}
                        <h3 className="text-lg font-bold text-orange-900 dark:text-orange-200 leading-tight break-words pr-2">
                            {recipeName}
                        </h3>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-base font-semibold leading-normal text-orange-900 dark:text-orange-300 flex-1 truncate">{groupName}</p>
                        
                        <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-orange-900 dark:text-orange-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </div>
                    </div>
                )}
            </div>
            
            {isOpen && (
                <div className="px-4 pb-2 bg-surface-light dark:bg-surface-dark">
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    {items.map((item, index) => (
                      <div key={item.id} className={index !== items.length - 1 ? "border-b border-orange-200 dark:border-gray-700" : ""}>
                        <ShoppingListItem
                            item={item}
                            onDelete={onDeleteItem}
                            onEdit={onStartEdit}
                            onTogglePurchased={onTogglePurchased}
                        />
                      </div>
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
      <div className="text-center py-10 px-4 bg-white rounded-xl shadow-sm dark:bg-surface-dark">
        <p className="text-slate-500 dark:text-text-muted-dark">Sua lista de compras está vazia.</p>
        <p className="text-sm text-slate-400 dark:text-text-muted-dark/80 mt-2">Adicione produtos usando o botão '+' abaixo.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
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