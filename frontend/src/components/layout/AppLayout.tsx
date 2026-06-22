import { useEffect, useState } from 'react'
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic2, Wand2, Shield, Globe, BarChart3, CreditCard, History,
  Bell, FileText, Settings, LogOut, Menu, X, User,
  Zap, Search, Plus, Activity, FlaskConical, Star, Gauge, HelpCircle, Bot, Video
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import api, { notificationsApi } from '@/api/client'
import { VocariaLogo } from '@/components/ui/VocariaLogo'

const NAV_SECTIONS = [
  {
    items: [{ label: 'Dashboard', icon: Gauge, path: '/dashboard', hoverColor: 'hover:text-blue-600', hoverBg: 'hover:bg-blue-50' }],
  },
  {
    title: 'Create',
    items: [
      { label: 'Voice Profiles', icon: Mic2, path: '/voices', hoverColor: 'hover:text-green-600', hoverBg: 'hover:bg-green-50' },
      { label: 'Voice Studio', icon: Video, path: '/studio', tag: 'NEW', hoverColor: 'hover:text-red-600', hoverBg: 'hover:bg-red-50' },
      { label: 'Generate Voice', icon: Wand2, path: '/generate', tag: 'HOT', hoverColor: 'hover:text-orange-600', hoverBg: 'hover:bg-orange-50' },
      { label: 'Clone Voice', icon: Zap, path: '/clone', hoverColor: 'hover:text-purple-600', hoverBg: 'hover:bg-purple-50' },
      { label: 'Vocaria Agent', icon: Bot, path: '/agent', tag: 'AI', hoverColor: 'hover:text-indigo-600', hoverBg: 'hover:bg-indigo-50' },
    ],
  },
  {
    title: 'Deepfake Detection',
    items: [
      { label: 'Detection Lab', icon: Shield, path: '/detection', tag: '5-Model', hoverColor: 'hover:text-red-600', hoverBg: 'hover:bg-red-50' },
      { label: 'Live Detection', icon: Activity, path: '/detection/live', hoverColor: 'hover:text-rose-600', hoverBg: 'hover:bg-rose-50' },
    ],
  },
  {
    title: 'Community',
    items: [{ label: 'Vocaria Hub', icon: Globe, path: '/hub', hoverColor: 'hover:text-pink-600', hoverBg: 'hover:bg-pink-50' }],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Analytics', icon: BarChart3, path: '/analytics', hoverColor: 'hover:text-yellow-600', hoverBg: 'hover:bg-yellow-50' },
      { label: 'Benchmarks', icon: Star, path: '/benchmarks', hoverColor: 'hover:text-fuchsia-600', hoverBg: 'hover:bg-fuchsia-50' },
      { label: 'Quality Lab', icon: FlaskConical, path: '/quality', hoverColor: 'hover:text-cyan-600', hoverBg: 'hover:bg-cyan-50' },
      { label: 'History', icon: History, path: '/history', hoverColor: 'hover:text-slate-600', hoverBg: 'hover:bg-slate-50' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Audit Logs', icon: FileText, path: '/audit', hoverColor: 'hover:text-teal-600', hoverBg: 'hover:bg-teal-50' },
      { label: 'Billing', icon: CreditCard, path: '/billing', hoverColor: 'hover:text-emerald-600', hoverBg: 'hover:bg-emerald-50' },
      { label: 'Settings', icon: Settings, path: '/settings', hoverColor: 'hover:text-gray-800', hoverBg: 'hover:bg-gray-100' },
    ],
  },
]

function Avatar({ user }: { user: any }) {
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt="" className="h-9 w-9 min-w-[36px] min-h-[36px] shrink-0 rounded-full object-cover ring-2 ring-gray-200" />
  }

  return (
    <div className="flex h-9 w-9 min-w-[36px] min-h-[36px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-black to-gray-800 text-white font-bold text-sm shadow-sm ring-2 ring-gray-200">
      {user?.display_name?.charAt(0).toUpperCase() || 'U'}
    </div>
  )
}



