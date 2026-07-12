import { useState } from 'react'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Link2, BookOpen,
  ArrowLeft, ChevronUp, Menu, X, Sparkles
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/authStore'
import { VocariaLogo } from '@/components/ui/VocariaLogo'

const WORKSPACE_NAV = [
  {
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/agent/dashboard' },
    ],
  },
  {
    title: 'AGENT SETUP',
    items: [
      { label: 'Agents', icon: Users, path: '/agent/agents' },
    ],
  },
  {
    title: 'ACTIVITY',
    items: [
      { label: 'Agent Connections', icon: Link2, path: '/agent/connections' },
    ],
  },
  {
    title: 'CONNECT',
    items: [
      { label: 'Knowledge Base', icon: BookOpen, path: '/agent/knowledge-base' },
    ],
  },
]

function WorkspaceAvatar({ user }: { user: any }) {
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-200 shrink-0" />
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
      {user?.display_name?.charAt(0).toUpperCase() || 'U'}
    </div>
  )
}

export default function WorkspaceLayout() {
  const { user } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileSidebar, setMobileSidebar] = useState(false)

  const SidebarContent = () => {
    const activePath = WORKSPACE_NAV
      .flatMap(s => s.items)
      .map(i => i.path)
      .filter(p => location.pathname === p || location.pathname.startsWith(p + '/'))
      .sort((a, b) => b.length - a.length)[0]

    return (
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-[60px] shrink-0">
          <VocariaLogo size={30} withText={true} onClick={() => navigate('/agent/dashboard')} />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 space-y-1 scrollbar-hide">
          {WORKSPACE_NAV.map((section, sIdx) => (
            <div key={sIdx}>
              {section.title && (
                <div className="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 select-none">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = item.path === activePath

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileSidebar(false)}
                      className={clsx(
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-150',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className={clsx(
                          'shrink-0 transition-colors',
                          isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="shrink-0 border-t border-gray-100 px-3 py-3 space-y-3">
          {/* Back to Products */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-all"
          >
            <ArrowLeft size={16} className="text-gray-400" />
            <span>Back to Vocaria Products</span>
          </Link>

          {/* Plan Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-[14px] font-bold text-gray-900">Free Plan</div>
            <div className="mt-1 text-[12px] text-gray-500">
              <span className="font-semibold text-gray-700">0</span>/5,000 credits
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full w-[0%] rounded-full bg-indigo-500 transition-all" />
            </div>
            <button
              onClick={() => navigate('/billing')}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <Sparkles size={13} className="text-indigo-500" />
              Upgrade now
            </button>
          </div>

          {/* User */}
          <div className="flex items-center gap-3 px-2 py-1.5">
            <WorkspaceAvatar user={user} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-gray-500 truncate">{user?.plan_tier || 'Free'} Plan</div>
              <div className="text-[11px] text-gray-400 truncate">{user?.email || 'user'}</div>
            </div>
            <ChevronUp size={14} className="text-gray-400 rotate-180" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#fafbfc] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[240px] flex-col border-r border-gray-200 bg-white shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebar(false)}
              className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-[70] w-[280px] bg-white border-r border-gray-200 lg:hidden flex flex-col"
            >
              <div className="absolute right-3 top-4 z-10">
                <button
                  onClick={() => setMobileSidebar(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex lg:hidden items-center justify-between h-14 px-4 border-b border-gray-200 bg-white shrink-0">
          <button
            onClick={() => setMobileSidebar(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <Menu size={20} />
          </button>
          <VocariaLogo size={28} withText={true} />
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
