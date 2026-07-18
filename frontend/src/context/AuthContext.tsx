import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../types'
import api from '../services/api'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('inprint_token')
    const savedUser = localStorage.getItem('inprint_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('inprint_token', data.token)
    localStorage.setItem('inprint_user', JSON.stringify(data.user))
  }

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone })
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('inprint_token', data.token)
    localStorage.setItem('inprint_user', JSON.stringify(data.user))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('inprint_token')
    localStorage.removeItem('inprint_user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
