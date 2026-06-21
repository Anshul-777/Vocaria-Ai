import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Check, Zap, Shield, Mic2, Wand2, BarChart3, Key, Star, Lock, X } from 'lucide-react'
import { plansApi, getErrorMessage } from '@/api/client'
import { Reveal, StaggerGroup, StaggerItem, PlanBadge, Spinner } from '@/components/ui/shared'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const PLAN_FEATURES: Record<string, { icon: typeof Check; label: string }[]> = {
  free: [
    { icon: Mic2, label: '2 voice profiles' },
    { icon: Zap, label: '5 clone jobs / month' },
    { icon: Wand2, label: '10,000 characters / month' },
    { icon: Shield, label: '30 detection minutes / month' },
    { icon: BarChart3, label: '500 MB storage' },
  ],
  starter: [
    { icon: Mic2, label: '10 voice profiles' },
    { icon: Zap, label: '50 clone jobs / month' },
    { icon: Wand2, label: '100,000 characters / month' },
    { icon: Shield, label: '300 detection minutes / month' },
    { icon: BarChart3, label: '5 GB storage' },
    { icon: Key, label: 'API access (3 keys)' },
    { icon: Shield, label: 'Speaker diarization' },
    { icon: Star, label: 'Hub publishing' },
  ],
  pro: [
    { icon: Mic2, label: '50 voice profiles' },
    { icon: Zap, label: '500 clone jobs / month' },
    { icon: Wand2, label: '1,000,000 characters / month' },
    { icon: Shield, label: '3,000 detection minutes / month' },
    { icon: BarChart3, label: '50 GB storage' },
    { icon: Key, label: 'API access (10 keys)' },
    { icon: Zap, label: 'Fine-tuning mode' },
    { icon: Wand2, label: 'SSML support' },
    { icon: Shield, label: 'Priority queue' },
    { icon: Shield, label: 'Evidence export' },
  ],
  enterprise: [
    { icon: Check, label: 'Unlimited voice profiles' },
    { icon: Check, label: 'Unlimited clone jobs' },
    { icon: Check, label: 'Unlimited characters' },
    { icon: Check, label: 'Unlimited detection minutes' },
    { icon: Check, label: 'Unlimited storage' },
    { icon: Check, label: 'Unlimited API keys' },
    { icon: Check, label: 'Custom models' },
    { icon: Check, label: 'Dedicated support' },
    { icon: Check, label: 'SLA guarantee' },
  ],
}

const PLAN_META: Record<string, { name: string; monthly: number; yearly: number; color: string; accent: string }> = {
  free: { name: 'Free', monthly: 0, yearly: 0, color: 'var(--fg-3)', accent: 'var(--bg-3)' },
  starter: { name: 'Starter', monthly: 19, yearly: 190, color: 'var(--blue)', accent: 'var(--blue-soft)' },
  pro: { name: 'Pro', monthly: 79, yearly: 790, color: '#7c3aed', accent: 'rgba(124,58,237,0.08)' },
  enterprise: { name: 'Enterprise', monthly: 299, yearly: 2990, color: '#d97706', accent: 'rgba(217,119,6,0.08)' },
}

function UsageCircle({
  label, used, limit, unlimited = false,
}: {
  label: string; used: number; limit: number; unlimited?: boolean
}) {
  const pct = unlimited ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100)

  const getUnit = (lbl: string) => {
    const l = lbl.toLowerCase()
    if (l.includes('char')) return ' chars'
    if (l.includes('minute') || l.includes('detect')) return ' mins'
    if (l.includes('job') || l.includes('clone')) return ' jobs'
    if (l.includes('profile') || l.includes('voice')) return ' profiles'
    if (l.includes('storage')) return ' MB'
    return ''
  }

  const strokeColor = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : '#2563eb'

  const radius = 22
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="28"
            cy="28"
            r={radius}
            className="stroke-gray-100"
            strokeWidth="4"
            fill="transparent"
          />
          {!unlimited && (
            <motion.circle
              cx="28"
              cy="28"
              r={radius}
              stroke={strokeColor}
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute flex flex-col items-center justify-center mt-0.5">
          <span className="text-sm font-extrabold text-black tracking-tight leading-none">
            {unlimited ? '∞' : `${Math.round(pct)}%`}
          </span>
        </div>
      </div>

      <div className="text-center mt-3 w-full">
        <span className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest leading-none mb-1">{label}</span>
        <span className="block text-xs font-semibold text-gray-800 tabular-nums leading-none">
          {unlimited ? 'Unlimited' : `${used.toLocaleString()} / ${limit.toLocaleString()}${getUnit(label)}`}
        </span>
      </div>
    </div>
  )
}

