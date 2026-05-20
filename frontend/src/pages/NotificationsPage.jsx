import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import {
  FaBell, FaEnvelope, FaCheckCircle, FaTimesCircle,
  FaClock, FaPlay, FaHistory, FaInfoCircle,
} from 'react-icons/fa'
import api from '../lib/axios'
import LoadingSpinner from '../components/common/LoadingSpinner'

// ── Reminder log row ──────────────────────────────────────────────────────────
function LogRow({ log }) {
  const ok = log.status === 'sent'
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
      {ok
        ? <FaCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
        : <FaTimesCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {log.vaccine_name} — Dose {log.dose_number}
        </p>
        <p className="text-xs text-gray-500">
          {log.profile_name} · Due {log.due_date}
        </p>
        {log.error && <p className="text-xs text-red-500 mt-0.5">{log.error}</p>}
      </div>
      <div className="flex-shrink-0 text-right">
        <span className={clsx('badge text-2xs', ok ? 'badge-green' : 'badge-red')}>
          {ok ? 'Sent' : 'Failed'}
        </span>
        <p className="mt-1 text-2xs text-gray-400">
          {new Date(log.sent_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [testEmail, setTestEmail] = useState('')

  // ── Queries ───────────────────────────────────────────────────────────────
  const prefsQ = useQuery({
    queryKey: ['notif-prefs'],
    queryFn:  () => api.get('/notifications/prefs').then(r => r.data),
  })

  const logsQ = useQuery({
    queryKey: ['notif-logs'],
    queryFn:  () => api.get('/notifications/logs?limit=30').then(r => r.data),
  })

  const schedulerQ = useQuery({
    queryKey: ['scheduler-status'],
    queryFn:  () => api.get('/notifications/scheduler/status').then(r => r.data),
    refetchInterval: 30000,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updatePrefs = useMutation({
    mutationFn: d => api.put('/notifications/prefs', d).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-prefs'] })
      toast.success('Preferences saved.')
    },
    onError: () => toast.error('Failed to save preferences.'),
  })

  const sendTest = useMutation({
    mutationFn: email => api.post('/notifications/send-test', { email }).then(r => r.data),
    onSuccess: data => {
      if (data.success) toast.success('Test email sent! Check your inbox.')
      else toast.error(data.message)
    },
    onError: () => toast.error('Failed to send test email.'),
  })

  const sendNow = useMutation({
    mutationFn: () => api.post('/notifications/send-now').then(r => r.data),
    onSuccess: data => {
      toast.success(data.message)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['notif-logs'] }), 3000)
    },
    onError: () => toast.error('Failed to trigger reminders.'),
  })

  const prefs = prefsQ.data
  const logs  = logsQ.data?.logs ?? []
  const sched = schedulerQ.data

  const toggle = (key, val) => updatePrefs.mutate({ [key]: val })

  return (
    <div className="page-content max-w-3xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('notifications.title')}</h1>
        <p className="mt-1 text-gray-500">{t('notifications.subtitle')}</p>
      </div>

      {/* ── Email reminders card ── */}
      <div className="card space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
            <FaBell className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Email Reminders</h2>
            <p className="text-xs text-gray-500">Receive vaccination alerts by email</p>
          </div>
          {/* Master toggle */}
          {prefsQ.isLoading ? <LoadingSpinner size="sm" className="ml-auto" /> : (
            <button
              onClick={() => toggle('email_reminders_enabled', !prefs?.email_reminders_enabled)}
              className={clsx(
                'relative ml-auto inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                prefs?.email_reminders_enabled ? 'bg-primary-600' : 'bg-gray-200'
              )}
              role="switch"
              aria-checked={prefs?.email_reminders_enabled}
            >
              <span className={clsx(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200',
                prefs?.email_reminders_enabled ? 'translate-x-5' : 'translate-x-0'
              )} />
            </button>
          )}
        </div>

        {prefs?.email_reminders_enabled && (
          <div className="space-y-4 border-t border-gray-100 pt-4 animate-fade-in">
            {/* Days before */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Send reminder how many days before due date?
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 5, 7, 14].map(d => (
                  <button key={d}
                    onClick={() => toggle('reminder_days_before', d)}
                    className={clsx(
                      'rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                      prefs?.reminder_days_before === d
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300'
                    )}>
                    {d} day{d !== 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Override email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Send reminders to (leave blank to use account email)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    className="input-field pl-10"
                    placeholder="override@email.com"
                    defaultValue={prefs?.reminder_email || ''}
                    onBlur={e => {
                      const val = e.target.value.trim()
                      if (val !== (prefs?.reminder_email || '')) {
                        toggle('reminder_email', val || null)
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Scheduler status card ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <FaClock className="h-5 w-5 text-health-blue" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Scheduler Status</h2>
            <p className="text-xs text-gray-500">Daily reminder job runs at 08:00 IST</p>
          </div>
          <span className={clsx(
            'ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
            sched?.running ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          )}>
            <span className={clsx('h-1.5 w-1.5 rounded-full',
              sched?.running ? 'bg-green-500 animate-pulse' : 'bg-gray-400')} />
            {sched?.running ? 'Running' : 'Stopped'}
          </span>
        </div>

        {sched?.jobs?.map(job => (
          <div key={job.id} className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
            <p className="font-medium text-gray-800">{job.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Next run: {job.next_run
                ? new Date(job.next_run).toLocaleString()
                : 'Not scheduled'}
            </p>
          </div>
        ))}

        {/* Manual trigger */}
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Send reminders now</p>
            <p className="text-xs text-gray-500">
              Immediately check all profiles and send any due/overdue reminders.
            </p>
          </div>
          <button
            onClick={() => sendNow.mutate()}
            disabled={sendNow.isPending}
            className="btn-primary gap-2 self-start sm:self-auto"
          >
            {sendNow.isPending
              ? <><LoadingSpinner size="sm" color="white" /> Sending…</>
              : <><FaPlay className="h-3.5 w-3.5" /> Send Now</>
            }
          </button>
        </div>
      </div>

      {/* ── Test email card ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <FaEnvelope className="h-5 w-5 text-health-amber" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Test Email</h2>
            <p className="text-xs text-gray-500">Verify your SMTP configuration is working</p>
          </div>
        </div>

        <div className="alert-info flex items-start gap-2">
          <FaInfoCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
          <p className="text-xs">
            Set <code className="rounded bg-blue-100 px-1">EMAIL_ENABLED=true</code> and configure
            SMTP settings in <code className="rounded bg-blue-100 px-1">backend/.env</code> to
            enable email delivery. Gmail users: create an App Password at{' '}
            <a href="https://myaccount.google.com/apppasswords" target="_blank"
              rel="noopener noreferrer" className="underline">
              myaccount.google.com/apppasswords
            </a>.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="email"
              className="input-field pl-10"
              placeholder="test@example.com"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
            />
          </div>
          <button
            onClick={() => testEmail && sendTest.mutate(testEmail)}
            disabled={!testEmail || sendTest.isPending}
            className="btn-secondary gap-2"
          >
            {sendTest.isPending
              ? <LoadingSpinner size="sm" />
              : <FaEnvelope className="h-4 w-4" />
            }
            Send Test
          </button>
        </div>
      </div>

      {/* ── Reminder history ── */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <FaHistory className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Reminder History</h2>
          <span className="ml-auto text-xs text-gray-400">{logsQ.data?.total ?? 0} sent</span>
        </div>

        {logsQ.isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <FaBell className="h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-400">No reminders sent yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log, i) => <LogRow key={i} log={log} />)}
          </div>
        )}
      </div>
    </div>
  )
}
