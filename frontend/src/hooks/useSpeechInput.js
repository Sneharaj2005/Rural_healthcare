/**
 * useSpeechInput — Web Speech API speech-to-text hook.
 *
 * Maps i18next language codes to BCP-47 locales supported by
 * the SpeechRecognition API (all major Indian languages included).
 *
 * Returns:
 *   isListening   — true while mic is active
 *   isSupported   — false on browsers without SpeechRecognition
 *   transcript    — live interim text while speaking
 *   startListening(onResult, onInterim?) — begin recording
 *   stopListening()                      — stop recording
 */
import { useState, useRef, useCallback } from 'react'

// Map app language codes → BCP-47 locales for SpeechRecognition
const LANG_MAP = {
  en: 'en-IN',   // English (India) — better for Indian accents
  hi: 'hi-IN',
  kn: 'kn-IN',
  te: 'te-IN',
  ta: 'ta-IN',
}

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export function useSpeechInput(appLanguage = 'en') {
  const [isListening, setIsListening] = useState(false)
  const [transcript,  setTranscript]  = useState('')
  const recognitionRef = useRef(null)

  const isSupported = Boolean(SpeechRecognition)

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
    setTranscript('')
  }, [])

  const startListening = useCallback(
    (onResult, onInterim) => {
      if (!SpeechRecognition) return
      // Stop any existing session first
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }

      const recognition = new SpeechRecognition()
      recognition.lang              = LANG_MAP[appLanguage] || 'en-IN'
      recognition.continuous        = false   // single utterance
      recognition.interimResults    = true    // show live text
      recognition.maxAlternatives   = 1

      recognition.onstart = () => {
        setIsListening(true)
        setTranscript('')
      }

      recognition.onresult = (event) => {
        let interim = ''
        let final   = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += text
          } else {
            interim += text
          }
        }
        if (interim && onInterim) onInterim(interim)
        if (interim) setTranscript(interim)
        if (final) {
          setTranscript(final)
          onResult(final.trim())
          stopListening()
        }
      }

      recognition.onerror = (event) => {
        // 'no-speech' is common and not a real error
        if (event.error !== 'no-speech') {
          console.warn('SpeechRecognition error:', event.error)
        }
        stopListening()
      }

      recognition.onend = () => {
        setIsListening(false)
        setTranscript('')
        recognitionRef.current = null
      }

      recognitionRef.current = recognition
      recognition.start()
    },
    [appLanguage, stopListening]
  )

  return { isListening, isSupported, transcript, startListening, stopListening }
}
