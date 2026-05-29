'use client'

import { createContext, useContext, useState } from 'react'

type Role = 'ellen' | 'emile' | 'jason' | 'customer'

type RoleContextType = {
  role: Role
  setRole: (role: Role) => void
}

const RoleContext = createContext<RoleContextType>({
  role: 'ellen',
  setRole: () => {},
})

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('ellen')
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}