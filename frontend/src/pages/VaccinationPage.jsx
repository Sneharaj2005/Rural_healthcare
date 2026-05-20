import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import {
  FaPlus, FaChild, FaCheckCircle, FaExclamationCircle,
  FaClock, FaTrash,
  FaSyringe, FaTimes, FaEdit,
} from 'react-icons/fa'
import api from '../lib/axios'
import LoadingSpinner from '../components/common/LoadingSpinner'

// ── Status config generator ───────────────────────────────────────────────────
const getSTATUS = (t) => ({
  completed: { label: t('vaccination.statusDone'),     icon: FaCheckCircle,     cls: 'text-green-600 bg-green-50  border-green-200' },
  due:       { label: t('vaccination.statusDue'),      icon: FaExclamationCircle,cls: 'text-amber-600 bg-amber-50  border-amber-200' },
  overdue:   { label: t('vaccination.statusOverdue'),  icon: FaExclamationCircle,cls: 'text-red-600   bg-red-50    border-red-200'   },
  upcoming:  { label: t('vaccination.statusUpcoming'), icon: FaClock,            cls: 'text-blue-600  bg-blue-50   border-blue-200'  },
})

// ── Profile form modal ────────────────────────────────────────────────────────
function ProfileModal({ onClose, onSave, saving, initial }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(initial || {
    name: '', date_of_birth: '', gender: 'male', relation: 'child',
    blood_group: '', notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-slide-up">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {initial ? t('vaccination.editProfile') : t('vaccination.addChildPatient')}
          </h2>
          <button onClick={onClose} className="btn-icon"><FaTimes className="h-4 w-4" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('vaccination.fullName')}</label>
            <input required className="input-field" placeholder={t('vaccination.placeholders.name')}
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('vaccination.dob')}</label>
              <input required type="date" className="input-field"
                value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('vaccination.gender')}</label>
              <select className="input-field" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="male">{t('vaccination.genderMale')}</option>
                <option value="female">{t('vaccination.genderFemale')}</option>
                <option value="other">{t('vaccination.genderOther')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('vaccination.relation')}</label>
              <select className="input-field" value={form.relation} onChange={e => set('relation', e.target.value)}>
                <option value="child">{t('vaccination.relChild')}</option>
                <option value="self">{t('vaccination.relSelf')}</option>
                <option value="spouse">{t('vaccination.relSpouse')}</option>
                <option value="parent">{t('vaccination.relParent')}</option>
                <option value="sibling">{t('vaccination.relSibling')}</option>
                <option value="other">{t('vaccination.relOther')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('vaccination.bloodGroup')}</label>
              <select className="input-field" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
                <option value="">{t('vaccination.bgUnknown')}</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('vaccination.notes')}</label>
            <textarea rows={2} className="input-field resize-none" placeholder={t('vaccination.placeholders.notes')}
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t('vaccination.cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary gap-2">
              {saving && <LoadingSpinner size="sm" color="white" />}
              {initial ? t('vaccination.saveChanges') : t('vaccination.addProfile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Record form modal ─────────────────────────────────────────────────────────
function RecordModal({ onClose, onSave, saving }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    vaccine_name: '', dose_number: 1,
    date_given: new Date().toISOString().split('T')[0],
    given_by: '', facility: '', batch_number: '', notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-slide-up">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{t('vaccination.markGiven')}</h2>
          <button onClick={onClose} className="btn-icon"><FaTimes className="h-4 w-4" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('vaccination.vaccineName')}</label>
              <input required className="input-field" placeholder={t('vaccination.placeholders.vaccineName')}
                value={form.vaccine_name} onChange={e => set('vaccine_name', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('vaccination.doseNumber')}</label>
              <input type="number" min={1} max={10} className="input-field"
                value={form.dose_number} onChange={e => set('dose_number', +e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('vaccination.dateGiven')}</label>
              <input required type="date" className="input-field"
                value={form.date_given} onChange={e => set('date_given', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('vaccination.givenBy')}</label>
              <input className="input-field" placeholder={t('vaccination.placeholders.givenBy')}
                value={form.given_by} onChange={e => set('given_by', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('vaccination.facility')}</label>
              <input className="input-field" placeholder={t('vaccination.placeholders.facility')}
                value={form.facility} onChange={e => set('facility', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('vaccination.batchNumber')}</label>
            <input className="input-field" placeholder={t('vaccination.placeholders.optional')}
              value={form.batch_number} onChange={e => set('batch_number', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t('vaccination.cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary gap-2">
              {saving && <LoadingSpinner size="sm" color="white" />}
              {t('vaccination.saveRecord')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Schedule row ──────────────────────────────────────────────────────────────
function ScheduleRow({ item }) {
  const { t } = useTranslation()
  const STATUS = getSTATUS(t)
  const cfg = STATUS[item.status] || STATUS.upcoming
  const Icon = cfg.icon
  return (
    <div className={clsx(
      'flex items-center gap-3 rounded-xl border px-4 py-3',
      cfg.cls
    )}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          {item.vaccine_name}
          <span className="ml-1.5 text-xs font-normal text-gray-500">{t('vaccination.dose', { num: item.dose_number })}</span>
        </p>
        <p className="text-xs text-gray-500">
          {t('vaccination.dueAge', { age: item.due_age_text, date: item.due_date })}
          {item.given_date && <span className="ml-2 text-green-600">{t('vaccination.givenDate', { date: item.given_date })}</span>}
          {item.status === 'overdue' && item.days_until !== null &&
            <span className="ml-2 text-red-600">{t('vaccination.overdueDays', { days: Math.abs(item.days_until) })}</span>}
          {item.status === 'due' && item.days_until !== null && item.days_until >= 0 &&
            <span className="ml-2 text-amber-600">{t('vaccination.dueInDays', { days: item.days_until })}</span>}
        </p>
      </div>
      <span className={clsx(
        'flex-shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-semibold border',
        cfg.cls
      )}>
        {cfg.label}
      </span>
    </div>
  )
}

// ── Profile card ──────────────────────────────────────────────────────────────
function ProfileCard({ profile, onSelect, onDelete, onEdit, isSelected }) {
  const { t } = useTranslation()

  // Translate relation and age text if possible
  const relationMap = {
    'child': t('vaccination.relChild'),
    'self': t('vaccination.relSelf'),
    'spouse': t('vaccination.relSpouse'),
    'parent': t('vaccination.relParent'),
    'sibling': t('vaccination.relSibling'),
    'other': t('vaccination.relOther')
  }

  return (
    <div
      onClick={() => onSelect(profile.id)}
      className={clsx(
        'cursor-pointer rounded-2xl border p-4 transition-all duration-200',
        isSelected
          ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200'
          : 'border-gray-100 bg-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-lg">
            {profile.gender === 'female' ? '👧' : profile.gender === 'male' ? '👦' : '🧒'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{profile.name}</p>
            <p className="text-xs text-gray-500">{profile.age_text} · {relationMap[profile.relation] || profile.relation}</p>
            {profile.blood_group && (
              <span className="badge-red text-2xs mt-0.5">{profile.blood_group}</span>
            )}
          </div>
        </div>
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(profile)} className="btn-icon p-1.5">
            <FaEdit className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(profile.id)}
            className="btn-icon p-1.5 hover:bg-red-50 hover:text-red-500">
            <FaTrash className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VaccinationPage() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [selectedId,    setSelectedId]    = useState(null)
  const [showAddProfile,setShowAddProfile]= useState(false)
  const [editProfile,   setEditProfile]   = useState(null)
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [scheduleFilter,setScheduleFilter]= useState('all')

  // ── Queries ───────────────────────────────────────────────────────────────
  const profilesQ = useQuery({
    queryKey: ['vaccine-profiles'],
    queryFn:  () => api.get('/vaccination/profiles').then(r => r.data),
  })

  const scheduleQ = useQuery({
    queryKey: ['vaccine-schedule', selectedId],
    queryFn:  () => api.get(`/vaccination/profiles/${selectedId}/schedule`).then(r => r.data),
    enabled:  !!selectedId,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createProfile = useMutation({
    mutationFn: d => api.post('/vaccination/profiles', d).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['vaccine-profiles'] })
      setShowAddProfile(false)
      setSelectedId(data.id)
      toast.success(t('vaccination.toastProfileCreated'))
    },
    onError: () => toast.error(t('vaccination.toastProfileCreateFail')),
  })

  const updateProfile = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/vaccination/profiles/${id}`, d).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vaccine-profiles'] })
      setEditProfile(null)
      toast.success(t('vaccination.toastProfileUpdated'))
    },
    onError: () => toast.error(t('vaccination.toastProfileUpdateFail')),
  })

  const deleteProfile = useMutation({
    mutationFn: id => api.delete(`/vaccination/profiles/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['vaccine-profiles'] })
      if (selectedId === id) setSelectedId(null)
      toast.success(t('vaccination.toastProfileDeleted'))
    },
    onError: () => toast.error(t('vaccination.toastProfileDeleteFail')),
  })

  const addRecord = useMutation({
    mutationFn: d => api.post(`/vaccination/profiles/${selectedId}/records`, d).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vaccine-schedule', selectedId] })
      setShowAddRecord(false)
      toast.success(t('vaccination.toastRecordSaved'))
    },
    onError: () => toast.error(t('vaccination.toastRecordSaveFail')),
  })

  // ── Derived ───────────────────────────────────────────────────────────────
  const profiles = profilesQ.data?.profiles ?? []
  const schedule = scheduleQ.data

  const filteredSchedule = schedule?.schedule?.filter(item =>
    scheduleFilter === 'all' ? true : item.status === scheduleFilter
  ) ?? []

  const FILTER_TABS = [
    { id: 'all',       label: t('vaccination.filterAll'),      count: schedule?.total },
    { id: 'overdue',   label: t('vaccination.filterOverdue'),  count: schedule?.overdue,   cls: 'text-red-600' },
    { id: 'due',       label: t('vaccination.filterDue'),      count: schedule?.due,       cls: 'text-amber-600' },
    { id: 'upcoming',  label: t('vaccination.filterUpcoming'), count: schedule?.upcoming,  cls: 'text-blue-600' },
    { id: 'completed', label: t('vaccination.filterDone'),     count: schedule?.completed, cls: 'text-green-600' },
  ]

  return (
    <div className="page-content space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.vaccination')}</h1>
          <p className="mt-1 text-gray-500">{t('dashboard.modules.vaccination.desc')}</p>
        </div>
        <button onClick={() => setShowAddProfile(true)} className="btn-primary gap-2">
          <FaPlus className="h-3.5 w-3.5" />
          {t('vaccination.addProfile')}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Left: profiles list ── */}
        <div className="space-y-3">
          <h2 className="section-title">{t('vaccination.profiles')}</h2>
          {profilesQ.isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : profiles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center">
              <FaChild className="h-10 w-10 text-gray-200" />
              <p className="text-sm font-medium text-gray-600">{t('vaccination.noProfiles')}</p>
              <p className="text-xs text-gray-400">{t('vaccination.addFirstProfileMsg')}</p>
              <button onClick={() => setShowAddProfile(true)} className="btn-primary text-sm">
                {t('vaccination.addFirstProfileBtn')}
              </button>
            </div>
          ) : (
            profiles.map(p => (
              <ProfileCard key={p.id} profile={p}
                isSelected={selectedId === p.id}
                onSelect={setSelectedId}
                onEdit={setEditProfile}
                onDelete={id => deleteProfile.mutate(id)} />
            ))
          )}
        </div>

        {/* ── Right: schedule ── */}
        <div className="lg:col-span-2">
          {!selectedId ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 text-center">
              <FaSyringe className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-500">{t('vaccination.selectProfileMsg')}</p>
            </div>
          ) : scheduleQ.isLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : schedule ? (
            <div className="space-y-4">
              {/* Schedule header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="section-title">{t('vaccination.scheduleTitle', { name: schedule.profile.name })}</h2>
                  <p className="text-xs text-gray-500">{t('vaccination.scheduleSubtitle', { age: schedule.profile.age_text })}</p>
                </div>
                <button onClick={() => setShowAddRecord(true)} className="btn-secondary gap-1.5 text-sm">
                  <FaPlus className="h-3 w-3" />
                  {t('vaccination.markGivenBtn')}
                </button>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: t('vaccination.total'),    value: schedule.total,     cls: 'text-gray-700' },
                  { label: t('vaccination.done'),     value: schedule.completed, cls: 'text-green-600' },
                  { label: t('vaccination.due'),      value: schedule.due,       cls: 'text-amber-600' },
                  { label: t('vaccination.overdue'),  value: schedule.overdue,   cls: 'text-red-600' },
                ].map(s => (
                  <div key={s.label} className="card-sm text-center">
                    <p className={clsx('text-2xl font-bold', s.cls)}>{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>{t('vaccination.progress')}</span>
                  <span>{Math.round((schedule.completed / schedule.total) * 100)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-primary-500 transition-all duration-500"
                    style={{ width: `${(schedule.completed / schedule.total) * 100}%` }} />
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
                {FILTER_TABS.map(tab => (
                  <button key={tab.id} onClick={() => setScheduleFilter(tab.id)}
                    className={clsx(
                      'flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                      scheduleFilter === tab.id
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    )}>
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={clsx('rounded-full bg-gray-200 px-1.5 py-0.5 text-2xs font-bold',
                        scheduleFilter === tab.id && tab.cls)}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Schedule list */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredSchedule.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">{t('vaccination.noVaccines')}</p>
                ) : (
                  filteredSchedule.map((item, i) => <ScheduleRow key={i} item={item} />)
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      {showAddProfile && (
        <ProfileModal
          onClose={() => setShowAddProfile(false)}
          onSave={d => createProfile.mutate(d)}
          saving={createProfile.isPending}
        />
      )}
      {editProfile && (
        <ProfileModal
          initial={editProfile}
          onClose={() => setEditProfile(null)}
          onSave={d => updateProfile.mutate({ id: editProfile.id, ...d })}
          saving={updateProfile.isPending}
        />
      )}
      {showAddRecord && selectedId && (
        <RecordModal
          onClose={() => setShowAddRecord(false)}
          onSave={d => addRecord.mutate(d)}
          saving={addRecord.isPending}
        />
      )}
    </div>
  )
}
