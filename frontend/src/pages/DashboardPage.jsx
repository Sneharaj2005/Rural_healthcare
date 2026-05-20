import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import {
  FaRobot, FaMapMarkerAlt,
  FaSyringe, FaBaby, FaArrowRight
} from 'react-icons/fa'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()

  const modules = [
    {
      to: '/ai-chat',
      title: t('dashboard.modules.aiChat.title'),
      description: t('dashboard.modules.aiChat.desc'),
      icon: FaRobot,
      color: 'bg-blue-500', lightColor: 'bg-blue-50',
      hoverColor: 'hover:border-blue-200 hover:shadow-blue-100', textColor: 'text-blue-600'
    },
    {
      to: '/clinic-finder',
      title: t('dashboard.modules.clinic.title'),
      description: t('dashboard.modules.clinic.desc'),
      icon: FaMapMarkerAlt,
      color: 'bg-teal-500', lightColor: 'bg-teal-50',
      hoverColor: 'hover:border-teal-200 hover:shadow-teal-100', textColor: 'text-teal-600'
    },
    {
      to: '/vaccination',
      title: t('dashboard.modules.vaccination.title'),
      description: t('dashboard.modules.vaccination.desc'),
      icon: FaSyringe,
      color: 'bg-purple-500', lightColor: 'bg-purple-50',
      hoverColor: 'hover:border-purple-200 hover:shadow-purple-100', textColor: 'text-purple-600'
    },
    {
      to: '/maternal',
      title: t('dashboard.modules.maternal.title'),
      description: t('dashboard.modules.maternal.desc'),
      icon: FaBaby,
      color: 'bg-rose-500', lightColor: 'bg-rose-50',
      hoverColor: 'hover:border-rose-200 hover:shadow-rose-100', textColor: 'text-rose-600'
    }
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <div className="bg-gradient-to-r from-primary-600 to-teal-500 rounded-3xl p-8 sm:p-10 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">
            {t('dashboard.welcomeBack')}, {user?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-primary-50 max-w-xl text-lg leading-relaxed">
            {t('dashboard.subtitle')}
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute right-20 bottom-0 w-40 h-40 bg-black opacity-5 rounded-full blur-2xl transform translate-y-1/2"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map(({ to, title, description, icon: Icon, lightColor, hoverColor, textColor }) => (
          <Link
            key={to}
            to={to}
            className={`group flex flex-col justify-between bg-white border border-gray-100 rounded-3xl p-6 shadow-sm transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${hoverColor}`}
          >
            <div>
              <div className={`w-14 h-14 rounded-2xl ${lightColor} ${textColor} flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <Icon />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">{description}</p>
            </div>
            
            <div className="flex items-center text-sm font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">
              {t('nav.accessService')}
              <FaArrowRight className={`ml-2 transform group-hover:translate-x-1 transition-transform ${textColor}`} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
