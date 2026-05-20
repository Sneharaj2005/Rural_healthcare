import { useState, useRef, useEffect, useCallback } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import {
  FaRobot, FaUser, FaPaperPlane, FaTrash, FaCopy,
  FaExclamationTriangle, FaMapMarkerAlt, FaLightbulb,
  FaChevronDown, FaHeartbeat, FaHistory,
  FaMicrophone, FaVolumeUp, FaVolumeMute,
} from 'react-icons/fa'
import api from '../lib/axios'
import { useChatHistory } from '../hooks/useChatHistory'
import { useSpeechInput }  from '../hooks/useSpeechInput'
import { useSpeechOutput } from '../hooks/useSpeechOutput'
import ChatHistoryPanel from '../components/chat/ChatHistoryPanel'
import LoadingSpinner from '../components/common/LoadingSpinner'

// ── Welcome message ───────────────────────────────────────────────────────────
const makeWelcome = () => ({
  id: 'init', role: 'assistant', persisted: false, timestamp: new Date(),
  isEmergency: false,
  content: `Hello! I'm **RHC AI**, your Rural Health Companion. 👋\n\nI can help you with:\n- **Preventive healthcare** tips\n- **Symptom guidance** and when to seek care\n- **Nutrition, hydration & rest** advice\n- **Hygiene & sanitation** best practices\n- **Emergency warning signs**\n\nHow can I help you today?\n\n> ⚕️ *This AI does not replace professional medical advice.*`,
})

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-health-blue-lt text-health-blue">
        <FaRobot className="h-3.5 w-3.5" />
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-card ring-1 ring-gray-100">
        <div className="flex items-center gap-1.5 py-0.5">
          <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
        </div>
      </div>
    </div>
  )
}

// ── Emergency banner ──────────────────────────────────────────────────────────
function EmergencyBanner() {
  return (
    <div className="mx-4 mb-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 animate-slide-up">
      <FaExclamationTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
      <div className="flex-1 text-xs text-red-800">
        <p className="font-semibold">⚠️ This may be a medical emergency!</p>
        <p className="mt-0.5">Call <strong>112</strong> (Emergency) or <strong>108</strong> (Ambulance) immediately.</p>
      </div>
    </div>
  )
}

