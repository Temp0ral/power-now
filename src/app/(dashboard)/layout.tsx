'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  ClipboardList,
  Calendar,
  FileText,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import { useRole } from '@/lib/role'

type Role = 'ellen' | 'emile' | 'jason' | 'customer'

const roleLabels: Record<Role, string> = {
  ellen: 'Ellen (Admin)',
  emile: 'Emile (Technician)',
  jason: 'Jason (Parts)',
  customer: 'Customer',
}

const navItems = [
  { label: 'Customers', href: '/customers', icon: Users, roles: ['ellen', 'jason'] },
  { label: 'Services', href: '/services', icon: ClipboardList, roles: ['ellen', 'emile'] },
  { label: 'Schedule', href: '/schedule', icon: Calendar, roles: ['ellen', 'emile'] },
  { label: 'Invoices', href: '/invoices', icon: FileText, roles: ['ellen'] },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const { role, setRole } = useRole()

  const visibleNavItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-black text-white">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-wide">
            POWER<span className="text-orange-500">NOW</span>
          </h1>
          <p className="text-xs text-gray-500 tracking-widest mt-1">GENERATORS</p>
        </div>

        {/* Role selector */}
        <div className="px-4 py-3 border-b border-gray-800 relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-800 px-3 py-2 rounded-lg transition-colors text-sm"
          >
            <span className="text-gray-300">{roleLabels[role]}</span>
            <ChevronDown size={16} className="text-gray-500" />
          </button>
          {roleDropdownOpen && (
            <div className="absolute left-4 right-4 top-14 bg-gray-900 rounded-lg shadow-xl z-50 overflow-hidden">
              {(Object.keys(roleLabels) as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r)
                    setRoleDropdownOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    role === r
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {visibleNavItems.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === href
                  ? 'bg-orange-500 text-white font-semibold'
                  : 'text-gray-400 hover:bg-gray-900 hover:text-white'
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black text-white flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h1 className="text-lg font-bold tracking-wide">
          POWER<span className="text-orange-500">NOW</span>
        </h1>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black text-white pt-16">
          {/* Mobile role selector */}
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Viewing as</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(roleLabels) as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                    role === r
                      ? 'bg-orange-500 text-white font-semibold'
                      : 'bg-gray-900 text-gray-300'
                  }`}
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          </div>
          <nav className="p-4 space-y-1">
            {visibleNavItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname === href
                    ? 'bg-orange-500 text-white font-semibold'
                    : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:p-8 p-4 mt-14 md:mt-0">
        {children}
      </main>

    </div>
  )
}