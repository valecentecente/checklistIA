
import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useShoppingList } from '../../contexts/ShoppingListContext';

import { PWAInstallPrompt } from '../PWAInstallPrompt';
import { ToolsGridModal } from './ToolsGridModal';
import { OnboardingTourModal } from '../OnboardingTourModal';
import { ProductDetailsModal } from '../ProductDetailsModal';
import { AddItemForm } from '../AddItemForm';
import { EditItemForm } from '../EditItemForm';
import { RecipeAssistant } from '../RecipeAssistant';
import { BudgetForm } from '../BudgetTracker';
import { RecipeModal } from '../RecipeModal';
import { DuplicateItemModal } from '../DuplicateItemModal';
import { CalculatorModal } from '../CalculatorModal';
import { ThemeRecipesModal } from '../ThemeRecipesModal';
import { FavoriteRecipesModal } from '../FavoriteRecipesModal';
import { OffersModal } from '../OffersModal';
import { AdminOffersModal } from '../AdminOffersModal';
import { AdminReviewsModal } from '../AdminReviewsModal';
import { SavePurchaseModal } from '../SavePurchaseModal';
import { HistoryModal } from '../HistoryModal';
import { AuthModal } from '../AuthModal';
import { ProfileModal } from '../ProfileModal';
import { ThemeModal } from '../ThemeModal';
import { SharedListImportModal } from '../SharedListImportModal';
import { ReceivedListNotificationModal } from '../ReceivedListNotificationModal';
import { FeedbackModal } from '../FeedbackModal';
import { ShareListModal } from '../ShareListModal';
import { RecipeDecisionModal } from '../RecipeDecisionModal';
import { SupportInfoModal } from '../SupportInfoModal';
import { DistributionModal } from '../DistributionModal';
import { ManageTeamModal } from './ManageTeamModal';
import { AdminInviteModal } from './AdminInviteModal';
import { TeamReportsModal } from './TeamReportsModal';
import { ArcadeModal } from '../arcade/ArcadeModal'; 
import { UnitConverterModal } from '../UnitConverterModal';
import { AdminContentFactoryModal } from '../AdminContentFactoryModal';
import { RecipeSelectionModal } from '../RecipeSelectionModal'; 
import { AdminUsersModal } from './AdminUsersModal';
import { AdminHubModal } from './AdminHubModal';

