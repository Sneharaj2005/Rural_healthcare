import { useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import {
  FaPlus, FaTrash, FaEdit, FaCheck, FaTimes,
  FaComments, FaExclamationTriangle, FaSpinner,
} from 'react-icons/fa'
import { useChatHistory } from '../../hooks/useChatHistory'
import LoadingSpinner from '../common/LoadingSpinner'

// ── Relative time helper ──────────────────────────────────────────────────────
function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ── Inline rename input ───────────────────────────────────────────────────────
function RenameInput({ initialValue, onSave, onCancel }) {
  const [value, setValue] = useState(initialValue)
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSave(value.trim()) }}
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-w-0 flex-1 rounded border border-primary-300 bg-white px-2 py-0.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-400"
        maxLength={80}
      />
      <button type="submit" className="text-primary-600 hover:text-primary-700" aria-label="Save">
        <FaCheck className="h-3 w-3" />
      </button>
      <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label="Cancel">
        <FaTimes className="h-3 w-3" />
      </button>
    </form>
  )
}

// ── Single conversation row ───────────────────────────────────────────────────
function ConversationRow({ conv, isActive, onSelect, onDelete, onRename }) {
  const [renaming, setRenaming] = useState(false)
  const [hovered,  setHovered]  = useState(false)

  const handleRename = (title) => {
    onRename(conv.id, title)
    setRenaming(false)
  }

  return (
    <div
      className={clsx(
        'group relative flex cursor-pointer flex-col gap-0.5 rounded-xl px-3 py-2.5 transition-all',
        isActive
          ? 'bg-primary-50 ring-1 ring-primary-200'
          : 'hover:bg-gray-100'
      )}
      onClick={() => !renaming && onSelect(conv.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {renaming ? (
        <RenameInput
          initialValue={conv.title}
          onSave={handleRename}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <>
          <p className={clsx(
            'truncate text-xs font-medium leading-snug',
            isActive ? 'text-primary-800' : 'text-gray-800'
          )}>
            {conv.title}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xs text-gray-400">
              {conv.message_count} msg · {relativeTime(conv.last_message_at)}
            </span>
          </div>
        </>
      )}

      {/* Action buttons — show on hover */}
      {!renaming && hovered && (
        <div
          className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setRenaming(true)}
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            title="Rename"
            aria-label="Rename conversation"
          >
            <FaEdit className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(conv.id)}
            className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-500"
            title="Delete"
            aria-label="Delete conversation"
          >
            <FaTrash className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function ChatHistoryPanel({
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}) {
  const { t } = useTranslation()
  const {
    conversations,
    totalConversations,
    isLoading,
    isError,
    rename,
    deleteOne,
    deleteAll,
  } = useChatHistory()

  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

  const handleDeleteAll = () => {
    if (!confirmDeleteAll) { setConfirmDeleteAll(true); return }
    deleteAll.mutate(undefined, { onSettled: () => setConfirmDeleteAll(false) })
    onNewConversation()
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{t('chat.history')}</p>
          <p className="text-xs text-gray-400">{t('chat.conversations', { count: totalConversations })}</p>
        </div>
        <button onClick={onNewConversation} className="btn-primary gap-1.5 px-3 py-1.5 text-xs" title="New conversation">
          <FaPlus className="h-3 w-3" />{t('chat.newConv')}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="sm" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
            <FaExclamationTriangle className="h-8 w-8 text-red-300" />
            <p className="text-xs font-medium text-gray-500">Could not load history</p>
            <p className="text-xs text-gray-400">Make sure the backend server is running</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <FaComments className="h-8 w-8 text-gray-200" />
            <p className="text-xs text-gray-400">{t('chat.noHistory')}</p>
            <p className="text-xs text-gray-400">{t('chat.startChatting')}</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationRow
              key={conv.id}
              conv={conv}
              isActive={conv.id === activeConversationId}
              onSelect={onSelectConversation}
              onDelete={(id) => {
                deleteOne.mutate(id)
                if (id === activeConversationId) onNewConversation()
              }}
              onRename={(id, title) => rename.mutate({ id, title })}
            />
          ))
        )}
      </div>

      {/* Footer — delete all */}
      {conversations.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3">
          {confirmDeleteAll ? (
            <div className="flex items-center gap-2">
              <FaExclamationTriangle className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
              <p className="flex-1 text-xs text-gray-600">Delete all history?</p>
              <button
                onClick={handleDeleteAll}
                disabled={deleteAll.isPending}
                className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                {deleteAll.isPending ? <FaSpinner className="h-3 w-3 animate-spin" /> : 'Yes'}
              </button>
              <button
                onClick={() => setConfirmDeleteAll(false)}
                className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <FaTrash className="h-3 w-3" />
              Clear all history
            </button>
          )}
        </div>
      )}
    </div>
  )
}
