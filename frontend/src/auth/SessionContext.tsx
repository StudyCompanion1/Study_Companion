import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react'
import {getUsage, type GuestUsage, type User} from './api'

//Checks for account type and, for guests, what remains of their usage amount for certain features.
type SessionValue = {
    isGuest: boolean
    usage: GuestUsage | null
    refreshUsage: () => Promise<void>
    goToSignUp: () => void
}

const SessionContext = createContext<SessionValue>({
    isGuest: false,
    usage: null,
    refreshUsage: async () => {},
    goToSignUp: () => {},
})

export function SessionProvider({user, onSignUp, children}: {user: User; onSignUp: () => void; children: ReactNode}) {
    const isGuest = user.role === 'guest'
    const [usage, setUsage] = useState<GuestUsage | null>(null)

    const refreshUsage = useCallback(async () => {
        if(!isGuest) return
        try {
            setUsage(await getUsage())
        } catch {
            // The server enforces the limits either way. This only keeps the on-screen counts fresh.
        }
    }, [isGuest])

    useEffect(() => {
        void refreshUsage()
    }, [refreshUsage])

    const value = useMemo(
        () => ({ isGuest, usage, refreshUsage, goToSignUp: onSignUp }),
        [isGuest, usage, refreshUsage, onSignUp],
    )

    return <SessionContext.Provider value = {value}>{children}</SessionContext.Provider>
}

export function useSession() {
    return useContext(SessionContext)
}