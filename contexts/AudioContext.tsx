import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

export type SoundType = 'success' | 'remove' | 'click' | 'login';

interface AudioContextType {
    isSoundEnabled: boolean;
    toggleSound: () => void;
    playSystemSound: (type: SoundType) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
        const stored = localStorage.getItem('isSoundEnabled');
        return stored !== 'false';
    });

    const playSystemSound = useCallback((type: SoundType) => {
        if (!isSoundEnabled) return;
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;

            if (type === 'success') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'remove') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'click') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'login') {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2); gain2.connect(ctx.destination);
                osc.type = 'sine';
                osc2.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc2.frequency.setValueAtTime(659.25, now);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
                gain2.gain.setValueAtTime(0, now);
                gain2.gain.linearRampToValueAtTime(0.07, now + 0.15);
                gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
                osc.start(now); osc2.start(now);
                osc.stop(now + 1.0); osc2.stop(now + 1.2);
            }
        } catch (e) {
            console.warn("Áudio não suportado ou bloqueado.");
        }
    }, [isSoundEnabled]);

    const toggleSound = useCallback(() => {
        setIsSoundEnabled(prev => {
            const next = !prev;
            localStorage.setItem('isSoundEnabled', String(next));
            return next;
        });
    }, []);

    return (
        <AudioContext.Provider value={{ isSoundEnabled, toggleSound, playSystemSound }}>
            {children}
        </AudioContext.Provider>
    );
};

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (context === undefined) throw new Error('useAudio must be used within an AudioProvider');
    return context;
};