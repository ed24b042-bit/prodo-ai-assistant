"use client"
import { useState, useEffect } from "react"
import { db, auth } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { updateProfile, signOut } from "firebase/auth"
import { motion } from "framer-motion"

export function ProfileModal({
  uid,
  onClose,
  onLogout
}: {
  uid: string
  onClose: () => void
  onLogout: () => void
}) {
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [timezone, setTimezone] = useState("UTC")
  const [hasCalendar, setHasCalendar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Kolkata",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Australia/Sydney"
  ]

  useEffect(() => {
    async function loadProfile() {
      try {
        const userRef = doc(db, "users", uid)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          const data = userSnap.data()
          setDisplayName(data.displayName || "")
          setEmail(data.email || "")
          setTimezone(data.timezone || "UTC")
          setHasCalendar(!!data.calendarAccessToken || !!data.calendarConnected)
        }
      } catch (err) {
        console.error("Error loading profile:", err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [uid])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName })
      }

      const userRef = doc(db, "users", uid)
      await updateDoc(userRef, {
        displayName,
        timezone
      })

      setMessage("success: Profile updated successfully!")
      setTimeout(() => onClose(), 1200)
    } catch (err) {
      console.error(err)
      setMessage("error: Failed to update profile.")
    } finally {
      setSaving(false)
    }
  }

  const handleLogoutClick = async () => {
    try {
      localStorage.removeItem("prodo_demo_user")
      await signOut(auth)
      onLogout()
    } catch (err) {
      console.error("Error logging out:", err)
    }
  }

  const handleGoogleCalendarConnect = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
    window.location.href = `${backendUrl}/auth/google?uid=${uid}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#2A2D35] border border-[#2A2D35] rounded-3xl p-6 shadow-2xl relative text-[#ECE0D2]"
      >
        <div className="flex justify-between items-center mb-5 border-b border-[#22242A] pb-3">
          <h3 className="text-sm font-extrabold text-[#ECE0D2] uppercase tracking-wider">Planner Settings</h3>
          <button
            onClick={onClose}
            className="text-[#C5A880] hover:text-[#ECE0D2] text-xl font-bold ml-auto"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#C5A880] animate-pulse uppercase tracking-wider font-bold">
            Reading logs...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {message && (
              <div className={`text-xs font-bold text-center p-3 rounded-2xl border ${
                message.startsWith("success")
                  ? "bg-[#7A967A]/10 border-[#7A967A]/30 text-[#7A967A]"
                  : "bg-[#B38E8E]/10 border-[#B38E8E]/30 text-[#B38E8E]"
              }`}>
                {message.replace(/^(success|error): /, "")}
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-[#C5A880] uppercase tracking-wider block">Email Address</label>
              <input
                type="text"
                value={email}
                disabled
                className="w-full mt-1.5 px-4 py-2.5 bg-[#22242A]/50 border border-[#2A2D35] rounded-2xl text-xs text-stone-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#C5A880] uppercase tracking-wider block">Full Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                className="w-full mt-1.5 px-4 py-2.5 bg-[#22242A] border border-[#2A2D35] rounded-2xl text-xs text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#C5A880] uppercase tracking-wider block">Timezone</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#22242A] border border-[#2A2D35] rounded-2xl text-xs text-[#ECE0D2] focus:outline-none focus:border-[#C5A880] cursor-pointer"
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz} className="bg-[#2A2D35] text-[#ECE0D2]">{tz}</option>
                ))}
              </select>
            </div>

            <div className="bg-[#22242A] border border-[#2A2D35] rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold text-[#ECE0D2] block">Google Calendar Link</span>
                <span className="text-[10px] text-[#C5A880] font-medium block mt-0.5">
                  {hasCalendar ? "✓ Calendar Syncing active" : "Not connected"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGoogleCalendarConnect}
                className={`px-3.5 py-1.5 border text-[10px] font-bold rounded-xl transition ${
                  hasCalendar
                    ? "bg-[#2A2D35] hover:bg-[#22242A] border-[#2A2D35] text-[#ECE0D2]"
                    : "bg-[#3E2723] hover:bg-[#4E3629] border-[#6B4423] text-[#ECE0D2]"
                }`}
              >
                {hasCalendar ? "Reconnect" : "Connect"}
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-[#3E2723] border border-[#6B4423] text-[#ECE0D2] hover:bg-[#4E3629] rounded-2xl text-xs font-bold transition duration-300"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={handleLogoutClick}
                className="px-5 py-3 bg-[#22242A] border border-[#2A2D35] text-[#C5A880] hover:text-[#ECE0D2] rounded-2xl text-xs font-bold transition duration-300"
              >
                Logout
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}
