"use client"
import { motion } from "framer-motion"

export function ProductivityCard({ score, streak }: { score: number, streak: number }) {
  // Dark Academia color scheme
  const strokeColor = score >= 75 ? "#7A967A" : score >= 50 ? "#C5A880" : "#B38E8E"
  const strokeBg = "#22242A"
  
  return (
    <div className="bg-[#2A2D35] border border-[#2A2D35] rounded-3xl p-5 shadow-lg flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative w-15 h-15">
          <svg width="60" height="60" className="-rotate-90">
            <circle cx="30" cy="30" r="24" fill="none"
              stroke={strokeBg} strokeWidth="5.5" />
            <motion.circle
              cx="30" cy="30" r="24" fill="none"
              stroke={strokeColor} strokeWidth="5.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 24}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 24 * (1 - score / 100) }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-extrabold" style={{ color: strokeColor }}>
            {score}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-[#C5A880] font-bold uppercase tracking-wider block">Productivity score</span>
          <span className="text-[11px] text-[#ECE0D2]/70 mt-0.5 block font-medium">Daily completion efficiency</span>
        </div>
      </div>

      <div className="text-right border-l border-[#22242A] pl-5">
        <div className="text-xl font-extrabold text-[#ECE0D2] flex items-center justify-end gap-1">
          <span>📚</span> {streak}
        </div>
        <span className="text-[10px] text-[#C5A880] font-bold uppercase tracking-wider block mt-0.5">Study streak</span>
      </div>
    </div>
  )
}
