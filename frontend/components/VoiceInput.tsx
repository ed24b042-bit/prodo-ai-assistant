"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"

export function VoiceInput({
  onTranscript, disabled
}: {
  onTranscript: (text: string) => void
  disabled: boolean
}) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
  }, [])

  const toggleListen = () => {
    if (!supported || disabled) return
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      onTranscript(transcript)
    }
    recognition.start()
  }

  if (!supported) return null

  return (
    <motion.button
      type="button"
      onClick={toggleListen}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-base border flex-shrink-0 transition-all duration-300 shadow-md ${
        listening
          ? "bg-[#3E2723] border-[#6B4423] text-[#ECE0D2]"
          : "bg-[#22242A] border-[#2A2D35] text-[#C5A880] hover:bg-[#2A2D35] hover:text-[#ECE0D2]"
      }`}
    >
      {listening ? "🔴" : "🎤"}
    </motion.button>
  )
}
