import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { handleRefresh, handleLogout } from '../services/auth.js'
import { queryClient } from '@/lib/queryClient'

const saveTokens = async ({ accessToken, refreshToken }) => {
    await AsyncStorage.multiSet([
        ['accessToken', accessToken],
        ['refreshToken', refreshToken],
    ])
}

const clearTokens = async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken'])
}

const useAuthStore = create((set, get) => ({
    user: null,
    isLoading: true,

    checkToken: async () => {
        try {
            const refreshToken = await AsyncStorage.getItem('refreshToken')
            if (!refreshToken) {
                set({ user: null })
                return
            }

            const result = await handleRefresh({ refreshToken })
            if (result.ok) {
                await saveTokens(result.data)
                set({ user: result.data })
            } else {
                await clearTokens()
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
            await saveTokens(userData)
        } catch (e) {
            console.error('Error saving tokens:', e)
        }
        set({ user: userData })
    },

    refresh: async () => {
        const refreshToken = get().user?.refreshToken
        if (!refreshToken) return null

        const result = await handleRefresh({ refreshToken })
        if (result.ok) {
            await saveTokens(result.data)
            set({ user: result.data })
            return result.data.accessToken
        }

        await clearTokens()
        queryClient.clear()
        set({ user: null })
        return null
    },

    logout: async () => {
        const refreshToken = get().user?.refreshToken
        if (refreshToken) await handleLogout({ refreshToken })

        try {
            await clearTokens()
        } catch (e) {
            console.error('Error removing tokens:', e)
        }
        queryClient.clear()
        set({ user: null })
    },
}))

export default useAuthStore
