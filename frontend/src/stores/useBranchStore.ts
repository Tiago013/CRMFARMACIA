import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Branch {
  id: string;
  name: string;
  is_active: number;
}

interface BranchState {
  activeBranch: Branch | null;
  availableBranches: Branch[];
  setBranches: (branches: Branch[]) => void;
  setActiveBranch: (branchId: string) => void;
  clear: () => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      activeBranch: null,
      availableBranches: [],
      
      setBranches: (branches) => set((state) => {
        // If we have no active branch, or the active branch is no longer in the list, pick the first one
        const currentActive = state.activeBranch;
        const stillExists = currentActive && branches.some(b => b.id === currentActive.id);
        
        return {
          availableBranches: branches,
          activeBranch: stillExists ? currentActive : (branches.length > 0 ? branches[0] : null)
        };
      }),
      
      setActiveBranch: (branchId) => set((state) => {
        const branch = state.availableBranches.find(b => b.id === branchId);
        if (branch) {
          return { activeBranch: branch };
        }
        return state;
      }),
      
      clear: () => set({ activeBranch: null, availableBranches: [] })
    }),
    {
      name: 'farmaai-branch-storage',
    }
  )
);