export default function Billing() {
  const { user, refreshUser } = useAuthStore()
  const [planData, setPlanData] = useState<any>(null)
  const [allPlans, setAllPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')
  const currentTier = user?.plan_tier || 'free'

  // Mock payment gateway states
  const [checkoutTier, setCheckoutTier] = useState<string | null>(null)
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardName, setCardName] = useState('')
  const [paymentStep, setPaymentStep] = useState(0) // 0: form, 1: connecting, 2: processing, 3: finalizing
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false)

  useEffect(() => {
    Promise.all([
      plansApi.current().catch(() => null),
      plansApi.list().catch(() => ({ plans: [] })),
    ]).then(([curr, all]) => {
      setPlanData(curr)
      setAllPlans(all?.plans || [])
    }).finally(() => setLoading(false))
  }, [])

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length > 0) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`
    }
    return v
  }

  const handleUpgradeClick = (tier: string) => {
    if (tier === currentTier) return
    if (tier === 'free') {
      setShowDowngradeConfirm(true)
    } else {
      setCheckoutTier(tier)
      setCardNumber('')
      setCardExpiry('')
      setCardCvc('')
      setCardName('')
      setPaymentStep(0)
    }
  }

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
      toast.error('Please fill in all card details.')
      return
    }
    setIsProcessing(true)

    // Simulate step 1: Secure checkout session creation
    setPaymentStep(1)
    await new Promise(resolve => setTimeout(resolve, 800))

    // Simulate step 2: Charging card authorization
    setPaymentStep(2)
    await new Promise(resolve => setTimeout(resolve, 800))

    // Simulate step 3: Setting up entitlements in backend database
    setPaymentStep(3)
    await new Promise(resolve => setTimeout(resolve, 800))

    try {
      await plansApi.upgrade(checkoutTier!, cycle)
      toast.success(`Subscription upgraded to ${PLAN_META[checkoutTier!].name}!`)
      await refreshUser()
      const curr = await plansApi.current()
      setPlanData(curr)
      setCheckoutTier(null)
    } catch (e: any) {
      toast.error(getErrorMessage(e))
    } finally {
      setIsProcessing(false)
      setPaymentStep(0)
    }
  }

  const getCardClasses = (t: string, current: boolean) => {
    const base = "border rounded-2xl p-6 h-full flex flex-col relative overflow-hidden transition-all duration-300 shadow-sm cursor-pointer"
    if (current) {
      if (t === 'starter') return `${base} border-2 border-blue-600 bg-blue-50/5`
      if (t === 'pro') return `${base} border-2 border-purple-600 bg-purple-50/5`
      if (t === 'enterprise') return `${base} border-2 border-amber-600 bg-amber-50/5`
      return `${base} border-2 border-gray-600 bg-gray-50/5`
    } else {
      if (t === 'starter') return `${base} border-blue-200 hover:border-blue-500 bg-white hover:shadow-lg`
      if (t === 'pro') return `${base} border-purple-200 hover:border-purple-500 bg-white hover:shadow-lg`
      if (t === 'enterprise') return `${base} border-amber-200 hover:border-amber-500 bg-white hover:shadow-lg`
      return `${base} border-gray-200 hover:border-gray-400 bg-white hover:shadow-lg`
    }
  }

  const getButtonClasses = (t: string, current: boolean) => {
    const base = "w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 mb-6 flex items-center justify-center gap-2 border"
    if (current) {
      return `${base} bg-gray-50 border-gray-200 text-gray-400 cursor-default`
    }
    if (t === 'starter') {
      return `${base} bg-blue-600 border-transparent text-white hover:bg-blue-700 shadow-sm shadow-blue-200`
    }
    if (t === 'pro') {
      return `${base} bg-purple-600 border-transparent text-white hover:bg-purple-700 shadow-sm shadow-purple-200`
    }
    if (t === 'enterprise') {
      return `${base} bg-amber-600 border-transparent text-white hover:bg-amber-700 shadow-sm shadow-amber-200`
    }
    return `${base} bg-gray-900 border-transparent text-white hover:bg-black`
  }

  return (
    <div className="w-full space-y-10 pb-12">
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-2">
          <div>
            <div className="flex items-center gap-3"><CreditCard className="w-6 h-6 text-gray-800" /><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-500 animate-text-pan" style={{ fontFamily: 'Instrument Serif, serif' }}>Billing</h1></div>
            <p className="text-gray-500 font-medium mt-2 text-sm md:text-base">Manage your subscription, plan tiers, and monthly usage quotas.</p>
          </div>
        </div>
      </Reveal>

      {/* Current plan usage */}
      {planData?.usage && (
        <Reveal delay={0.04}>
          <div className="border border-gray-250 rounded-2xl bg-white shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Current Plan Usage</h3>
              <PlanBadge tier={currentTier} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(planData.usage).map(([key, val]: [string, any]) => {
                if (!val || typeof val !== 'object') return null
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                return <UsageCircle key={key} label={label} used={Math.round(val.used || 0)} limit={val.limit || 0} unlimited={val.unlimited} />
              })}
            </div>
          </div>
        </Reveal>
      )}

      {/* Billing cycle toggle */}
      <Reveal delay={0.06}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', background: 'var(--bg-3)', borderRadius: 10, padding: 3, gap: 2 }}>
            {(['monthly', 'yearly'] as const).map(c => (
              <button key={c} onClick={() => setCycle(c)}
                style={{ padding: '7px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.14s', background: cycle === c ? 'var(--bg)' : 'transparent', color: cycle === c ? 'var(--fg)' : 'var(--fg-4)', boxShadow: cycle === c ? 'var(--sh)' : 'none' }}>
                {c === 'monthly' ? 'Monthly' : 'Yearly'}
                {c === 'yearly' && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', marginLeft: 6, background: 'rgba(22,163,74,0.1)', padding: '1px 6px', borderRadius: 99 }}>-17%</span>}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Plan cards */}
      <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(['free', 'starter', 'pro', 'enterprise'] as const).map((tier, i) => {
          const meta = PLAN_META[tier]
          const features = PLAN_FEATURES[tier] || []
          const isCurrent = currentTier === tier && (tier === 'free' || cycle === (planData?.cycle || 'monthly'))
          const price = cycle === 'yearly' && meta.yearly > 0 ? meta.yearly : meta.monthly
          const unit = cycle === 'yearly' && meta.yearly > 0 ? '/yr' : '/mo'
          const isLoading = upgrading === tier

          return (
            <StaggerItem key={tier} className="h-full">
              <motion.div
                whileHover={{ y: -6, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={getCardClasses(tier, isCurrent)}
                onClick={() => handleUpgradeClick(tier)}
              >
                {tier === 'starter' && (
                  <div className="absolute top-0 right-0">
                    <span className="inline-block bg-blue-600 text-white text-[9px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                      Popular
                    </span>
                  </div>
                )}
                {tier === 'pro' && (
                  <div className="absolute top-0 right-0">
                    <span className="inline-block bg-purple-600 text-white text-[9px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                      Best Value
                    </span>
                  </div>
                )}
                {tier === 'enterprise' && (
                  <div className="absolute top-0 right-0">
                    <span className="inline-block bg-amber-600 text-white text-[9px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                      Enterprise
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{meta.name}</h4>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-black text-white uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-extrabold tracking-tight" style={{ color: meta.color }}>${price}</span>
                    <span className="text-sm font-semibold text-gray-400">{unit}</span>
                  </div>
                  {cycle === 'yearly' && meta.yearly > 0 && (
                    <div className="text-xs font-semibold text-green-600 mt-1">
                      Equivalent to ${Math.round(meta.yearly / 12)}/mo
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUpgradeClick(tier)
                  }}
                  disabled={isCurrent || isLoading}
                  className={getButtonClasses(tier, isCurrent)}
                >
                  {isLoading ? <Spinner size={14} /> : isCurrent ? 'Current Plan' : tier === 'free' ? 'Downgrade' : 'Upgrade'}
                </button>

                <div className="flex-1 flex flex-col gap-3.5">
                  {features.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5" style={{ background: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}>
                        <Check size={12} style={{ color: meta.color }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-600 leading-normal">{f.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </StaggerItem>
          )
        })}
      </StaggerGroup>

      <Reveal delay={0.12}>
        <div className="mt-6 p-5 bg-gray-50 border border-gray-150 rounded-2xl text-xs font-semibold text-gray-500 text-center leading-relaxed">
          All plans include SSL encryption, GDPR-compliant data handling, and 99.9% uptime SLA. Enterprise plans include custom billing and dedicated infrastructure.
          Questions? <a href="mailto:support@vocaria.ai" className="text-blue-600 hover:underline">Contact us</a>.
        </div>
      </Reveal>

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkoutTier && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-2xl overflow-hidden text-black flex flex-col relative"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white">
                    <Lock size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">Secure Checkout</h3>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Stripe Gateway Sandbox</p>
                  </div>
                </div>
                {!isProcessing && (
                  <button onClick={() => setCheckoutTier(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={20} />
                  </button>
                )}
              </div>

              {isProcessing ? (
                <div className="p-10 flex flex-col items-center justify-center text-center space-y-6 min-h-[320px]">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <Spinner size={48} color={PLAN_META[checkoutTier].color} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-extrabold text-base text-gray-900 animate-pulse">
                      {paymentStep === 1 && 'Establishing secure handshake...'}
                      {paymentStep === 2 && `Authorizing payment of $${cycle === 'yearly' ? PLAN_META[checkoutTier].yearly : PLAN_META[checkoutTier].monthly}...`}
                      {paymentStep === 3 && 'Provisioning features and quotas...'}
                    </p>
                    <p className="text-xs text-gray-400 font-semibold tracking-wide">
                      Please do not refresh or close this window.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitPayment} className="p-6 space-y-6">
                  {/* Order summary */}
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Plan Selected</p>
                      <p className="text-sm font-extrabold text-gray-800 mt-0.5">
                        {PLAN_META[checkoutTier].name} — {cycle === 'yearly' ? 'Yearly' : 'Monthly'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Due Today</p>
                      <p className="text-base font-extrabold text-black mt-0.5" style={{ color: PLAN_META[checkoutTier].color }}>
                        ${cycle === 'yearly' ? PLAN_META[checkoutTier].yearly : PLAN_META[checkoutTier].monthly}
                      </p>
                    </div>
                  </div>

                  {/* Payment form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">Cardholder Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors font-medium text-black placeholder-gray-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="4111 1111 1111 1111"
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors font-medium text-black placeholder-gray-300 bg-white"
                        />
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                          <CreditCard size={16} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">Expiry Date</label>
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors font-medium text-black placeholder-gray-300 bg-white text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">CVC</label>
                        <input
                          type="password"
                          required
                          placeholder="•••"
                          maxLength={4}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors font-medium text-black placeholder-gray-300 bg-white text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 animate-pulse hover:animate-none"
                      style={{ backgroundColor: PLAN_META[checkoutTier].color }}
                    >
                      <Lock size={14} /> Pay ${cycle === 'yearly' ? PLAN_META[checkoutTier].yearly : PLAN_META[checkoutTier].monthly}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutTier(null)}
                      className="w-full py-2.5 rounded-xl border border-gray-150 text-gray-500 hover:text-black hover:bg-gray-50 text-xs font-bold transition-colors mt-2"
                    >
                      Cancel Payment
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Downgrade Confirmation Modal */}
      <AnimatePresence>
        {showDowngradeConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl max-w-sm w-full border border-gray-200 shadow-2xl p-6 text-black"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Shield size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Downgrade to Free?</h3>
              </div>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Are you sure you want to downgrade? Your plan features and limits will be reduced immediately to the Free tier limits.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDowngradeConfirm(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowDowngradeConfirm(false)
                    setUpgrading('free')
                    try {
                      await plansApi.upgrade('free', 'monthly')
                      toast.success('Downgraded to Free plan')
                      await refreshUser()
                      const curr = await plansApi.current()
                      setPlanData(curr)
                    } catch (err) {
                      toast.error(getErrorMessage(err))
                    } finally {
                      setUpgrading(null)
                    }
                  }}
                  disabled={upgrading !== null}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {upgrading === 'free' ? <Spinner size={14} /> : 'Downgrade Plan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
