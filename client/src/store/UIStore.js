import { create } from 'zustand'

const useUIStore = create((set) => ({
    modal: null,

    openLogin:   () => set({ modal: 'login' }),
    openSignup:  () => set({ modal: 'signup' }),
    openVerify:  () => set({ modal: 'verify' }),
    openSuccess: () => set({ modal: 'success' }),
    closeModal:  () => set({ modal: null }),
}))

export default useUIStore