interface AppModalsProps {
    sharedListData: any;
    isImportingShare: boolean;
    isDistributionModalOpen: boolean;
    closeDistributionModal: () => void;
    handleShare: () => Promise<void>;
    handleAddItem: (item: any) => Promise<void>;
    editingItem: any;
    handleSavePurchase: (name: string) => void;
    handleFinishWithoutSaving: () => void;
    handleRepeatPurchase: (purchase: any) => void;
    handleAddHistoricItem: (item: any) => void;
    handleImportSharedList: () => void;
    handleStartShopping: (name: string) => void;
    handleShareAndStart: (name: string) => void;
    handleAddToCurrentList: () => void;
    handleStartNewListForRecipe: () => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
    sharedListData,
    isImportingShare,
    isDistributionModalOpen,
    closeDistributionModal,
    handleShare,
    handleAddItem,
    editingItem,
    handleSavePurchase,
    handleFinishWithoutSaving,
    handleRepeatPurchase,
    handleAddHistoricItem,
    handleImportSharedList,
    handleShareAndStart,
    handleAddToCurrentList,
    handleStartNewListForRecipe
}) => {
    const app = useApp();
    const { user, login, authError } = useAuth();
    const { history, formatCurrency, deleteItem, updateItem } = useShoppingList();

    return (
        <>
            {app.installPromptEvent && app.isPWAInstallVisible && <PWAInstallPrompt onInstall={app.handleInstall} onDismiss={app.handleDismissInstall} />}
            <ToolsGridModal />
            <OnboardingTourModal isOpen={app.isTourModalOpen} onClose={() => app.closeModal('Tour')} />
            <ProductDetailsModal /> 
            <AddItemForm isOpen={app.isAddItemModalOpen} onClose={() => app.closeModal('addItem')} onAddItem={handleAddItem} />
            <EditItemForm isOpen={!!app.editingItemId} onClose={app.cancelEdit} onUpdate={updateItem} onDeleteItem={deleteItem} item={editingItem} />
            
            {app.isRecipeAssistantModalOpen && (
                <RecipeAssistant 
                    onClose={() => app.closeModal('recipeAssistant')} 
                    onFetchDetails={(name) => app.handleRecipeSearch(name)} 
                    isLoading={app.isSearchingAcervo} 
                    error={app.recipeError} 
                />
            )}
            
            <BudgetForm isOpen={app.isBudgetModalOpen} onClose={() => app.closeModal('budget')} currentBudget={app.budget} onSetBudget={app.setBudget} onClearBudget={app.clearBudget} />
            {app.selectedRecipe && <RecipeModal recipe={app.selectedRecipe} onClose={app.closeRecipe} onImageGenerated={app.handleRecipeImageGenerated} />}
            {app.duplicateInfo && <DuplicateItemModal {...app.duplicateInfo} />}
            <CalculatorModal isOpen={app.isCalculatorModalOpen} onClose={() => app.closeModal('calculator')} />
            <UnitConverterModal isOpen={app.isUnitConverterModalOpen} onClose={() => app.closeModal('converter')} /> 
            <ThemeRecipesModal />
            <RecipeSelectionModal /> 
            <FavoriteRecipesModal isOpen={app.isFavoritesModalOpen} onClose={() => app.closeModal('favorites')} />
            <OffersModal isOpen={app.isOffersModalOpen} onClose={() => app.closeModal('offers')} />
            
            <AdminHubModal />
            <AdminOffersModal isOpen={app.isAdminModalOpen} onClose={() => app.closeModal('admin')} />
            <AdminReviewsModal isOpen={app.isAdminReviewsModalOpen} onClose={() => app.closeModal('adminReviews')} />
            <AdminContentFactoryModal /> 
            <ManageTeamModal />
            <AdminInviteModal />
            <TeamReportsModal />
            <AdminUsersModal />
            
            <ArcadeModal />
            
            <SavePurchaseModal 
                isOpen={app.isSavePurchaseModalOpen} 
                onClose={() => app.closeModal('savePurchase')} 
                onSave={handleSavePurchase} 
                onFinishWithoutSaving={handleFinishWithoutSaving} 
                isLoggedIn={!!user}
                onLoginRequest={() => { 
                    sessionStorage.setItem('pending_save_purchase', 'true');
                    app.closeModal('savePurchase'); 
                    app.openModal('auth'); 
                }}
                initialMarketName={app.currentMarketName}
            />
            <HistoryModal isOpen={app.isHistoryModalOpen} onClose={() => app.closeModal('history')} history={history} onRepeatPurchase={handleRepeatPurchase} onAddItem={handleAddHistoricItem} formatCurrency={formatCurrency} />
            <AuthModal isOpen={app.isAuthModalOpen} onClose={() => app.closeModal('auth')} onLogin={login} error={authError} />
            <ProfileModal isOpen={app.isProfileModalOpen} onClose={() => app.closeModal('profile')} />
            <ThemeModal isOpen={app.isThemeModalOpen} onClose={() => app.closeModal('theme')} />
            <SharedListImportModal isOpen={app.isSharedListModalOpen} onClose={() => app.closeModal('sharedList')} onImport={handleImportSharedList} listData={sharedListData} isLoading={isImportingShare} />
            <ReceivedListNotificationModal />
            <FeedbackModal isOpen={app.isFeedbackModalOpen} onClose={() => app.closeModal('feedback')} />
            <ShareListModal isOpen={app.isShareListModalOpen} onClose={() => app.closeModal('shareList')} />
            
            <RecipeDecisionModal 
                isOpen={app.isRecipeDecisionModalOpen} 
                onClose={() => app.closeModal('recipeDecision')}
                currentMarketName={app.currentMarketName}
                onAddToCurrent={handleAddToCurrentList}
                onStartNew={handleStartNewListForRecipe}
            />

            <SupportInfoModal isOpen={app.isInfoModalOpen} onClose={() => app.closeModal('info')} />

            <DistributionModal
                isOpen={isDistributionModalOpen}
                onClose={closeDistributionModal}
                handleShare={handleShare}
                installPromptEvent={app.installPromptEvent}
                isPWAInstallVisible={app.isPWAInstallVisible}
                handleInstall={app.handleInstall}
                handleDismissInstall={app.handleDismissInstall}
            />
        </>
    );
};
