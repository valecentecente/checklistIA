import React, { useState } from 'react';

interface OnboardingTourModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const tourSteps = [
    {
        icon: "waving_hand",
        title: "Bem-vindo ao ChecklistIA!",
        description: "Seu novo assistente de compras inteligente. Vamos conhecer os recursos principais rapidamente.",
    },
    {
        icon: "add_shopping_cart",
        title: "Adicione Itens Facilmente",
        description: "Use o botão '+' para adicionar produtos à sua lista, calcular preços por peso ou unidade e muito mais.",
    },
    {
        icon: "auto_awesome",
        title: "Deixe a IA Ajudar",
        description: "No menu de ferramentas (✨), você pode organizar a lista por corredor de mercado ou criar uma lista de compras completa a partir do nome de uma receita.",
    },
    {
        icon: "account_balance_wallet",
        title: "Controle seu Orçamento",
        description: "Também no menu de ferramentas, você pode definir um orçamento para sua compra e acompanhar seus gastos em tempo real.",
    },
    {
        icon: "rocket_launch",
        title: "Tudo Pronto!",
        description: "Você está pronto para fazer suas compras de um jeito mais inteligente. Boas compras!",
    }
];

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

    const step = tourSteps[currentStep];

    return (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4 animate-fadeIn" role="dialog" aria-modal="true">
            <div className="relative w-full max-w-sm flex-col text-center overflow-hidden rounded-xl bg-background-light dark:bg-surface-dark shadow-2xl p-8 animate-slideUp">
                <button 
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-medium px-2 py-1 rounded transition-colors"
                >
                    Pular
                </button>
                
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
                   <span className="material-symbols-outlined !text-4xl">{step.icon}</span>
                </div>
                <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">{step.title}</h2>
                <p className="mt-2 text-text-secondary-light dark:text-text-secondary-dark min-h-[72px]">
                    {step.description}
                </p>

                <div className="flex items-center justify-center space-x-2 mt-6 mb-6">
                    {tourSteps.map((_, index) => (
                        <div
                            key={index}
                            className={`h-2 w-2 rounded-full transition-all ${index === currentStep ? 'w-4 bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                        />
                    ))}
                </div>

                <div className="mt-6">
                     <button
                        onClick={handleNext}
                        className="flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-bold text-white shadow-lg transition-colors hover:bg-primary/90"
                    >
                        {currentStep === tourSteps.length - 1 ? 'Começar a Usar' : 'Próximo'}
                    </button>
                </div>
            </div>
        </div>
    );
};