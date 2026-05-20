import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { FaPlus, FaFileMedical, FaTrash, FaTimes } from 'react-icons/fa'
import api from '../lib/axios'
import LoadingSpinner from '../components/common/LoadingSpinner'

const RECORD_TYPES = ['Consultation', 'Lab Result', 'Prescription', 'Vaccination', 'Surgery', 'Other']

function RecordModal({ onClose, onSave, saving }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    title: '', record_type: 'Consultation',
    date: new Date().toISOString().split('T')[0],
    description: '', doctor_name: '', facility: '',
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{t('records.addTitle')}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <FaTimes className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('records.recordTitle')} *</label>
              <input required className="input-field" placeholder="e.g. Annual Checkup"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('records.recordType')} *</label>
              <select className="input-field" value={form.record_type}
                onChange={e => setForm({ ...form, record_type: e.target.value })}>
                {RECORD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('records.date')} *</label>
              <input type="date" required className="input-field" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('records.doctorName')}</label>
              <input className="input-field" placeholder="Dr. Smith" value={form.doctor_name}
                onChange={e => setForm({ ...form, doctor_name: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('records.facility')}</label>
            <input className="input-field" placeholder="Hospital / Clinic name" value={form.facility}
              onChange={e => setForm({ ...form, facility: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('records.description')}</label>
            <textarea rows={3} className="input-field resize-none" placeholder="Notes, diagnosis, medications…"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <LoadingSpinner size="sm" /> : null}
              {t('records.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const TYPE_COLORS = {
  Consultation: 'bg-blue-100 text-blue-700',
  'Lab Result':  'bg-purple-100 text-purple-700',
  Prescription:  'bg-green-100 text-green-700',
  Vaccination:   'bg-teal-100 text-teal-700',
  Surgery:       'bg-red-100 text-red-700',
  Other:         'bg-gray-100 text-gray-700',
}

export default function HealthRecordsPage() {
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['health-records'],
    queryFn: async () => {
      const { data } = await api.get('/health-records')
      return data
    },
  })

  const addMutation = useMutation({
    mutationFn: (record) => api.post('/health-records', record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-records'] })
      setShowModal(false)
      toast.success('Record added successfully.')
    },
    onError: () => toast.error('Failed to save record.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/health-records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-records'] })
      toast.success('Record deleted.')
    },
    onError: () => toast.error('Failed to delete record.'),
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('records.title')}</h1>
          <p className="mt-1 text-gray-500">{t('records.subtitle')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
          <FaPlus className="h-3.5 w-3.5" />
          {t('records.addRecord')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : data?.records?.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-gray-200 py-20 text-center">
          <FaFileMedical className="h-12 w-12 text-gray-300" />
          <div>
            <p className="font-semibold text-gray-700">{t('records.noRecords')}</p>
            <p className="text-sm text-gray-500">{t('records.noRecordsSubtitle')}</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            {t('records.addFirst')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.records?.map((record) => (
            <div key={record._id} className="card flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`badge ${TYPE_COLORS[record.record_type] || TYPE_COLORS.Other}`}>
                    {record.record_type}
                  </span>
                  <span className="text-xs text-gray-400">{record.date}</span>
                </div>
                <p className="font-semibold text-gray-900 truncate">{record.title}</p>
                {record.doctor_name && (
                  <p className="text-sm text-gray-500">Dr. {record.doctor_name} · {record.facility}</p>
                )}
                {record.description && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{record.description}</p>
                )}
              </div>
              <button
                onClick={() => deleteMutation.mutate(record._id)}
                className="flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                aria-label="Delete record"
              >
                <FaTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <RecordModal
          onClose={() => setShowModal(false)}
          onSave={(form) => addMutation.mutate(form)}
          saving={addMutation.isPending}
        />
      )}
    </div>
  )
}
