"use client"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Message, ThinkingStep } from "@/lib/useStream"
import { VoiceInput } from "./VoiceInput"

const THINKING_LABELS: Record<string, string> = {
  listening: "listening...",
  planning: "planning your schedule...",
  coaching: "checking your habits...",
  responding: "generating response...",
}

export function ChatInterface({
  messages, thinking, loading, onSend, uid
}: {
  messages: Message[]
  thinking: ThinkingStep | null
  loading: boolean
  onSend: (msg: string) => void
  uid: string
}) {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, thinking])

  const handleSend = () => {
    if (!input.trim() || loading) return
    onSend(input.trim())
    setInput("")
  }

  return (
    <div className="flex flex-col h-full bg-[#18181B] rounded-3xl overflow-hidden border border-[#2A2D35] shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2A2D35] flex items-center gap-3 bg-[#1D1F25]">
        <div className="w-9 h-9 bg-[#3E2723] border border-[#6B4423] text-[#ECE0D2] rounded-2xl flex items-center justify-center text-base shadow-sm">
          ☕
        </div>
        <div>
          <div className="text-sm font-black text-[#ECE0D2]">Prodo</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4 bg-[#18181B]">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isUser = msg.role === "user"
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start"
                }}
              >
                <div
                  className={`max-w-[75%] px-5 py-3 rounded-2xl border text-xs leading-relaxed shadow-sm ${
                    isUser
                      ? "bg-[#3E2723]/60 border-[#6B4423] text-[#ECE0D2] rounded-tr-sm"
                      : "bg-[#22242A]/80 border-[#2A2D35] text-[#ECE0D2] rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Thinking Indicator */}
        <AnimatePresence>
          {thinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2.5"
            >
              <div className="px-4 py-2.5 bg-[#22242A] border border-[#2A2D35] rounded-2xl rounded-tl-sm flex items-center gap-2.5 shadow-sm">
                <span className="text-xs text-[#C5A880]">☕</span>
                <span className="text-xs text-[#C5A880] font-bold">
                  {THINKING_LABELS[thinking] || "thinking..."}
                </span>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                      className="w-1 h-1 rounded-full bg-[#C5A880]"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input Panel */}
      <div className="p-4 border-t border-[#2A2D35] flex gap-2.5 items-center bg-[#1D1F25]">
        <VoiceInput onTranscript={setInput} disabled={loading} />
        
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Jot down a task or question..."
          disabled={loading}
          className="flex-1 px-4 py-3 border border-[#2A2D35] rounded-2xl text-xs text-[#ECE0D2] bg-[#22242A] focus:outline-none focus:border-[#C5A880] placeholder-[#C5A880]/40 shadow-sm"
        />

        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 shadow-md ${
            loading || !input.trim()
              ? "bg-[#22242A] text-[#C5A880]/30 border border-[#2A2D35]"
              : "bg-[#3E2723] text-[#ECE0D2] border border-[#6B4423] hover:bg-[#4E3629]"
          }`}
        >
          Send
        </button>
      </div>
    </div>
  )
}
