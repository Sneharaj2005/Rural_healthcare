/**
 * useSpeechOutput — Browser Speech Synthesis API text-to-speech hook.
 *
 * Features:
 *   - Strips markdown before speaking (no "asterisk asterisk bold asterisk asterisk")
 *   - Maps app language codes to BCP-47 for voice selection
 *   - Prefers a matching language voice; falls back to default
 *   - Exposes per-message play/pause/stop controls
 *
 * Returns:
 *   isSpeaking      — true while audio is playing
 *   isSupported     — false on browsers without speechSynthesis
 *   currentId       — id of the message currently being spoken
 *   speak(id, text) — start speaking; stops any current speech first
 *   stop()          — cancel current speech
 *   toggle(id, text)— play if stopped, stop if playing same id
 */
import { useState, useCallback, useRef } from 'react'

const LANG_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  te: 'te-IN',
  ta: 'ta-IN',
}

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

/** Remove markdown syntax so it doesn't get read aloud. */
function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s/g, '')          // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // code
    .replace(/>\s?/g, '')              // blockquotes
    .replace(/[-*+]\s/g, '')           // list bullets
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → label only
    .replace(/\n{2,}/g, '. ')          // paragraph breaks → pause
    .replace(/\n/g, ' ')
    .trim()
}

/** Pick the best available voice for the given BCP-47 locale. */
function pickVoice(locale) {
  if (!synth) return null
  const voices = synth.getVoices()
  // Exact match first
  let voice = voices.find((v) => v.lang === locale)
  // Language prefix match (e.g. 'hi' matches 'hi-IN')
  if (!voice) {
    const prefix = locale.split('-')[0]
    voice = voices.find((v) => v.lang.startsWith(prefix))
  }
  return voice || null
}

export function useSpeechOutput(appLanguage = 'en') {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentId,  setCurrentId]  = useState(null)
  const utteranceRef = useRef(null)

  const isSupported = Boolean(synth)

  const stop = useCallback(() => {
    if (synth) synth.cancel()
    setIsSpeaking(false)
    setCurrentId(null)
    utteranceRef.current = null
  }, [])

  const speak = useCallback(
    (id, text) => {
      if (!synth) return
      // Cancel any ongoing speech
      synth.cancel()

      const clean = stripMarkdown(text)
      if (!clean) return

      const utterance = new SpeechSynthesisUtterance(clean)
      const locale    = LANG_MAP[appLanguage] || 'en-IN'

      // Voices may not be loaded yet — wait for them
      const assignVoice = () => {
        const voice = pickVoice(locale)
        if (voice) utterance.voice = voice
        utterance.lang  = locale
        utterance.rate  = 0.92   // slightly slower for clarity
        utterance.pitch = 1.0
      }

      if (synth.getVoices().length > 0) {
        assignVoice()
      } else {
        synth.addEventListener('voiceschanged', assignVoice, { once: true })
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
        setCurrentId(id)
      }
      utterance.onend = utterance.onerror = () => {
        setIsSpeaking(false)
        setCurrentId(null)
        utteranceRef.current = null
      }

      utteranceRef.current = utterance
      synth.speak(utterance)
    },
    [appLanguage]
  )

  const toggle = useCallback(
    (id, text) => {
      if (isSpeaking && currentId === id) {
        stop()
      } else {
        speak(id, text)
      }
    },
    [isSpeaking, currentId, speak, stop]
  )

  return { isSpeaking, isSupported, currentId, speak, stop, toggle }
}
