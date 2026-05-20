import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  FaHeart, FaPlus, FaCalendarAlt, FaTint,
  FaUtensils, FaLightbulb, FaExclamationTriangle,
  FaStethoscope, FaBaby
} from 'react-icons/fa'
import api from '../lib/axios'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function MaternalCarePage() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  
  // Queries
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['maternal-dashboard'],
    queryFn: async () => {
      try {
        const res = await api.get('/maternal/dashboard')
        return res.data
      } catch (err) {
        // 404 means no profile yet — return null instead of throwing
        if (err.response?.status === 404) return null
        throw err
      }
    },
    retry: false
  })

  // Mutations
  const createProfileMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/maternal/profile', data)
      return res.data
    },
    onSuccess: () => {
      toast.success(t('maternal.toastProfileCreated'))
      queryClient.invalidateQueries({ queryKey: ['maternal-dashboard'] })
    },
    onError: (err) => {
      const detail = err.response?.data?.detail || err.response?.data?.message
      if (Array.isArray(detail)) {
        // Pydantic validation errors
        const msg = detail.map(e => e.msg || e.message).join(', ')
        toast.error('Validation error: ' + msg)
      } else {
        toast.error(detail || t('maternal.toastProfileCreateFail'))
      }
    }
  })

  const logWaterMutation = useMutation({
    mutationFn: async (data) => {
      // requires profile_id, we can get it from dashboard
      const res = await api.post(`/maternal/profile/${dashboard.profile.id}/water`, data)
      return res.data
    },
    onSuccess: () => {
      toast.success(t('maternal.toastWaterLogged'))
      queryClient.invalidateQueries({ queryKey: ['maternal-dashboard'] })
    }
  })

  const addVisitMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post(`/maternal/profile/${dashboard.profile.id}/visits`, data)
      return res.data
    },
    onSuccess: () => {
      toast.success(t('maternal.toastVisitAdded'))
      queryClient.invalidateQueries({ queryKey: ['maternal-dashboard'] })
    }
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <LoadingSpinner />
      </div>
    )
  }

  // No active profile — show setup form (404 or no data)
  if (!dashboard || (error && error.response?.status === 404)) {
    return <ProfileSetup onSubmit={(data) => createProfileMutation.mutate(data)} isPending={createProfileMutation.isPending} />
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 font-medium">{t('maternal.errorLoadDash')}</p>
        <p className="text-sm text-gray-500 mt-1">{t('maternal.errorCheckServer')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <FaBaby className="text-rose-500" /> {t('nav.maternal')}
      </h1>
      
      <WeekTracker weekInfo={dashboard.week_info} profile={dashboard.profile} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DailyTips tips={{ daily: dashboard.daily_tip, nutrition: dashboard.nutrition_tip }} />
        <WaterTracker 
          today={dashboard.today_water} 
          goal={dashboard.water_goal} 
          onLog={() => logWaterMutation.mutate({ 
            glasses: Math.min(dashboard.today_water + 1, 20), 
            date: new Date().toISOString().split('T')[0] 
          })} 
          isPending={logWaterMutation.isPending}
        />
      </div>

      <VisitsList 
        visits={dashboard.upcoming_visits} 
        onAddVisit={(data) => addVisitMutation.mutate(data)}
        isPending={addVisitMutation.isPending}
      />
      
      <WarningSigns signs={dashboard.week_info.warning_signs} />
    </div>
  )
}

// Subcomponents

