import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PrivacyState {
  showValues: boolean;
  toggleValues: () => void;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      showValues: true,
      toggleValues: () => set((state) => ({ showValues: !state.showValues })),
    }),
    {
      name: 'privacy-storage',
    }
  )
);
