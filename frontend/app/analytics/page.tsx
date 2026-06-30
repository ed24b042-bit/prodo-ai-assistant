"use client"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import Link from "next/link"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from "recharts"

const COLORS = ["#BC8F8F", "#8FBC8F", "#7A967A", "#C5A880", "#EAE0D5", "#D2B48C"]

export default function AnalyticsPage() {
  const [scores, setScores] = useState<any[]>([])
  const [habits, setHabits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState<string | null>(null)

  // 1. Resolve Auth UID (Firebase or Demo LocalStorage)
  useEffect(() => {
    const cachedDemoUser = localStorage.getItem("prodo_demo_user")
    if (cachedDemoUser) {
      try {
        const profile = JSON.parse(cachedDemoUser)
        setUid(profile.uid)
        return
      } catch (e) {
        localStorage.removeItem("prodo_demo_user")
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid)
      } else {
        setUid(null)
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // 2. Fetch Data once UID is resolved
  useEffect(() => {
    if (!uid) return
    const activeUid = uid

    async function fetchData() {
      try {
        const scoresRef = collection(db, "productivity_scores", activeUid, "daily")
        const scoresQuery = query(scoresRef, orderBy("date", "asc"), limit(7))
        const scoresSnap = await getDocs(scoresQuery)
        const scoresData = scoresSnap.docs.map(doc => doc.data())
        setScores(scoresData)

        const habitsRef = collection(db, "habit_logs")
        const habitsQuery = query(habitsRef, where("uid", "==", activeUid), orderBy("createdAt", "desc"), limit(30))
        const habitsSnap = await getDocs(habitsQuery)
        const habitsData = habitsSnap.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || ""
          }
        })
        setHabits(habitsData)
      } catch (err) {
        console.error("Error fetching analytics data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [uid])

  const locationCounts = habits.reduce((acc: any, curr: any) => {
    const loc = curr.location || "other"
    acc[loc] = (acc[loc] || 0) + 1
    return acc
  }, {})

  const locationData = Object.keys(locationCounts).map(name => ({
    name,
    value: locationCounts[name]
  }))

  const averageFocus = habits.length
    ? (habits.reduce((sum, h) => sum + (h.focus_score || 0), 0) / habits.length).toFixed(1)
    : "N/A"

  const totalFocusMins = habits.reduce((sum, h) => sum + (h.duration_minutes || 0), 0)

  return (
    <div className="min-h-screen bg-[#18181B] text-[#ECE0D2] p-6 md:p-12 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#ECE0D2]">
            Productivity Analytics
          </h1>
          <p className="text-xs text-[#C5A880] font-bold uppercase tracking-wider mt-1">
            Real-time habits and focus insights
          </p>
        </div>
        <Link href="/" className="px-5 py-2.5 bg-[#3E2723] hover:bg-[#4E3629] border border-[#6B4423] text-[#ECE0D2] rounded-full text-xs font-bold transition duration-200 shadow-sm">
          Back to Planner
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-[#C5A880] animate-pulse font-bold text-xs uppercase tracking-widest">Querying analytics logs...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Key Metrics Cards */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-[#2A2D35] border border-[#2A2D35] p-6 rounded-3xl shadow-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#C5A880]">Focus sessions</div>
              <div className="text-2xl font-black mt-2 text-[#C5A880]">{habits.length}</div>
              <div className="text-[10px] text-[#C5A880] font-medium mt-1">Completed in last 30 days</div>
            </div>

            <div className="bg-[#2A2D35] border border-[#2A2D35] p-6 rounded-3xl shadow-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#C5A880]">Avg Focus Score</div>
              <div className="text-2xl font-black mt-2 text-[#7A967A]">{averageFocus} <span className="text-xs text-[#C5A880] font-bold">/ 10</span></div>
              <div className="text-[10px] text-[#C5A880] font-medium mt-1">Self-reported focus quality</div>
            </div>

            <div className="bg-[#2A2D35] border border-[#2A2D35] p-6 rounded-3xl shadow-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#C5A880]">Total Deep Work</div>
              <div className="text-2xl font-black mt-2 text-[#C5A880]">{totalFocusMins} <span className="text-xs text-[#C5A880] font-bold">mins</span></div>
              <div className="text-[10px] text-[#C5A880] font-medium mt-1">Aggregated focus duration</div>
            </div>
          </div>

          {/* Chart 1: Daily Productivity Score (last 7 days) */}
          <div className="md:col-span-2 bg-[#2A2D35] border border-[#2A2D35] p-6 rounded-3xl flex flex-col shadow-md">
            <h2 className="text-xs font-black text-[#ECE0D2] uppercase tracking-wider mb-4">Productivity Scores (Last 7 Days)</h2>
            <div className="h-72 w-full">
              {scores.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#C5A880] italic font-bold">No score records found.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scores}>
                    <defs>
                      <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C5A880" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#C5A880" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#22242A" />
                    <XAxis dataKey="date" stroke="#C5A880" fontSize={10} />
                    <YAxis stroke="#C5A880" domain={[0, 100]} fontSize={10} />
                    <Tooltip contentStyle={{ background: "#22242A", border: "1px solid #2A2D35" }} />
                    <Area type="monotone" dataKey="score" stroke="#C5A880" fillOpacity={1} fill="url(#scoreColor)" strokeWidth={2} name="Score" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Focus Locations */}
          <div className="bg-[#2A2D35] border border-[#2A2D35] p-6 rounded-3xl flex flex-col shadow-md">
            <h2 className="text-xs font-black text-[#ECE0D2] uppercase tracking-wider mb-4">Focus Locations</h2>
            <div className="h-72 w-full flex items-center justify-center">
              {locationData.length === 0 ? (
                <div className="text-xs text-[#C5A880] italic font-bold">No location log data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={locationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {locationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#22242A", border: "1px solid #2A2D35" }} />
                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[10px] text-[#C5A880] font-bold uppercase tracking-wider">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 3: Daily Task Activity */}
          <div className="md:col-span-3 bg-[#2A2D35] border border-[#2A2D35] p-6 rounded-3xl flex flex-col shadow-md">
            <h2 className="text-xs font-black text-[#ECE0D2] uppercase tracking-wider mb-4">Task Completion Details</h2>
            <div className="h-72 w-full">
              {scores.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#C5A880] italic font-bold">No completion history found.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scores}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#22242A" />
                    <XAxis dataKey="date" stroke="#C5A880" fontSize={10} />
                    <YAxis stroke="#C5A880" fontSize={10} />
                    <Tooltip contentStyle={{ background: "#22242A", border: "1px solid #2A2D35" }} />
                    <Legend formatter={(value) => <span className="text-[10px] text-[#C5A880] font-bold uppercase tracking-wider">{value}</span>} />
                    <Bar dataKey="tasks_completed" name="Completed" fill="#7A967A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tasks_missed" name="Missed" fill="#B38E8E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
