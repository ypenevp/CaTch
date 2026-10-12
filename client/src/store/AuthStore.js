import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const useAuthStore = create((set) => ({
    user: null,
    isLoading: true,

    checkToken: async () => {
        try {
            const token = await AsyncStorage.getItem('access')
            if (token) {
                set({ user: { token } })
            } else {
                set({ user: null })
            }
        } catch (error) {
            console.error('Error checking token:', error)
            set({ user: null })
        } finally {
            set({ isLoading: false })
        }
    },

    login: async (userData) => {
        try {
            await AsyncStorage.setItem('access', userData.token)
        } catch (e) {
            console.error('Error saving token:', e)
        }
        set({ user: userData })
    },

    logout: async () => {
        try {
            await AsyncStorage.removeItem('access')
        } catch (e) {
            console.error('Error removing token:', e)
        }
        set({ user: null })
    },
}))

export default useAuthStore