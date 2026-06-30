"use client"
import { useState } from "react"
import { motion } from "framer-motion"

export function HabitLogger({
  taskTitle, uid, onClose
}: {
  taskTitle: string
  uid: string
  onClose: () => void
}) {
  const [location, setLocation] = useState<string>("home")
  const [focus, setFocus] = useState(7)
  const [distractions, setDistractions] = useState(1)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
    try {
      await fetch(`${apiUrl}/api/habits/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_title: taskTitle,
          location, focus_score: focus,
          distractions, duration_minutes: 60
        })
      })
    } catch (e) {
      console.error("Error logging habit:", e)
    } finally {
      setSaving(false)
      onClose()
    }
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      style={{
        background: "rgba(99,102,241,0.06)",
        border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: 10, padding: 14, marginBottom: 8, overflow: "hidden"
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", marginBottom: 12 }}>
        Log focus session
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {["home", "library", "classroom", "other"].map(loc => (
          <button
            key={loc}
            onClick={() => setLocation(loc)}
            style={{
              background: location === loc ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${location === loc ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
              color: location === loc ? "#6366f1" : "#94a3b8",
              borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600
            }}
          >{loc}</button>
        ))}
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>
          Focus score: {focus}/10
        </div>
        <input type="range" min={1} max={10} value={focus}
          onChange={e => setFocus(+e.target.value)}
          style={{ width: "100%", accentColor: "#6366f1" }} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={submit} disabled={saving} style={{
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          border: "none", borderRadius: 8, padding: "6px 14px",
          color: "white", fontSize: 12, fontWeight: 600
        }}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8, padding: "6px 14px",
          color: "#94a3b8", fontSize: 12
        }}>Cancel</button>
      </div>
    </motion.div>
  )
}
