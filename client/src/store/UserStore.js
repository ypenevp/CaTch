import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { GetUserDetails } from '../app/services/userDetails.js'

const useUserStore = create((set) => ({
    user: null,

    fetchUser: async () => {
        try {
            const token = await AsyncStorage.getItem('access')
            if (token) {
                const userDetails = await GetUserDetails()
                set({ user: userDetails })
            } else {
                set({ user: null })
            }
        } catch (error) {
            console.error('Error loading user details:', error)
            set({ user: null })
        }
    },

    clearUser: () => set({ user: null }),
}))

export default useUserStore