function ProfileSetup({ onSubmit, isPending }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    lmp_date: '',
    mother_name: '',
    mother_age: 25,
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!formData.mother_name.trim()) errs.mother_name = 'Name is required.'
    const age = Number(formData.mother_age)
    if (!age || age < 10 || age > 60) errs.mother_age = 'Age must be between 10 and 60.'
    if (!formData.lmp_date) errs.lmp_date = 'LMP date is required.'
    else {
      const lmp = new Date(formData.lmp_date)
      const now = new Date()
      const diffDays = (now - lmp) / (1000 * 60 * 60 * 24)
      if (diffDays < 0) errs.lmp_date = 'LMP date cannot be in the future.'
      if (diffDays > 294) errs.lmp_date = 'LMP date seems too far in the past (max 42 weeks).'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      ...formData,
      mother_age: Number(formData.mother_age),
    })
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
      <div className="bg-rose-50 p-6 text-center">
        <FaHeart className="mx-auto text-4xl text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-800">{t('maternal.title')}</h2>
        <p className="text-sm text-gray-600 mt-1">{t('maternal.subtitle')}</p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('maternal.yourName')}</label>
          <input 
            type="text" required
            value={formData.mother_name}
            onChange={(e) => setFormData({...formData, mother_name: e.target.value})}
            className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-rose-200 outline-none transition ${errors.mother_name ? 'border-red-400' : ''}`}
            placeholder={t('maternal.placeholders.name')}
          />
          {errors.mother_name && <p className="text-xs text-red-500 mt-1">{errors.mother_name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('maternal.yourAge')}</label>
          <input 
            type="number" required min="10" max="60"
            value={formData.mother_age}
            onChange={(e) => setFormData({...formData, mother_age: e.target.value})}
            className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-rose-200 outline-none transition ${errors.mother_age ? 'border-red-400' : ''}`}
          />
          {errors.mother_age && <p className="text-xs text-red-500 mt-1">{errors.mother_age}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('maternal.lmp')}</label>
          <input 
            type="date" required
            value={formData.lmp_date}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setFormData({...formData, lmp_date: e.target.value})}
            className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-rose-200 outline-none transition ${errors.lmp_date ? 'border-red-400' : ''}`}
          />
          <p className="text-xs text-gray-500 mt-1">{t('maternal.lmpDesc')}</p>
          {errors.lmp_date && <p className="text-xs text-red-500 mt-1">{errors.lmp_date}</p>}
        </div>
        <button 
          type="submit" disabled={isPending}
          className="w-full bg-rose-500 text-white font-semibold py-3 rounded-xl hover:bg-rose-600 transition shadow-sm disabled:opacity-70 mt-6"
        >
          {isPending ? t('maternal.saving') : t('maternal.createProfile')}
        </button>
      </form>
    </div>
  )
}

function WeekTracker({ weekInfo, profile }) {
  const { t } = useTranslation()
  const progress = Math.min(100, Math.max(0, (profile.current_week / 40) * 100))
  
  return (
    <div className="bg-gradient-to-br from-rose-400 to-rose-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl">
        {weekInfo.baby_size_emoji}
      </div>
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-rose-100 font-medium tracking-wide uppercase text-sm mb-1">{t('maternal.trimester', { num: weekInfo.trimester })}</p>
          <h2 className="text-4xl font-extrabold mb-2">{t('maternal.week', { num: weekInfo.week })}</h2>
          <p className="text-rose-50 flex items-center gap-2">
            <span className="text-xl">{weekInfo.baby_size_emoji}</span>
            {t('maternal.babySize', { size: weekInfo.baby_size })}
          </p>
          <p className="mt-4 text-sm text-rose-100 max-w-sm leading-relaxed">
            {weekInfo.development}
          </p>
        </div>
        <div className="text-left md:text-right bg-white/20 backdrop-blur-sm rounded-2xl p-4 w-fit">
          <p className="text-xs text-rose-100 uppercase tracking-wider mb-1">{t('maternal.daysRemaining')}</p>
          <p className="text-3xl font-bold">{profile.days_remaining}</p>
          <p className="text-xs mt-1 opacity-80">{t('maternal.dueDate', { date: new Date(profile.due_date).toLocaleDateString() })}</p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-6">
        <div className="w-full bg-rose-900/30 rounded-full h-2">
          <div className="bg-white h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  )
}

function DailyTips({ tips }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FaLightbulb /></div>
          <h3 className="font-semibold text-blue-900">{t('maternal.dailyTip')}</h3>
        </div>
        <p className="text-sm text-blue-800 leading-relaxed">{tips.daily}</p>
      </div>
      <div className="bg-green-50 border border-green-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 text-green-600 rounded-lg"><FaUtensils /></div>
          <h3 className="font-semibold text-green-900">{t('maternal.nutritionGuide')}</h3>
        </div>
        <p className="text-sm text-green-800 leading-relaxed">{tips.nutrition}</p>
      </div>
    </div>
  )
}

function WaterTracker({ today, goal, onLog, isPending }) {
  const { t } = useTranslation()
  const percent = Math.min(100, Math.round((today / goal) * 100))
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden group">
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <FaTint className="text-teal-400" />
        <span className="font-semibold text-gray-700">{t('maternal.hydration')}</span>
      </div>
      
      <div className="relative w-32 h-32 mt-6 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle 
            cx="50" cy="50" r="45" fill="none" stroke="#2dd4bf" strokeWidth="8" 
            strokeDasharray="283" strokeDashoffset={283 - (283 * percent) / 100}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold text-teal-600">{today}</span>
          <span className="text-xs text-gray-500 uppercase tracking-wider">{t('maternal.glasses', { goal })}</span>
        </div>
      </div>
      
      <button 
        onClick={onLog} disabled={isPending}
        className="mt-6 bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium py-2 px-6 rounded-full transition flex items-center gap-2"
      >
        <FaPlus /> {isPending ? t('maternal.logging') : t('maternal.logGlass')}
      </button>
    </div>
  )
}

function VisitsList({ visits, onAddVisit, isPending }) {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ visit_date: '', visit_type: 'ANC', hospital: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    onAddVisit(formData)
    setShowForm(false)
    setFormData({ visit_date: '', visit_type: 'ANC', hospital: '' })
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><FaStethoscope /></div>
          <h3 className="font-bold text-gray-800 text-lg">{t('maternal.doctorVisits')}</h3>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 py-1.5 px-4 rounded-full transition font-medium"
        >
          {showForm ? t('maternal.cancel') : t('maternal.addVisit')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 p-4 rounded-xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('maternal.date')}</label>
              <input type="date" required value={formData.visit_date} onChange={e => setFormData({...formData, visit_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('maternal.type')}</label>
              <select value={formData.visit_type} onChange={e => setFormData({...formData, visit_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="ANC">{t('maternal.visitTypes.ANC')}</option>
                <option value="Ultrasound">{t('maternal.visitTypes.Ultrasound')}</option>
                <option value="Lab">{t('maternal.visitTypes.Lab')}</option>
                <option value="Other">{t('maternal.visitTypes.Other')}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('maternal.hospital')}</label>
              <input type="text" placeholder={t('maternal.placeholders.hospital')} value={formData.hospital} onChange={e => setFormData({...formData, hospital: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" />
            </div>
          </div>
          <button type="submit" disabled={isPending} className="w-full bg-purple-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-purple-700 transition">{t('maternal.saveVisit')}</button>
        </form>
      )}

      {visits && visits.length > 0 ? (
        <div className="space-y-3">
          {visits.map((visit, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-purple-200 transition">
              <div className="bg-purple-50 text-purple-600 w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0">
                <span className="text-xs font-bold uppercase">{new Date(visit.visit_date).toLocaleString('default', { month: 'short' })}</span>
                <span className="text-lg font-extrabold leading-none">{new Date(visit.visit_date).getDate()}</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">{t(`maternal.visitTypes.${visit.visit_type}`) || visit.visit_type}</h4>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <FaCalendarAlt /> {t('maternal.weekNumber', { num: visit.week_number })} {visit.hospital && `• ${visit.hospital}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-sm">{t('maternal.noVisits')}</p>
        </div>
      )}
    </div>
  )
}

function WarningSigns({ signs }) {
  const { t } = useTranslation()
  if (!signs || signs.length === 0) return null
  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <FaExclamationTriangle className="text-red-500" />
        <h3 className="font-bold text-red-800">{t('maternal.warningSigns')}</h3>
      </div>
      <ul className="space-y-2">
        {signs.map((sign, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-red-700">
            <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-400"></span>
            <span>{sign}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
