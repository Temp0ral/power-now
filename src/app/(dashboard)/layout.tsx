'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Zap,
  ClipboardList,
  Calendar,
  FileText,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Generators', href: '/generators', icon: Zap },
  { label: 'Services', href: '/services', icon: ClipboardList },
  { label: 'Schedule', href: '/schedule', icon: Calendar },
  { label: 'Invoices', href: '/invoices', icon: FileText },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

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
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ label, href, icon: Icon }) => (
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
          <nav className="p-4 space-y-1">
            {navItems.map(({ label, href, icon: Icon }) => (
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