// ── TTS speaker button ────────────────────────────────────────────────────────
function SpeakerButton({ messageId, content, tts }) {
  const isPlaying = tts.isSpeaking && tts.currentId === messageId
  return (
    <button
      onClick={() => tts.toggle(messageId, content)}
      className={clsx(
        'flex items-center justify-center rounded-full p-1.5 transition-all',
        isPlaying
          ? 'bg-primary-100 text-primary-600'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
      )}
      title={isPlaying ? 'Stop reading' : 'Read aloud'}
      aria-label={isPlaying ? 'Stop reading' : 'Read aloud'}
    >
      {isPlaying
        ? <FaVolumeMute className="h-3 w-3 speaker-wave" />
        : <FaVolumeUp className="h-3 w-3" />
      }
    </button>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ message, tts }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const timeStr = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={clsx('group flex items-end gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={clsx(
        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
        isUser ? 'bg-primary-600 text-white' : 'bg-health-blue-lt text-health-blue'
      )}>
        {isUser ? <FaUser className="h-3.5 w-3.5" /> : <FaRobot className="h-3.5 w-3.5" />}
      </div>

      {/* Bubble */}
      <div className={clsx('flex max-w-[78%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className={clsx(
          'relative rounded-2xl px-4 py-3 text-sm shadow-sm',
          isUser
            ? 'rounded-br-sm bg-primary-600 text-white'
            : 'rounded-bl-sm bg-white ring-1 ring-gray-100 text-gray-800'
        )}>
          {isUser ? (
            <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
          ) : (
            <div className="chat-markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // eslint-disable-next-line no-unused-vars
                  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />
                }}
              >
                {message.content || ''}
              </ReactMarkdown>
            </div>
          )}

          {/* Copy button — hover reveal */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute -right-2 -top-2 hidden rounded-full bg-white p-1.5 shadow-sm ring-1 ring-gray-200 text-gray-400 hover:text-gray-600 group-hover:flex"
              title="Copy" aria-label="Copy message"
            >
              <FaCopy className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Meta row: time + emergency badge + copy feedback + TTS button */}
        <div className={clsx('flex items-center gap-2 px-1', isUser ? 'flex-row-reverse' : 'flex-row')}>
          {timeStr && <span className="text-2xs text-gray-400">{timeStr}</span>}
          {message.isEmergency && <span className="badge-red text-2xs">Emergency</span>}
          {copied && <span className="text-2xs text-primary-600">Copied!</span>}
          {/* TTS button — only for assistant messages */}
          {!isUser && tts.isSupported && (
            <SpeakerButton messageId={message.id} content={message.content} tts={tts} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Mic button with recording animation ──────────────────────────────────────
function MicButton({ stt, onResult, disabled }) {
  const handleClick = () => {
    if (stt.isListening) {
      stt.stopListening()
    } else {
      stt.startListening(onResult)
    }
  }

  if (!stt.isSupported) return null

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={clsx(
        'flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl transition-all',
        stt.isListening
          ? 'bg-red-500 text-white mic-recording'
          : 'btn-secondary'
      )}
      aria-label={stt.isListening ? 'Stop recording' : 'Start voice input'}
      title={stt.isListening ? 'Stop recording' : 'Speak your question'}
    >
      {stt.isListening ? (
        /* Animated sound bars while recording */
        <span className="flex items-end gap-0.5 h-4">
          <span className="sound-bar h-2" />
          <span className="sound-bar h-4" />
          <span className="sound-bar h-3" />
          <span className="sound-bar h-4" />
        </span>
      ) : (
        <FaMicrophone className="h-4 w-4" />
      )}
    </button>
  )
}

// ── Suggestion chip ───────────────────────────────────────────────────────────
function SuggestionChip({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-all hover:bg-primary-100 active:scale-95"
    >
      {text}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AIChatPage() {
  const { t, i18n } = useTranslation()
  const [messages,         setMessages]         = useState([makeWelcome()])
  const [input,            setInput]            = useState('')
  const [showEmergency,    setShowEmergency]    = useState(false)
  const [suggestions,      setSuggestions]      = useState([])
  const [showScrollBtn,    setShowScrollBtn]    = useState(false)
  const [activeConvId,     setActiveConvId]     = useState(null)
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)
  const [loadingHistory,   setLoadingHistory]   = useState(false)

  const bottomRef     = useRef(null)
  const scrollAreaRef = useRef(null)
  const inputRef      = useRef(null)

  const { refreshList } = useChatHistory()

  // Refetch conversation list every time this page is opened
  useEffect(() => { refreshList() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Voice hooks ───────────────────────────────────────────────────────────
  const stt = useSpeechInput(i18n.language)
  const tts = useSpeechOutput(i18n.language)

  // Stop TTS when language changes
  useEffect(() => { tts.stop() }, [i18n.language, tts])

  // ── Starter suggestions ───────────────────────────────────────────────────
  const { data: suggestionsData } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn:  () => api.get('/ai/suggestions').then((r) => r.data.questions),
    staleTime: Infinity,
  })

  useEffect(() => {
    if (suggestionsData) setSuggestions(suggestionsData)
  }, [suggestionsData])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const handleScroll = () => {
    const el = scrollAreaRef.current
    if (!el) return
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120)
  }

  // ── Load saved conversation ───────────────────────────────────────────────
  const loadConversation = async (convId) => {
    tts.stop()
    setLoadingHistory(true)
    setShowHistoryPanel(false)
    try {
      const { data } = await api.get(`/ai/conversations/${convId}`)
      const loaded = (data.messages || []).map((m) => ({
        id: m.id, role: m.role, content: m.content,
        timestamp: new Date(m.timestamp), isEmergency: m.is_emergency, persisted: true,
      }))
      setMessages(loaded.length ? loaded : [makeWelcome()])
      setActiveConvId(convId)
      setShowEmergency(false)
    } catch {
      toast.error('Failed to load conversation.')
    } finally {
      setLoadingHistory(false)
    }
  }

  // ── New conversation ──────────────────────────────────────────────────────
  const startNewConversation = () => {
    tts.stop()
    stt.stopListening()
    setMessages([makeWelcome()])
    setActiveConvId(null)
    setShowEmergency(false)
    setSuggestions([])
    setShowHistoryPanel(false)
    inputRef.current?.focus()
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const chatMutation = useMutation({
    mutationFn: (userMessage) =>
      api.post('/ai/chat', {
        message:         userMessage,
        conversation_id: activeConvId || undefined,
        language:        i18n.language || 'en',
        history: messages
          .filter((m) => m.id !== 'init' && m.persisted)
          .slice(-12)
          .map(({ role, content }) => ({ role, content })),
      }).then((r) => r.data),

    onSuccess: (data) => {
      if (!activeConvId) { setActiveConvId(data.conversation_id); refreshList() }
      const aiMsg = {
        id:          data.message_id || Date.now().toString(),
        role:        'assistant',
        content:     data.response,
        timestamp:   new Date(),
        isEmergency: data.is_emergency,
        persisted:   true,
      }
      setMessages((prev) => [...prev, aiMsg])
      if (data.is_emergency)               setShowEmergency(true)
      if (data.suggested_questions?.length) setSuggestions(data.suggested_questions)
      inputRef.current?.focus()
    },
    onError: () => toast.error('Failed to get a response. Please try again.'),
  })

  const sendMessage = (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || chatMutation.isPending) return
    tts.stop()
    setShowEmergency(false)
    setMessages((prev) => [...prev, {
      id: Date.now().toString(), role: 'user', content: trimmed,
      timestamp: new Date(), persisted: true,
    }])
    setInput('')
    chatMutation.mutate(trimmed)
  }

  // Voice input result → fill textarea and auto-send
  const handleVoiceResult = useCallback((transcript) => {
    setInput(transcript)
    // Small delay so user sees the text before it sends
    setTimeout(() => {
      sendMessage(transcript)
    }, 400)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit  = (e) => { e.preventDefault(); sendMessage() }
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const messageCount = messages.filter((m) => m.id !== 'init').length

  return (
    <div className="flex h-[calc(100vh-4rem)]">

      {/* ── Desktop history sidebar ── */}
      <div className="hidden lg:flex lg:w-64 xl:w-72 flex-shrink-0 border-r border-gray-200">
        <ChatHistoryPanel
          activeConversationId={activeConvId}
          onSelectConversation={loadConversation}
          onNewConversation={startNewConversation}
        />
      </div>

      {/* ── Mobile history drawer ── */}
      {showHistoryPanel && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setShowHistoryPanel(false)} />
          <div className="fixed inset-y-0 left-0 z-40 w-72 shadow-xl lg:hidden animate-slide-in">
            <ChatHistoryPanel
              activeConversationId={activeConvId}
              onSelectConversation={loadConversation}
              onNewConversation={startNewConversation}
            />
          </div>
        </>
      )}

      {/* ── Main chat area ── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">

        {/* Top bar */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistoryPanel(true)} className="btn-icon lg:hidden" aria-label="Open history">
              <FaHistory className="h-4 w-4" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-health-blue-lt">
              <FaRobot className="h-4 w-4 text-health-blue" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-gray-900">{t('chat.title')}</h1>
                <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-2xs font-medium text-primary-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse-slow" />
                  {t('chat.online')}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {activeConvId
                  ? t('chat.savedMessages',    { count: messageCount })
                  : t('chat.newConversation',  { count: messageCount })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Global TTS stop button — visible while speaking */}
            {tts.isSpeaking && (
              <button onClick={tts.stop}
                className="btn-secondary gap-1.5 text-xs px-3 py-1.5 text-primary-600 border-primary-200 animate-fade-in"
                title="Stop reading">
                <FaVolumeMute className="h-3 w-3" />
                <span className="hidden sm:inline">Stop</span>
              </button>
            )}
            <Link to="/clinic-finder" className="btn-secondary gap-1.5 text-xs px-3 py-1.5 hidden sm:inline-flex">
              <FaMapMarkerAlt className="h-3 w-3" />{t('chat.findClinic')}
            </Link>
            <button onClick={startNewConversation} className="btn-ghost gap-1.5 text-xs px-3 py-1.5">
              <FaTrash className="h-3 w-3" />
              <span className="hidden sm:inline">{t('chat.newChat')}</span>
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-100 px-4 py-2">
          <p className="text-center text-xs text-amber-700">
            <FaHeartbeat className="mr-1 inline h-3 w-3" />
            {t('chat.disclaimer')}
          </p>
        </div>

        {/* Voice input status bar */}
        {stt.isListening && (
          <div className="flex-shrink-0 flex items-center justify-center gap-3 bg-red-50 border-b border-red-100 px-4 py-2 animate-fade-in">
            <span className="flex items-end gap-0.5 h-4">
              <span className="sound-bar h-2" /><span className="sound-bar h-4" />
              <span className="sound-bar h-3" /><span className="sound-bar h-4" />
            </span>
            <p className="text-xs font-medium text-red-700">
              Listening… {stt.transcript && <span className="italic text-red-500">&quot;{stt.transcript}&quot;</span>}
            </p>
            <button onClick={stt.stopListening} className="text-xs text-red-600 underline hover:text-red-700">
              Cancel
            </button>
          </div>
        )}

        {/* Emergency banner */}
        {showEmergency && <div className="flex-shrink-0 pt-3"><EmergencyBanner /></div>}

        {/* Loading history */}
        {loadingHistory && (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-gray-500">{t('chat.loadingConv')}</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {!loadingHistory && (
          <div ref={scrollAreaRef} onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} tts={tts} />
              ))}
              {chatMutation.isPending && <TypingIndicator />}
              <div ref={bottomRef} className="h-1" />
            </div>
          </div>
        )}

        {/* Scroll-to-bottom */}
        {showScrollBtn && (
          <button onClick={() => scrollToBottom()}
            className="absolute bottom-28 right-6 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card-hover ring-1 ring-gray-200 text-gray-500 hover:text-gray-700 animate-fade-in"
            aria-label="Scroll to bottom">
            <FaChevronDown className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Suggestion chips */}
        {suggestions.length > 0 && !chatMutation.isPending && !loadingHistory && (
          <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-2.5 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-1.5 mb-2">
                <FaLightbulb className="h-3 w-3 text-amber-500" />
                <span className="text-xs font-medium text-gray-500">{t('chat.suggestedQuestions')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((q) => (
                  <SuggestionChip key={q} text={q} onClick={sendMessage} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-2">
            {/* Mic button */}
            <MicButton stt={stt} onResult={handleVoiceResult}
              disabled={chatMutation.isPending || loadingHistory} />

            {/* Text input */}
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder={stt.isListening ? 'Listening…' : t('chat.placeholder')}
              disabled={chatMutation.isPending || loadingHistory || stt.isListening}
              className={clsx(
                'input-field flex-1 resize-none overflow-hidden py-3 leading-relaxed',
                stt.isListening && 'bg-red-50 border-red-200 placeholder-red-400'
              )}
              style={{ minHeight: '46px', maxHeight: '120px' }}
              aria-label="Message input"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!input.trim() || chatMutation.isPending || loadingHistory}
              className="btn-primary h-[46px] w-[46px] flex-shrink-0 rounded-xl p-0"
              aria-label="Send">
              {chatMutation.isPending
                ? <LoadingSpinner size="sm" color="white" />
                : <FaPaperPlane className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-2 text-center text-2xs text-gray-400">
            {stt.isSupported && '🎤 Voice input supported · '}
            {t('chat.savedAuto')} · {t('chat.emergencyNumbers')}
          </p>
        </div>
      </div>
    </div>
  )
}