export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Sidebar defaults to closed
  const [collapsed, setCollapsed] = useState(true)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return

      try {
        const res = await notificationsApi.list({ unread_only: true })
        setUnreadCount(res.unread_count || 0)
      } catch (err) {
        console.error("Failed to fetch notifications:", err)
      }
    }
    fetchUnread()
  }, [location.pathname])

  const SidebarInner = ({ isMobile = false }: { isMobile?: boolean }) => {
    const isCollapsed = !isMobile && collapsed;

    // Find the most specific active path
    const activePath = NAV_SECTIONS
      .flatMap(s => s.items)
      .map(i => i.path)
      .filter(p => location.pathname === p || location.pathname.startsWith(p + '/'))
      .sort((a, b) => b.length - a.length)[0];

    return (
      <div className="flex h-full flex-col overflow-hidden py-4">
        <nav className="flex-1 overflow-y-auto px-3 space-y-6 scrollbar-hide">
          {NAV_SECTIONS.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.title && !isCollapsed && (
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {section.title}
                </div>
              )}
              {section.title && isCollapsed && <div className="mx-4 my-3 h-px bg-gray-100" />}

              <div className="space-y-1">
                {section.items.map((item: any, idx: number) => {
                  const Icon = item.icon
                  const isActive = item.path === activePath;

                  return (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 + 0.1 }}
                    >
                      <NavLink
                        to={item.path}
                        end={item.path === '/dashboard'}
                        onClick={(e) => {
                          if (location.pathname === item.path) {
                            e.preventDefault();
                          }
                          if (isMobile) setMobileSidebar(false);
                        }}
                        className={({ isActive }) => clsx(
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                          isActive ? 'bg-gray-100 text-black shadow-sm' : `text-gray-500 ${item.hoverBg} ${item.hoverColor}`,
                        )}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={clsx('shrink-0 transition-transform duration-200 group-hover:scale-110', isActive ? 'text-black' : 'text-gray-400 group-hover:text-inherit')} />

                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              className="flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap overflow-hidden"
                            >
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              {item.tag && (
                                <span className={clsx(
                                  "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white",
                                  item.tag === 'HOT' ? "bg-orange-500" : "bg-black"
                                )}>
                                  {item.tag}
                                </span>
                              )}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </NavLink>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 mt-4 space-y-1 border-t border-gray-100 pt-4 px-3">
          <Link
            to="/profile"
            className={clsx(
              "flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-gray-50 overflow-hidden",
              isCollapsed ? "justify-center px-0" : "px-3"
            )}
            title={isCollapsed ? "Profile" : undefined}
          >
            <Avatar user={user} />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 whitespace-nowrap overflow-hidden flex flex-col"
                >
                  <span className="text-sm font-bold text-gray-900 truncate max-w-[120px]">{user?.display_name || 'User'}</span>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">{user?.plan_tier || 'FREE'} PLAN</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          <button
            onClick={async () => {
              await logout();
            }}
            className={clsx(
              "w-full flex items-center gap-3 rounded-xl py-2.5 text-sm font-bold text-red-500 transition-all duration-200 hover:bg-red-50 hover:text-red-700 group overflow-hidden",
              isCollapsed ? "justify-center px-0" : "px-3"
            )}
            title={isCollapsed ? "Sign out" : undefined}
          >
            <LogOut size={18} className="shrink-0 transition-transform duration-200 group-hover:-translate-x-1" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Sign out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white text-black font-sans selection:bg-black selection:text-white">

      {/* Global Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-4 sm:px-6 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="relative w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors hidden lg:flex text-gray-600 hover:text-black overflow-hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={collapsed ? 'menu' : 'close'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {collapsed ? <Menu size={20} /> : <X size={20} />}
              </motion.div>
            </AnimatePresence>
          </button>
          <button
            onClick={() => setMobileSidebar(true)}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors lg:hidden text-gray-600 hover:text-black"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center">
            <VocariaLogo onClick={() => navigate('/dashboard')} withText={true} />
          </div>
        </div>

        {/* Center: Essential Navigation Links */}
        <div className="flex-1 hidden lg:flex items-center justify-center gap-8 xl:gap-12">
          {[
            { label: 'Dashboard', path: '/dashboard', color: 'bg-[#3b82f6]' },
            { label: 'My Voices', path: '/voices', color: 'bg-[#10b981]' },
            { label: 'Analysis', path: '/analytics', color: 'bg-[#eab308]' },
            { label: 'Clone', path: '/clone', color: 'bg-[#8b5cf6]' },
            { label: 'Detection', path: '/detection', color: 'bg-[#ef4444]' },
            { label: 'Studio', path: '/studio', color: 'bg-[#f43f5e]' },
            { label: 'Community', path: '/hub', color: 'bg-[#ec4899]' },
            { label: 'Models', path: '/benchmarks', color: 'bg-[#f97316]' },
          ].map(link => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={(e) => {
                if (location.pathname === link.path) {
                  e.preventDefault();
                }
              }}
              className={({ isActive }) => clsx(
                "group relative text-[14.5px] font-bold transition-colors py-2",
                isActive ? "text-black" : "text-gray-400 hover:text-black"
              )}
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  <span className={clsx(
                    "absolute -bottom-[2px] left-1/2 h-[3px] -translate-x-1/2 rounded-full transition-all duration-300",
                    isActive ? "w-[120%] opacity-100" : "w-0 opacity-0 group-hover:w-[120%] group-hover:opacity-100",
                    link.color
                  )} />
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <motion.button
            onClick={() => navigate('/generate')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="hidden sm:flex items-center gap-2 h-10 px-5 bg-black text-white rounded-full text-sm font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={16} /> Generate
          </motion.button>

          <motion.button
            onClick={() => navigate('/notifications')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 text-gray-500 hover:text-black transition-colors rounded-full hover:bg-gray-100"
          >
            <Bell size={20} />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-black border-2 border-white"
                />
              )}
            </AnimatePresence>
          </motion.button>

          <div className="hidden sm:block w-px h-6 bg-gray-200 mx-1"></div>

          <button onClick={() => navigate('/profile')} className="hover:opacity-80 transition-opacity ml-1">
            <Avatar user={user} />
          </button>
        </div>
      </header>

      {/* Body Area (below fixed header) */}
      <div className="flex w-full h-full pt-16">

        {/* Desktop Sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 76 : 245 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="hidden lg:flex flex-col border-r border-gray-200 bg-white overflow-hidden relative z-40"
        >
          <SidebarInner />
        </motion.aside>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {mobileSidebar && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileSidebar(false)}
                className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="fixed left-0 top-0 bottom-0 z-[70] w-[280px] border-r border-gray-200 bg-white lg:hidden flex flex-col"
              >
                {/* Mobile Sidebar Header */}
                <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200">
                  <VocariaLogo onClick={() => { }} />
                  <button
                    onClick={() => setMobileSidebar(false)}
                    className="p-2 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <SidebarInner isMobile={true} />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full w-full"
          >
            <Outlet />
          </motion.div>
        </main>

      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
