"use client"
import { useState, useEffect, useCallback } from "react"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs,
  orderBy, limit, onSnapshot, addDoc
} from "firebase/firestore"
import { useStream, Task } from "@/lib/useStream"
import { ChatInterface } from "@/components/ChatInterface"
import { ProductivityCard } from "@/components/ProductivityCard"
import { AuthInterface } from "@/components/AuthInterface"
import { ProfileModal } from "@/components/ProfileModal"
import { useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { motion, AnimatePresence } from "framer-motion"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"

const ANALYTICS_COLORS = ["#BC8F8F", "#8FBC8F", "#7A967A", "#C5A880", "#EAE0D5", "#D2B48C"]

// Handcrafted SVG Icons (Perfect thin lines, custom outline style)
const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const EditIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
)

const PinIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.48A2 2 0 0 1 15 9.28V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.28a2 2 0 0 1-.78 1.24l-2.78 3.48a2 2 0 0 0-.44 1.24Z" />
  </svg>
)

const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const CalendarIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const PlusIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const SearchIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const HomeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

const BoardIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <rect x="7" y="7" width="3" height="9" />
    <rect x="14" y="7" width="3" height="5" />
  </svg>
)

const ChartIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

const UserGroupIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const CogIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const CUTE_EMOJIS = ["🌿", "☕", "📚", "🛒", "🍂", "📜", "🕰️", "✍️", "🫒", "📓", "🏛️", "🕯️"]

export default function Home() {
  const [uid, setUid] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{ displayName?: string, email?: string, calendarConnected?: boolean, boardLists?: any[] } | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const router = useRouter()

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"home" | "tasks" | "calendar" | "analytics" | "collaboration" | "settings">("home")

  // Taskboard list columns state
  const [boardLists, setBoardLists] = useState<any[]>([
    { id: "list-1", name: "Personal", color: "rose", emoji: "🌿" }
  ])

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPriority, setFilterPriority] = useState("all") // all, high, medium, low
  const [filterStatus, setFilterStatus] = useState("all") // all, pending, missed, etc.
  const [sortBy, setSortBy] = useState("date") // date, priority, alphabetical
  const [expandedCompletedLists, setExpandedCompletedLists] = useState<Record<string, boolean>>({})
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({})

  // Task creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createDate, setCreateDate] = useState("")
  // Time Picker splits
  const [createHour, setCreateHour] = useState("9")
  const [createMinute, setCreateMinute] = useState("00")
  const [createAmPm, setCreateAmPm] = useState("AM")
  const [createDuration, setCreateDuration] = useState(60) // minutes
  const [createPriority, setCreatePriority] = useState(5) // Slider 1-10
  const [createList, setCreateList] = useState("list-1")
  const [createNotes, setCreateNotes] = useState("")
  const [createReminder, setCreateReminder] = useState(false)
  const [createRepeat, setCreateRepeat] = useState("none")
  const [createAssignee, setCreateAssignee] = useState("")

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editHour, setEditHour] = useState("9")
  const [editMinute, setEditMinute] = useState("00")
  const [editAmPm, setEditAmPm] = useState("AM")
  const [editDuration, setEditDuration] = useState(60)
  const [editPriority, setEditPriority] = useState(5)
  const [editList, setEditList] = useState("list-1")
  const [editNotes, setEditNotes] = useState("")
  const [editReminder, setEditReminder] = useState(false)
  const [editRepeat, setEditRepeat] = useState("none")
  const [editAssignee, setEditAssignee] = useState("")

  // Quick Reschedule Dropdown index
  const [reschedulingTaskId, setReschedulingTaskId] = useState<string | null>(null)

  // Completed tasks collapsible
  const [showCompleted, setShowCompleted] = useState(false)

  // Undo delete notification states
  const [lastDeletedTask, setLastDeletedTask] = useState<any | null>(null)
  const [showUndoToast, setShowUndoToast] = useState(false)

  // Date & Time Validation + Subtasks States
  const [createValidationError, setCreateValidationError] = useState<string | null>(null)
  const [editValidationError, setEditValidationError] = useState<string | null>(null)
  const [createSubtasks, setCreateSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [editSubtasks, setEditSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([])
  const [newEditSubtaskTitle, setNewEditSubtaskTitle] = useState("")

  const getLocalDateString = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const checkPastDateTime = (dateStr: string, hourStr: string, minStr: string, amPmStr: string) => {
    if (!dateStr) return null
    const today = getLocalDateString()
    if (dateStr < today) {
      return "Cannot schedule tasks in the past."
    }
    if (dateStr === today) {
      let hr = parseInt(hourStr)
      if (amPmStr === "PM" && hr < 12) hr += 12
      if (amPmStr === "AM" && hr === 12) hr = 0
      const min = parseInt(minStr)
      const now = new Date()
      const currentHr = now.getHours()
      const currentMin = now.getMinutes()
      if (hr < currentHr || (hr === currentHr && min < currentMin)) {
        return "Selected time is in the past. Please choose a future time."
      }
    }
    return null
  }

  const handleAddCreateSubtask = () => {
    if (!newSubtaskTitle.trim()) return
    setCreateSubtasks(prev => [
      ...prev,
      { id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, title: newSubtaskTitle.trim(), completed: false }
    ])
    setNewSubtaskTitle("")
  }

  const handleAddEditSubtask = () => {
    if (!newEditSubtaskTitle.trim()) return
    setEditSubtasks(prev => [
      ...prev,
      { id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, title: newEditSubtaskTitle.trim(), completed: false }
    ])
    setNewEditSubtaskTitle("")
  }

  const handleToggleSubtask = async (task: any, subtaskId: string) => {
    const updatedSubtasks = (task.subtasks || []).map((st: any) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    )
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, subtasks: updatedSubtasks } : t))
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
      await fetch(`${apiUrl}/api/tasks/${uid}/${task.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtasks: updatedSubtasks })
      })
    } catch (err) {
      console.error("Failed to toggle subtask:", err)
    }
  }

  const handleDeleteSubtaskDirectly = async (task: any, subtaskId: string) => {
    const updatedSubtasks = (task.subtasks || []).filter((st: any) => st.id !== subtaskId)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, subtasks: updatedSubtasks } : t))
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
      await fetch(`${apiUrl}/api/tasks/${uid}/${task.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtasks: updatedSubtasks })
      })
    } catch (err) {
      console.error("Failed to delete subtask:", err)
    }
  }

  // Real-time validations
  useEffect(() => {
    if (showCreateModal) {
      const err = checkPastDateTime(createDate, createHour, createMinute, createAmPm)
      setCreateValidationError(err)
    }
  }, [createDate, createHour, createMinute, createAmPm, showCreateModal])

  useEffect(() => {
    if (editingTask) {
      const selectedStart = compileISOStart(editDate, editHour, editMinute, editAmPm)
      const originalStart = editingTask.startTime || ""
      if (selectedStart !== originalStart) {
        const err = checkPastDateTime(editDate, editHour, editMinute, editAmPm)
        setEditValidationError(err)
      } else {
        setEditValidationError(null)
      }
    }
  }, [editDate, editHour, editMinute, editAmPm, editingTask])

  // Initialize Create Date & Time picker to a future time when modal opens
  useEffect(() => {
    if (showCreateModal) {
      setCreateDate(getLocalDateString())
      const now = new Date()
      now.setHours(now.getHours() + 1)
      let hr = now.getHours()
      const ampm = hr >= 12 ? "PM" : "AM"
      hr = hr % 12
      if (hr === 0) hr = 12
      setCreateHour(String(hr))
      setCreateMinute("00")
      setCreateAmPm(ampm)
      setCreateValidationError(null)
    }
  }, [showCreateModal])

  // Analytics states
  const [analyticsScores, setAnalyticsScores] = useState<any[]>([])
  const [analyticsHabits, setAnalyticsHabits] = useState<any[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Calendar states
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("week")
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())

  const handlePrevMonth = () => {
    setCalendarDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }

  const handleNextMonth = () => {
    setCalendarDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }

  const handlePrevYear = () => {
    setCalendarDate(prev => {
      const d = new Date(prev)
      d.setFullYear(d.getFullYear() - 1)
      return d
    })
  }

  const handleNextYear = () => {
    setCalendarDate(prev => {
      const d = new Date(prev)
      d.setFullYear(d.getFullYear() + 1)
      return d
    })
  }

  const handleGoToday = () => {
    setCalendarDate(new Date())
  }

  // Collaboration states
  const [team, setTeam] = useState<any | null>(null)
  const [teamTasks, setTeamTasks] = useState<any[]>([])
  const [activityFeed, setActivityFeed] = useState<any[]>([])
  const [joinCodeInput, setJoinCodeInput] = useState("")
  const [teamNameInput, setTeamNameInput] = useState("")
  const [comments, setComments] = useState<any[]>([])
  const [activeCommentTaskId, setActiveCommentTaskId] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState("")

  const {
    messages, thinking, tasks, score, loading, sendMessage, setTasks,
    completeTask, deleteTask, editTask, markTaskMissed, createTask
  } = useStream(uid || "")

  // Quick add task inputs for Home Overview
  const [quickTitle, setQuickTitle] = useState("")
  const [quickPriority, setQuickPriority] = useState("medium")
  const [quickList, setQuickList] = useState("list-1")

  // Check query parameter for calendar connection
  useEffect(() => {
    if (!uid) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("calendar") === "connected") {
      const saveCalendarStatus = async () => {
        try {
          const userRef = doc(db, "users", uid)
          await updateDoc(userRef, {
            calendarConnected: true
          })
          setUserProfile(prev => prev ? { ...prev, calendarConnected: true } : null)
          router.replace("/")
        } catch (e) {
          console.error("Failed to update calendarConnected status:", e)
        }
      }
      saveCalendarStatus()
    }
  }, [uid, router])

  // Resolve Auth state and user profile
  useEffect(() => {
    const cachedDemoUser = localStorage.getItem("prodo_demo_user")
    if (cachedDemoUser) {
      try {
        const profile = JSON.parse(cachedDemoUser)
        setUid(profile.uid)
        setUserProfile(profile)
        setAuthChecking(false)
        return
      } catch (e) {
        localStorage.removeItem("prodo_demo_user")
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid)
        setAuthChecking(false)
        try {
          const docRef = doc(db, "users", user.uid)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            const data = docSnap.data()
            setUserProfile(data as any)
            if (data.boardLists && data.boardLists.length > 0) {
              setBoardLists(data.boardLists)
            }
          } else {
            setUserProfile({
              displayName: user.displayName || "User",
              email: user.email || ""
            })
          }
        } catch (e) {
          setUserProfile({
            displayName: user.displayName || "User",
            email: user.email || ""
          })
        }
      } else {
        setUid(null)
        setUserProfile(null)
        setAuthChecking(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // Sync board lists to firestore once loaded
  useEffect(() => {
    if (uid && userProfile && !userProfile.boardLists) {
      const initLists = async () => {
        try {
          await updateDoc(doc(db, "users", uid), {
            boardLists: [
              { id: "list-1", name: "Personal", color: "rose", emoji: "🌿" }
            ]
          })
        } catch (e) {
          console.error("Error initializing boardLists:", e)
        }
      }
      initLists()
    }
  }, [uid, userProfile])

  // Fetch Analytics data
  const fetchAnalyticsData = useCallback(async () => {
    if (!uid) return
    setAnalyticsLoading(true)
    try {
      const scoresRef = collection(db, "productivity_scores", uid, "daily")
      const scoresQuery = query(scoresRef, orderBy("date", "asc"), limit(7))
      const scoresSnap = await getDocs(scoresQuery)
      setAnalyticsScores(scoresSnap.docs.map(doc => doc.data()))

      const habitsRef = collection(db, "habit_logs")
      const habitsQuery = query(habitsRef, where("uid", "==", uid), orderBy("createdAt", "desc"), limit(30))
      const habitsSnap = await getDocs(habitsQuery)
      setAnalyticsHabits(habitsSnap.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || ""
        }
      }))
    } catch (e) {
      console.error("Failed to load analytics:", e)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [uid])

  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalyticsData()
    }
  }, [activeTab, fetchAnalyticsData])

  // Realtime subscription to Collaboration space
  useEffect(() => {
    if (!uid) return
    const teamsQuery = query(collection(db, "teams"), where("members", "array-contains", uid))
    
    const unsubscribeTeam = onSnapshot(teamsQuery, async (snap) => {
      if (!snap.empty) {
        const teamDoc = snap.docs[0]
        const teamData = { id: teamDoc.id, ...teamDoc.data() } as any
        setTeam(teamData)

        const teamTasksQuery = query(collection(db, "tasks"), where("teamId", "==", teamDoc.id))
        const unsubscribeTeamTasks = onSnapshot(teamTasksQuery, (taskSnap) => {
          setTeamTasks(taskSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        })

        const activityQuery = query(
          collection(db, "activity_feed"),
          where("teamId", "==", teamDoc.id),
          orderBy("createdAt", "desc"),
          limit(10)
        )
        const unsubscribeActivity = onSnapshot(activityQuery, (actSnap) => {
          setActivityFeed(actSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        })

        return () => {
          unsubscribeTeamTasks()
          unsubscribeActivity()
        }
      } else {
        setTeam(null)
        setTeamTasks([])
        setActivityFeed([])
      }
    })

    return () => unsubscribeTeam()
  }, [uid])

  // Subscribing to comments on active task
  useEffect(() => {
    if (!activeCommentTaskId) {
      setComments([])
      return
    }
    const q = query(
      collection(db, "comments"),
      where("taskId", "==", activeCommentTaskId),
      orderBy("createdAt", "asc")
    )
    const unsubscribeComments = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribeComments()
  }, [activeCommentTaskId])

  // Board list actions
  const handleAddBoardList = async () => {
    const name = prompt("Enter new list name:")
    if (name && name.trim()) {
      const colors = ["rose", "emerald", "sky", "purple", "peach", "yellow"]
      const newColor = colors[boardLists.length % colors.length]
      const newEmoji = CUTE_EMOJIS[boardLists.length % CUTE_EMOJIS.length]
      const newList = {
        id: `list-${Date.now()}`,
        name: name.trim(),
        color: newColor,
        emoji: newEmoji
      }
      const updated = [...boardLists, newList]
      setBoardLists(updated)
      if (uid) {
        await updateDoc(doc(db, "users", uid), { boardLists: updated })
      }
    }
  }

  const handleRenameList = async (listId: string) => {
    const list = boardLists.find(l => l.id === listId)
    const newName = prompt("Rename list:", list?.name)
    if (newName && newName.trim()) {
      const updated = boardLists.map(l => l.id === listId ? { ...l, name: newName.trim() } : l)
      setBoardLists(updated)
      if (uid) {
        await updateDoc(doc(db, "users", uid), { boardLists: updated })
      }
    }
  }

  const handleCycleListColor = async (listId: string) => {
    const colors = ["rose", "emerald", "sky", "purple", "peach", "yellow"]
    const list = boardLists.find(l => l.id === listId)
    if (!list) return
    const curIndex = colors.indexOf(list.color)
    const nextColor = colors[(curIndex + 1) % colors.length]
    
    const updated = boardLists.map(l => l.id === listId ? { ...l, color: nextColor } : l)
    setBoardLists(updated)
    if (uid) {
      await updateDoc(doc(db, "users", uid), { boardLists: updated })
    }

    const nextColorHex = getListColorClasses(nextColor).hex
    const tasksToColor = tasks.filter(t => t.listId === listId)
    for (const t of tasksToColor) {
      if (t.id) {
        await editTask(t.id, { color: nextColorHex })
      }
    }
  }

  const handleDeleteList = async (listId: string) => {
    if (boardLists.length <= 1) {
      alert("You must have at least one list on the board!")
      return
    }
    if (!confirm("Are you sure you want to delete this list?")) return
    
    const otherLists = boardLists.filter(l => l.id !== listId)
    const options = otherLists.map((l, i) => `${i + 1}. ${l.name}`).join("\n")
    const action = prompt(
      `Type "delete" to delete all tasks in this list, or enter the number of the list to move tasks to:\n${options}`
    )
    
    if (action === null) return
    
    const cleanAction = action.trim().toLowerCase()
    if (cleanAction === "delete") {
      const tasksToDelete = tasks.filter(t => t.listId === listId)
      for (const t of tasksToDelete) {
        if (t.id) await deleteTask(t.id)
      }
    } else {
      const index = parseInt(cleanAction) - 1
      if (index >= 0 && index < otherLists.length) {
        const targetList = otherLists[index]
        const tasksToMove = tasks.filter(t => t.listId === listId)
        for (const t of tasksToMove) {
          if (t.id) {
            await editTask(t.id, { listId: targetList.id, listName: targetList.name })
          }
        }
      } else {
        alert("Invalid option. List deletion cancelled.")
        return
      }
    }
    
    setBoardLists(otherLists)
    if (uid) {
      await updateDoc(doc(db, "users", uid), { boardLists: otherLists })
    }
  }

  const onDragEnd = async (result: any) => {
    const { source, destination, type } = result
    if (!destination) return
    
    if (type === "column") {
      const updated = Array.from(boardLists)
      const [moved] = updated.splice(source.index, 1)
      updated.splice(destination.index, 0, moved)
      setBoardLists(updated)
      if (uid) {
        await updateDoc(doc(db, "users", uid), { boardLists: updated })
      }
      return
    }

    if (source.droppableId !== destination.droppableId) {
      const taskId = result.draggableId
      const targetListId = destination.droppableId
      const targetList = boardLists.find(l => l.id === targetListId)
      if (targetList) {
        const targetColor = getListColorClasses(targetList.color).hex

        setTasks(prev => prev.map(t => t.id === taskId ? {
          ...t,
          listId: targetListId,
          listName: targetList.name,
          color: targetColor
        } : t))

        await editTask(taskId, {
          listId: targetListId,
          listName: targetList.name,
          color: targetColor
        })
      }
    } else {
      const items = Array.from(tasks)
      const listId = source.droppableId
      const columnTasks = items.filter(t => t.listId === listId && t.status !== "completed")
      const [moved] = columnTasks.splice(source.index, 1)
      columnTasks.splice(destination.index, 0, moved)
      
      if (moved.id) {
        const newPriority = Math.max(100 - destination.index * 5, 0)
        await editTask(moved.id, { priority: newPriority })
      }
    }
  }

  const compileISOStart = (dateStr: string, hourStr: string, minStr: string, amPmStr: string) => {
    if (!dateStr) return ""
    try {
      let hr = parseInt(hourStr)
      if (amPmStr === "PM" && hr < 12) hr += 12
      if (amPmStr === "AM" && hr === 12) hr = 0
      const formattedHr = String(hr).padStart(2, "0")
      const formattedMin = minStr.padStart(2, "0")
      return new Date(`${dateStr}T${formattedHr}:${formattedMin}:00`).toISOString()
    } catch {
      return ""
    }
  }

  const parseISOSplits = (isoStr?: string) => {
    if (!isoStr) return { date: "", hour: "9", minute: "00", amPm: "AM" }
    try {
      const d = new Date(isoStr)
      const date = d.toISOString().split("T")[0]
      let hours = d.getHours()
      const minute = String(d.getMinutes()).padStart(2, "0")
      const amPm = hours >= 12 ? "PM" : "AM"
      hours = hours % 12
      if (hours === 0) hours = 12
      return { date, hour: String(hours), minute, amPm }
    } catch {
      return { date: "", hour: "9", minute: "00", amPm: "AM" }
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createTitle.trim()) return

    const validationErr = checkPastDateTime(createDate, createHour, createMinute, createAmPm)
    if (validationErr) {
      setCreateValidationError(validationErr)
      return
    }

    const tempId = `temp-${Date.now()}`
    const startTimeISO = compileISOStart(createDate, createHour, createMinute, createAmPm)
    let endTimeISO = ""
    if (startTimeISO) {
      endTimeISO = new Date(new Date(startTimeISO).getTime() + createDuration * 60000).toISOString()
    }

    const targetList = boardLists.find(l => l.id === createList) || boardLists[0]
    const listColor = getListColorClasses(targetList.color).hex

    const taskObj: Task = {
      id: tempId,
      title: createTitle.trim(),
      description: createDescription.trim(),
      dueDate: createDate,
      date: createDate,
      startTime: startTimeISO,
      endTime: endTimeISO,
      duration: createDuration,
      priority: createPriority * 10,
      listId: targetList.id,
      listName: targetList.name,
      notes: createNotes.trim(),
      color: listColor,
      status: "pending",
      reminder: createReminder,
      repeat: createRepeat,
      subtasks: createSubtasks
    }

    if (team && createAssignee) {
      taskObj.teamId = team.id
      taskObj.assignedTo = createAssignee
      taskObj.assignedToName = team.memberNames[createAssignee] || "Teammate"
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
      const res = await fetch(`${apiUrl}/api/tasks/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskObj)
      })
      if (res.ok) {
        const data = await res.json()
        if (data.task) {
          setTasks(prev => [...prev.filter(t => t.id !== tempId), data.task])
        }
        setShowCreateModal(false)
        setCreateTitle("")
        setCreateDescription("")
        setCreateDate("")
        setCreateHour("9")
        setCreateMinute("00")
        setCreateAmPm("AM")
        setCreateDuration(60)
        setCreatePriority(5)
        setCreateList(boardLists[0]?.id || "list-1")
        setCreateNotes("")
        setCreateReminder(false)
        setCreateRepeat("none")
        setCreateAssignee("")
        setCreateSubtasks([])
        setCreateValidationError(null)
      } else {
        const errorData = await res.json()
        setCreateValidationError(errorData.detail || "Failed to create task.")
      }
    } catch (err) {
      console.error(err)
      setCreateValidationError("Failed to save task. Connection offline.")
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask || !editTitle.trim()) return

    const validationErr = checkPastDateTime(editDate, editHour, editMinute, editAmPm)
    if (validationErr) {
      setEditValidationError(validationErr)
      return
    }

    const startTimeISO = compileISOStart(editDate, editHour, editMinute, editAmPm)
    let endTimeISO = ""
    if (startTimeISO) {
      endTimeISO = new Date(new Date(startTimeISO).getTime() + editDuration * 60000).toISOString()
    }

    const targetList = boardLists.find(l => l.id === editList) || boardLists[0]
    const listColor = getListColorClasses(targetList.color).hex

    const updates: any = {
      title: editTitle.trim(),
      description: editDescription.trim(),
      startTime: startTimeISO,
      endTime: endTimeISO,
      duration: editDuration,
      priority: editPriority * 10,
      listId: targetList.id,
      listName: targetList.name,
      color: listColor,
      dueDate: editDate,
      notes: editNotes.trim(),
      reminder: editReminder,
      repeat: editRepeat,
      subtasks: editSubtasks
    }

    if (team && editAssignee) {
      updates.teamId = team.id
      updates.assignedTo = editAssignee
      updates.assignedToName = team.memberNames[editAssignee] || "Teammate"
    } else {
      updates.teamId = ""
      updates.assignedTo = ""
      updates.assignedToName = ""
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
      const res = await fetch(`${apiUrl}/api/tasks/${uid}/${editingTask.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...updates } : t))
        setEditingTask(null)
        setEditValidationError(null)
      } else {
        const errorData = await res.json()
        setEditValidationError(errorData.detail || "Failed to save changes.")
      }
    } catch (e) {
      console.error(e)
      setEditValidationError("Failed to save changes. Connection offline.")
    }
  }

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTitle.trim()) return

    const targetList = boardLists.find(l => l.id === quickList) || boardLists[0]
    const listColor = getListColorClasses(targetList.color).hex
    const prioVal = quickPriority === "high" ? 80 : quickPriority === "medium" ? 50 : 20

    const taskObj = {
      title: quickTitle.trim(),
      description: "Quick added from Home Screen",
      priority: prioVal,
      listId: targetList.id,
      listName: targetList.name,
      color: listColor,
      status: "pending" as const,
      dueDate: new Date().toISOString().split("T")[0]
    }

    await createTask(taskObj)
    setQuickTitle("")
  }

  const handleCompleteOptimistic = async (taskId: string) => {
    const originalTasks = [...tasks]
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "completed" as const, completedAt: new Date().toISOString() } : t))
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
      const res = await fetch(`${apiUrl}/api/tasks/${uid}/${taskId}/complete`, { method: "POST" })
      if (!res.ok) throw new Error()
    } catch (e) {
      setTasks(originalTasks)
      alert("Failed to complete task. Connection lost.")
    }
  }

  const handleDeleteOptimistic = async (task: any) => {
    if (!task.id) return
    if (!confirm("Are you sure you want to delete this task?")) return

    const originalTasks = [...tasks]
    setLastDeletedTask(task)
    setShowUndoToast(true)
    
    setTasks(prev => prev.filter(t => t.id !== task.id))
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
      const res = await fetch(`${apiUrl}/api/tasks/${uid}/${task.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch (e) {
      setTasks(originalTasks)
      setShowUndoToast(false)
      alert("Failed to delete task. Offline.")
    }

    setTimeout(() => {
      setShowUndoToast(false)
    }, 8000)
  }

  const handleUndoDelete = async () => {
    if (lastDeletedTask) {
      await createTask(lastDeletedTask)
      setShowUndoToast(false)
      setLastDeletedTask(null)
    }
  }

  const togglePin = async (task: any) => {
    if (!task.id) return
    const isPinned = !task.pinned
    await editTask(task.id, { pinned: isPinned })
  }

  const handleRestoreTask = async (taskId: string) => {
    const originalTasks = [...tasks]
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "pending" as const, completedAt: undefined } : t))
    try {
      await editTask(taskId, { status: "pending", completedAt: null })
    } catch (e) {
      setTasks(originalTasks)
      alert("Failed to restore task.")
    }
  }

  const handleQuickReschedule = async (taskId: string, daysAhead: number) => {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysAhead)
    const dateStr = targetDate.toISOString().split("T")[0]
    
    const task = tasks.find(t => t.id === taskId)
    let newStart = ""
    let newEnd = ""
    if (task?.startTime) {
      const curStart = new Date(task.startTime)
      const startObj = new Date(targetDate)
      startObj.setHours(curStart.getHours(), curStart.getMinutes())
      newStart = startObj.toISOString()
      newEnd = new Date(startObj.getTime() + (task.duration || 60) * 60000).toISOString()
    }

    await editTask(taskId, {
      dueDate: dateStr,
      date: dateStr,
      startTime: newStart,
      endTime: newEnd
    })
    setReschedulingTaskId(null)
  }

  const isDueToday = (task: any) => {
    const timeStr = task.startTime || task.scheduled_start || task.dueDate || ""
    if (!timeStr) return false
    return new Date(timeStr).toDateString() === new Date().toDateString()
  }

  const isOverdue = (task: any) => {
    const timeStr = task.startTime || task.scheduled_start || task.dueDate || ""
    if (!timeStr) return false
    return new Date(timeStr).getTime() < Date.now() && task.status !== "completed"
  }

  const getListColorClasses = (colorName: string) => {
    switch (colorName) {
      case "rose": // Dusty Rose
        return {
          bg: "bg-[#BC8F8F]/10 hover:bg-[#BC8F8F]/15",
          border: "border-[#BC8F8F]/30",
          text: "text-[#BC8F8F]",
          badge: "bg-[#BC8F8F]/20 text-[#ECE0D2] border-[#BC8F8F]/45",
          accent: "rose",
          hex: "#BC8F8F"
        }
      case "emerald": // Olive Green
        return {
          bg: "bg-[#4D5D30]/10 hover:bg-[#4D5D30]/15",
          border: "border-[#4D5D30]/30",
          text: "text-[#8FBC8F]",
          badge: "bg-[#4D5D30]/20 text-[#ECE0D2] border-[#4D5D30]/45",
          accent: "emerald",
          hex: "#8FBC8F"
        }
      case "sky": // Slate Blue
        return {
          bg: "bg-[#607D8B]/10 hover:bg-[#607D8B]/15",
          border: "border-[#607D8B]/30",
          text: "text-[#90A4AE]",
          badge: "bg-[#607D8B]/20 text-[#ECE0D2] border-[#607D8B]/45",
          accent: "sky",
          hex: "#607D8B"
        }
      case "purple": // Coffee Brown
        return {
          bg: "bg-[#3E2723]/10 hover:bg-[#3E2723]/15",
          border: "border-[#3E2723]/30",
          text: "text-[#C5A880]",
          badge: "bg-[#3E2723]/20 text-[#ECE0D2] border-[#3E2723]/45",
          accent: "purple",
          hex: "#3E2723"
        }
      case "peach": // Lavender
        return {
          bg: "bg-[#9575CD]/10 hover:bg-[#9575CD]/15",
          border: "border-[#9575CD]/30",
          text: "text-[#B39DDB]",
          badge: "bg-[#9575CD]/20 text-[#ECE0D2] border-[#9575CD]/45",
          accent: "peach",
          hex: "#9575CD"
        }
      case "yellow": // Muted Yellow / Gold
        return {
          bg: "bg-[#4E3629]/10 hover:bg-[#4E3629]/15",
          border: "border-[#4E3629]/30",
          text: "text-[#ECE0D2]",
          badge: "bg-[#4E3629]/20 text-[#ECE0D2] border-[#4E3629]/45",
          accent: "yellow",
          hex: "#ECE0D2"
        }
      default:
        return {
          bg: "bg-[#2A2D35]/30 hover:bg-[#2A2D35]/50",
          border: "border-[#2A2D35]",
          text: "text-[#ECE0D2]",
          badge: "bg-[#22242A] text-[#ECE0D2] border-[#2A2D35]",
          accent: "stone",
          hex: "#C5A880"
        }
    }
  }

  const getProcessedTasksForList = (listId: string) => {
    let listTasks = tasks.filter(t => t.listId === listId && t.status !== "completed")
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      listTasks = listTasks.filter(t => 
        t.title.toLowerCase().includes(q) || 
        (t.description && t.description.toLowerCase().includes(q))
      )
    }
    
    if (filterPriority !== "all") {
      listTasks = listTasks.filter(t => {
        const p = t.priority ?? t.priority_score ?? 50
        if (filterPriority === "high") return p >= 80
        if (filterPriority === "medium") return p >= 40 && p < 80
        if (filterPriority === "low") return p < 40
        return true
      })
    }
    
    if (filterStatus !== "all") {
      listTasks = listTasks.filter(t => t.status === filterStatus)
    }
    
    listTasks.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      
      if (sortBy === "priority") {
        const prioA = a.priority ?? a.priority_score ?? 50
        const prioB = b.priority ?? b.priority_score ?? 50
        return prioB - prioA
      }
      
      if (sortBy === "alphabetical") {
        return a.title.localeCompare(b.title)
      }
      
      const timeA = new Date(a.startTime ?? a.scheduled_start ?? 0).getTime()
      const timeB = new Date(b.startTime ?? b.scheduled_start ?? 0).getTime()
      return timeA - timeB
    })
    
    return listTasks
  }

  const getCompletedTasksForList = (listId: string) => {
    let listTasks = tasks.filter(t => t.listId === listId && t.status === "completed")
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      listTasks = listTasks.filter(t => 
        t.title.toLowerCase().includes(q) || 
        (t.description && t.description.toLowerCase().includes(q))
      )
    }
    return listTasks
  }

  const getTodayTasks = () => {
    return tasks.filter(t => t.status !== "completed" && isDueToday(t))
      .sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime())
  }

  const getUpcomingTasks = () => {
    return tasks.filter(t => {
      if (t.status === "completed") return false
      const timeStr = t.startTime || t.scheduled_start || t.dueDate || ""
      if (!timeStr) return false
      const d = new Date(timeStr)
      return d.getTime() > Date.now() && d.toDateString() !== new Date().toDateString()
    }).sort((a, b) => new Date(a.startTime || a.dueDate || 0).getTime() - new Date(b.startTime || b.dueDate || 0).getTime())
  }

  const getHighPriorityTasks = () => {
    return tasks.filter(t => {
      if (t.status === "completed") return false
      const p = t.priority ?? t.priority_score ?? 50
      if (p >= 80) return true
      if (isOverdue(t)) return true
      if (isDueToday(t)) return true
      
      const timeStr = t.startTime || t.scheduled_start || t.dueDate || ""
      if (timeStr) {
        const diff = new Date(timeStr).getTime() - Date.now()
        if (diff > 0 && diff <= 24 * 60 * 60 * 1000) return true
      }
      return false
    }).sort((a, b) => {
      const prioA = a.priority ?? a.priority_score ?? 50
      const prioB = b.priority ?? b.priority_score ?? 50
      return prioB - prioA
    })
  }

  const completedTasks = tasks.filter(t => t.status === "completed")

  const getWeekDates = (date: Date) => {
    const current = new Date(date)
    const day = current.getDay()
    const diff = current.getDate() - day + (day === 0 ? -6 : 1)
    const startOfWeek = new Date(current.setDate(diff))
    
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      dates.push(d)
    }
    return dates
  }

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate()
  }

  const handleCalendarSlotClick = (dateStr: string, hour: number) => {
    setCreateDate(dateStr)
    setCreateHour(String(hour > 12 ? hour - 12 : hour === 0 ? 12 : hour))
    setCreateMinute("00")
    setCreateAmPm(hour >= 12 ? "PM" : "AM")
    setShowCreateModal(true)
  }

  const handleCalendarDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId)
  }

  const handleDropOnCalendarSlot = async (e: React.DragEvent, dateStr: string, hour: number) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData("text/plain")
    if (!taskId) return

    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const formattedHr = String(hour).padStart(2, "0")
    const newStart = new Date(`${dateStr}T${formattedHr}:00:00`).toISOString()
    const newEnd = new Date(new Date(newStart).getTime() + (task.duration || 60) * 60000).toISOString()

    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      startTime: newStart,
      endTime: newEnd
    } : t))

    await editTask(taskId, {
      startTime: newStart,
      endTime: newEnd
    })
  }



  const handleApplyTimePreset = (preset: string, mode: "create" | "edit") => {
    const today = new Date().toISOString().split("T")[0]
    const tom = new Date()
    tom.setDate(tom.getDate() + 1)
    const tomorrow = tom.toISOString().split("T")[0]

    let d = today
    let hr = "9"
    let min = "00"
    let amPm = "AM"

    if (preset === "today_morning") {
      d = today; hr = "9"; min = "00"; amPm = "AM"
    } else if (preset === "today_afternoon") {
      d = today; hr = "2"; min = "00"; amPm = "PM"
    } else if (preset === "today_evening") {
      d = today; hr = "7"; min = "00"; amPm = "PM"
    } else if (preset === "tomorrow_morning") {
      d = tomorrow; hr = "9"; min = "00"; amPm = "AM"
    } else if (preset === "tomorrow_evening") {
      d = tomorrow; hr = "7"; min = "00"; amPm = "PM"
    }

    if (mode === "create") {
      setCreateDate(d)
      setCreateHour(hr)
      setCreateMinute(min)
      setCreateAmPm(amPm)
    } else {
      setEditDate(d)
      setEditHour(hr)
      setEditMinute(min)
      setEditAmPm(amPm)
    }
  }

  const getPriorityColor = (prio: number) => {
    if (prio <= 3) return "#7A967A" // Sage / Olive
    if (prio <= 6) return "#C5A880" // Beige / Sand
    if (prio <= 8) return "#D2B48C" // Tan
    return "#B38E8E" // Dusty Rose / Copper
  }

  const getPrioritySliderStyle = (val: number) => {
    const pct = ((val - 1) / 9) * 100
    const color = getPriorityColor(val)
    return {
      background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #22242A ${pct}%, #22242A 100%)`,
      accentColor: color,
      transition: "background 0.15s ease-out"
    }
  }

  const getPrioLabel = (val: number) => {
    if (val <= 3) return "Low"
    if (val <= 7) return "Medium"
    return "High"
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamNameInput.trim() || !uid) return
    try {
      const code = "PRODO-" + Math.random().toString(36).substr(2, 4).toUpperCase()
      const newTeam = {
        name: teamNameInput.trim(),
        code,
        creator: uid,
        members: [uid],
        memberNames: {
          [uid]: userProfile?.displayName || "Teammate"
        },
        createdAt: new Date().toISOString()
      }
      await addDoc(collection(db, "teams"), newTeam)
      setTeamNameInput("")
    } catch (err) {
      console.error("Error creating team:", err)
    }
  }

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCodeInput.trim() || !uid) return
    try {
      const qTeam = query(collection(db, "teams"), where("code", "==", joinCodeInput.trim().toUpperCase()))
      const snap = await getDocs(qTeam)
      if (snap.empty) {
        alert("Invite code not found.")
        return
      }
      const teamDoc = snap.docs[0]
      const tId = teamDoc.id
      const tData = teamDoc.data()
      
      await updateDoc(doc(db, "teams", tId), {
        members: [...tData.members, uid],
        [`memberNames.${uid}`]: userProfile?.displayName || "Teammate"
      })

      await addDoc(collection(db, "activity_feed"), {
        teamId: tId,
        message: `${userProfile?.displayName || "Teammate"} joined the team!`,
        createdAt: new Date().toISOString()
      })

      setJoinCodeInput("")
    } catch (err) {
      console.error("Error joining team:", err)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommentText.trim() || !activeCommentTaskId || !uid) return
    try {
      await addDoc(collection(db, "comments"), {
        taskId: activeCommentTaskId,
        uid,
        userName: userProfile?.displayName || "Teammate",
        content: newCommentText.trim(),
        createdAt: new Date().toISOString()
      })
      setNewCommentText("")
    } catch (err) {
      console.error(err)
    }
  }

  const locationCounts = analyticsHabits.reduce((acc: any, curr: any) => {
    const loc = curr.location || "other"
    acc[loc] = (acc[loc] || 0) + 1
    return acc
  }, {})

  const averageFocus = analyticsHabits.length
    ? (analyticsHabits.reduce((sum, h) => sum + (h.focus_score || 0), 0) / analyticsHabits.length).toFixed(1)
    : "N/A"

  const totalFocusMins = analyticsHabits.reduce((sum, h) => sum + (h.duration_minutes || 0), 0)

  const navItems = [
    { id: "home", label: "Home / Assistant", icon: <HomeIcon className="w-[18px] h-[18px]" /> },
    { id: "tasks", label: "Planner Board", icon: <BoardIcon className="w-[18px] h-[18px]" /> },
    { id: "calendar", label: "Calendar Log", icon: <CalendarIcon className="w-[18px] h-[18px]" /> },
    { id: "analytics", label: "Insights", icon: <ChartIcon className="w-[18px] h-[18px]" /> },
    { id: "collaboration", label: "Teammates", icon: <UserGroupIcon className="w-[18px] h-[18px]" /> },
    { id: "settings", label: "Preferences", icon: <CogIcon className="w-[18px] h-[18px]" /> }
  ]

  if (authChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#18181B] text-[#C5A880]">
        <div className="animate-pulse tracking-widest font-sans text-xs uppercase font-extrabold">Reading Planner Logs...</div>
      </div>
    )
  }

  if (!uid) {
    return <AuthInterface onAuthSuccess={(newUid) => setUid(newUid)} />
  }

  return (
    <div className="flex h-screen bg-[#18181B] text-[#ECE0D2] font-sans overflow-hidden select-none">
      
      {/* 1. Left Sidebar Navigation Panel */}
      <div className="w-[260px] flex flex-col border-r border-[#2A2D35] bg-[#1D1F25] overflow-hidden flex-shrink-0">
        <div className="p-6 border-b border-[#2A2D35] flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center gap-4 mb-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#3E2723] border border-[#6B4423] flex items-center justify-center text-lg shadow-md hover:scale-105 transition-all">
              🌿
            </div>
            <span className="font-black tracking-widest text-[20px] text-[#ECE0D2] translate-y-[2px]">PRODO</span>
          </div>
          <span className="text-[10px] text-[#C5A880]/70 font-bold uppercase tracking-wider select-none">AI Task & Calendar Manager</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {navItems.map(navItem => {
            const isSelected = activeTab === navItem.id
            return (
              <button
                key={navItem.id}
                onClick={() => setActiveTab(navItem.id as any)}
                className={`w-full h-11 text-left pl-6 pr-4 rounded-xl text-[13px] font-extrabold tracking-wide transition-all duration-200 relative flex items-center gap-4 overflow-hidden group ${
                  isSelected ? "text-[#ECE0D2]" : "text-[#C5A880] hover:text-[#ECE0D2] hover:bg-[#2A2D35]/20"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="sidebarActiveBg"
                    className="absolute inset-0 bg-[#2A2D35] border border-[#2A2D35] rounded-xl shadow-md"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                {navItem.icon && (
                  <span className={`relative z-10 transition-colors duration-200 ${isSelected ? "text-[#ECE0D2]" : "text-[#C5A880] group-hover:text-[#ECE0D2]"}`}>
                    {navItem.icon}
                  </span>
                )}
                <span className="relative z-10">
                  {navItem.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* User Card */}
        <div className="px-6 py-5 border-t border-[#2A2D35] flex items-center gap-3 bg-[#22242A] flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#BC8F8F] to-[#7A967A] flex items-center justify-center font-black text-sm text-[#18181B] shadow-sm flex-shrink-0">
            {(userProfile?.displayName || "U")[0].toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1">
            <div className="text-[13px] font-extrabold text-[#ECE0D2] truncate leading-tight">
              {userProfile?.displayName || "Prodo User"}
            </div>
            <div className="text-[11px] text-[#C5A880]/80 font-bold truncate mt-1 leading-tight">
              {userProfile?.email || ""}
            </div>
          </div>
          <button
            onClick={() => setShowProfileModal(true)}
            className="w-8 h-8 rounded-lg bg-[#1D1F25] border border-[#2A2D35] hover:bg-[#2A2D35] hover:border-[#C5A880]/30 text-[#C5A880] hover:text-[#ECE0D2] transition shadow-sm flex items-center justify-center flex-shrink-0"
            title="Profile & Settings"
          >
            <CogIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1 overflow-hidden"
          >
            
            {/* TAB 1: HOME */}
            {activeTab === "home" && (
              <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-[#18181B]">
                {/* Chat Panel */}
                <div className="flex-1 flex flex-col border-r border-[#2A2D35] overflow-hidden bg-white/[0.01]">
                  <ChatInterface
                    messages={messages}
                    thinking={thinking}
                    loading={loading}
                    onSend={sendMessage}
                    uid={uid}
                  />
                </div>

                {/* Dashboard Panel */}
                <div className="w-full lg:w-[380px] overflow-y-auto bg-[#1D1F25]/40 p-6 space-y-6 flex-shrink-0 border-t lg:border-t-0 border-[#2A2D35]">
                  <div>
                    <span className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-2">Metrics Summary</span>
                    <ProductivityCard score={score.score} streak={score.streak} />
                  </div>

                  {/* Quick Add */}
                  <form onSubmit={handleQuickAdd} className="bg-[#2A2D35]/25 border border-[#2A2D35]/40 p-4 rounded-2xl space-y-3.5 shadow-md">
                    <span className="text-[10px] font-bold text-[#C5A880] uppercase tracking-wider block">⚡ Quick Planner</span>
                    <input
                      type="text"
                      required
                      placeholder="Add a fast task..."
                      value={quickTitle}
                      onChange={e => setQuickTitle(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]/30 transition"
                    />
                    <div className="flex gap-2 justify-between items-center">
                      <select
                        value={quickPriority}
                        onChange={e => setQuickPriority(e.target.value)}
                        className="px-2 py-1.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[11px] text-[#C5A880] focus:outline-none cursor-pointer"
                      >
                        <option value="high">🔴 High</option>
                        <option value="medium">🟠 Medium</option>
                        <option value="low">🟢 Low</option>
                      </select>
                      <select
                        value={quickList}
                        onChange={e => setQuickList(e.target.value)}
                        className="px-2 py-1.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[11px] text-[#C5A880] focus:outline-none cursor-pointer"
                      >
                        {boardLists.map(bl => (
                          <option key={bl.id} value={bl.id}>{bl.name}</option>
                        ))}
                      </select>
                      <button type="submit" className="px-4 py-2 bg-[#3E2723] hover:bg-[#4E3629] border border-[#6B4423] text-[#ECE0D2] rounded-xl text-[11px] font-bold transition shadow-sm">
                        Add Task
                      </button>
                    </div>
                  </form>

                  {/* Today Timeline */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-[#C5A880] uppercase tracking-wider block">Today&apos;s Schedule</span>
                    <div className="space-y-2">
                      {getTodayTasks().length === 0 ? (
                        <div className="text-[13px] text-[#C5A880] italic py-2 font-medium">No tasks scheduled for today. Cozy desk time! 🕯️</div>
                      ) : (
                        getTodayTasks().map(task => (
                          <motion.div
                            key={task.id}
                            layoutId={`task-home-${task.id}`}
                            className="p-3.5 bg-[#2A2D35]/20 border border-[#2A2D35]/40 rounded-2xl flex items-center justify-between shadow-sm"
                          >
                            <div className="truncate pr-2">
                              <span className="text-[14px] font-extrabold text-[#ECE0D2] block truncate">{task.title}</span>
                              <span className="text-[10px] text-[#C5A880] font-bold block mt-0.5">
                                ⏰ {task.startTime ? new Date(task.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "All-day"}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCompleteOptimistic(task.id!)}
                              className="w-7 h-7 flex items-center justify-center bg-[#7A967A]/20 border border-[#7A967A]/40 text-[#7A967A] rounded-xl hover:bg-[#7A967A]/30 transition flex-shrink-0"
                            >
                              ✓
                            </button>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 🔥 High Priority / Alerts */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-[#B38E8E] uppercase tracking-wider block">🔥 Alerts & High Priority</span>
                    <div className="space-y-2">
                      {getHighPriorityTasks().length === 0 ? (
                        <div className="text-[13px] text-[#C5A880] italic py-2 font-medium">No urgent alerts. ✨</div>
                      ) : (
                        getHighPriorityTasks().map(task => {
                          const overdue = isOverdue(task)
                          return (
                            <motion.div
                              key={task.id}
                              layoutId={`task-hp-${task.id}`}
                              className={`p-3.5 border rounded-2xl flex items-center justify-between shadow-sm ${overdue ? "border-[#B38E8E]/40 bg-[#B38E8E]/10" : "border-[#2A2D35]/40 bg-[#2A2D35]/20"}`}
                            >
                              <div className="truncate pr-2">
                                <span className="text-[14px] font-extrabold text-[#ECE0D2] block truncate">{task.title}</span>
                                <div className="flex gap-2 mt-0.5 items-center">
                                  {overdue && <span className="text-[10px] font-black text-[#B38E8E] uppercase tracking-wider">OVERDUE</span>}
                                  <span className="text-[10px] font-bold text-[#C5A880]">
                                    {Math.round((task.priority ?? task.priority_score ?? 50) / 10) >= 8 ? "🔴 P1" : Math.round((task.priority ?? task.priority_score ?? 50) / 10) >= 4 ? "🟠 P2" : "🟢 P3"}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleCompleteOptimistic(task.id!)}
                                className="w-7 h-7 flex items-center justify-center bg-[#7A967A]/20 border border-[#7A967A]/40 text-[#7A967A] rounded-xl hover:bg-[#7A967A]/30 transition flex-shrink-0"
                              >
                                ✓
                              </button>
                            </motion.div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Upcoming */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block">Upcoming Tasks</span>
                    <div className="space-y-2">
                      {getUpcomingTasks().length === 0 ? (
                        <div className="text-[13px] text-[#C5A880] italic py-2 font-medium">No future tasks.</div>
                      ) : (
                        getUpcomingTasks().slice(0, 3).map(task => (
                          <div key={task.id} className="p-4 bg-[#2A2D35] border border-[#2A2D35] rounded-3xl flex items-center justify-between shadow-sm">
                            <div className="truncate pr-2">
                              <span className="text-[15px] font-extrabold text-[#ECE0D2] block truncate">{task.title}</span>
                              <span className="text-[11px] text-[#C5A880] block mt-1 font-bold">📅 {task.dueDate || new Date(task.startTime || 0).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TASKBOARD */}
            {activeTab === "tasks" && (
              <div className="h-full overflow-y-auto p-8 space-y-6 bg-[#18181B] flex flex-col justify-between">
                <div className="space-y-6 max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
                  
                  {/* Header Section */}
                  <div className="space-y-2 flex-shrink-0">
                    <h2 className="text-[32px] font-black text-[#ECE0D2] tracking-tight">
                      Planner Notebook
                    </h2>
                    <p className="text-[14px] text-[#C5A880] font-medium mt-1">
                      Drag tasks across customizable workspace notebook sections
                    </p>
                  </div>

                  {/* Search & Filter Bar & Action Buttons (Aligned) */}
                  <div className="flex flex-col lg:flex-row items-center gap-3 bg-[#22242A] border border-[#2A2D35] p-3 rounded-2xl shadow-md w-full flex-shrink-0">
                    <div className="relative flex-1 w-full">
                      <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] focus:outline-none placeholder-[#C5A880]/30"
                      />
                      <span className="absolute left-3.5 top-3 text-[#C5A880]/60">
                        <SearchIcon className="w-4 h-4" />
                      </span>
                    </div>

                    <div className="w-full sm:w-48 flex-shrink-0">
                      <select
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value)}
                        className="w-full h-10 px-3.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#C5A880] focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Priorities</option>
                        <option value="high">🔴 High (8-10)</option>
                        <option value="medium">🟡 Medium (4-7)</option>
                        <option value="low">🟢 Low (1-3)</option>
                      </select>
                    </div>

                    <div className="w-full sm:w-48 flex-shrink-0">
                      <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="w-full h-10 px-3.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#C5A880] focus:outline-none cursor-pointer"
                      >
                        <option value="date">Sort: Date</option>
                        <option value="priority">Sort: Priority</option>
                        <option value="alphabetical">Sort: Name</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto flex-shrink-0 justify-end">
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="h-10 px-5 bg-[#3E2723] hover:bg-[#4E3629] border border-[#6B4423] text-[#ECE0D2] rounded-xl text-xs font-bold shadow-md transition duration-200 w-full lg:w-auto"
                      >
                        + Add Task
                      </button>
                      <button
                        onClick={handleAddBoardList}
                        className="h-10 px-5 bg-[#22242A] border border-[#2A2D35] hover:bg-[#2A2D35] text-[#ECE0D2] rounded-xl text-xs font-bold transition duration-200 w-full lg:w-auto"
                      >
                        + New List
                      </button>
                    </div>
                  </div>
                  {/* Drag and Drop Notebook Lists */}
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="board" direction="horizontal" type="column">
                      {(providedBoard) => (
                        <div
                          {...providedBoard.droppableProps}
                          ref={providedBoard.innerRef}
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full pb-8"
                        >
                          {boardLists.map((list, listIndex) => {
                            const listColor = getListColorClasses(list.color)
                            const listTasks = getProcessedTasksForList(list.id)
                            const completedTasks = getCompletedTasksForList(list.id)

                            return (
                              <Draggable key={list.id} draggableId={list.id} index={listIndex}>
                                {(providedList) => (
                                  <div
                                    ref={providedList.innerRef}
                                    {...providedList.draggableProps}
                                    {...providedList.dragHandleProps}
                                    className="w-full h-[460px] rounded-[24px] border border-[#2A2D35] bg-[#22242A] pt-5 pb-5 pr-5 pl-7 flex flex-col space-y-3.5 shadow-lg overflow-hidden relative"
                                    style={{
                                      ...providedList.draggableProps.style,
                                    }}
                                  >
                                    {/* Notebook Spine Styling */}
                                    <div className="absolute left-0 top-0 bottom-0 w-[10px] rounded-l-[24px]" style={{ backgroundColor: listColor.hex }} />

                                    {/* List Header */}
                                    <div className="flex justify-between items-center flex-shrink-0 relative">
                                      <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="text-[18px] font-extrabold text-[#ECE0D2] flex items-center gap-2 truncate leading-tight">
                                          <span>{list.emoji || "🌿"}</span>
                                          <span>{list.name}</span>
                                        </h3>
                                        <span className="text-[12px] font-medium text-[#C5A880]/70 block mt-0.5">{listTasks.length} {listTasks.length === 1 ? "Task" : "Tasks"} pending</span>
                                      </div>
                                      <div className="flex items-center gap-3 bg-[#2A2D35]/50 border border-[#2A2D35] p-2 rounded-2xl flex-shrink-0">
                                        <button
                                          onClick={() => handleCycleListColor(list.id)}
                                          className="w-4 h-4 rounded-full border border-white/20 transition hover:scale-110 flex-shrink-0"
                                          style={{ backgroundColor: listColor.hex }}
                                          title="Cycle color"
                                        />
                                        <button
                                          onClick={() => handleRenameList(list.id)}
                                          className="text-[14px] text-[#C5A880] hover:text-[#ECE0D2] transition flex items-center flex-shrink-0"
                                          title="Rename List"
                                        >
                                          <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteList(list.id)}
                                          className="text-[14px] text-[#B38E8E]/60 hover:text-[#B38E8E] transition flex items-center flex-shrink-0"
                                          title="Delete List"
                                        >
                                          <TrashIcon className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Add Task Trigger */}
                                    <button
                                      onClick={() => {
                                        setCreateList(list.id)
                                        setShowCreateModal(true)
                                      }}
                                      className="w-full py-2 px-3 bg-transparent hover:bg-[#2A2D35]/25 text-[#C5A880]/80 hover:text-[#ECE0D2] rounded-xl text-[13px] font-bold transition flex items-center gap-2 flex-shrink-0 text-left justify-start"
                                    >
                                      <span className="text-[16px] leading-none">+</span>
                                      <span>Add task</span>
                                    </button>

                                    {/* Column Tasks list */}
                                    <Droppable droppableId={list.id} type="task">
                                      {(providedTasks, snapshotTasks) => (
                                        <div
                                          ref={providedTasks.innerRef}
                                          {...providedTasks.droppableProps}
                                          className={`flex-1 overflow-y-auto rounded-xl transition duration-150 p-0.5 divide-y divide-[#2A2D35]/30 ${
                                            snapshotTasks.isDraggingOver ? "bg-[#1D1F25]/30" : ""
                                          }`}
                                        >
                                          {listTasks.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                                              <span className="text-2xl">📭</span>
                                              <h4 className="text-[13px] font-extrabold text-[#ECE0D2]">No Tasks Pending</h4>
                                              <p className="text-[11px] text-[#C5A880]/70 max-w-[180px] leading-relaxed">
                                                All clean in this workspace section!
                                              </p>
                                            </div>
                                          ) : (
                                            listTasks.map((task, index) => {
                                              const itemKey = task.id || task.title
                                              const dueToday = isDueToday(task)
                                              const overdue = isOverdue(task)
                                              const displayPrio = Math.round((task.priority ?? task.priority_score ?? 50) / 10)
                                              const prioColor = getPriorityColor(displayPrio)

                                              return (
                                                <Draggable key={itemKey} draggableId={itemKey} index={index}>
                                                  {(providedTask, snapshotTask) => (
                                                    <div
                                                      ref={providedTask.innerRef}
                                                      {...providedTask.draggableProps}
                                                      {...providedTask.dragHandleProps}
                                                      style={{
                                                        ...providedTask.draggableProps.style,
                                                      }}
                                                    >
                                                      <motion.div
                                                        layout
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        style={{
                                                          borderLeft: `3px solid ${prioColor}`,
                                                        }}
                                                        className={`group/task flex flex-col py-2 px-2.5 bg-[#2A2D35]/15 hover:bg-[#2A2D35]/25 border border-[#2A2D35]/35 rounded-2xl mb-1.5 transition-all duration-200 cursor-grab relative ${
                                                          snapshotTask.isDragging ? "bg-[#2A2D35]/65 rounded-xl shadow-lg scale-[1.01]" : ""
                                                        }`}
                                                      >
                                                        {/* Collapsed/Compact Row */}
                                                        <div className="flex items-center justify-between gap-2 w-full">
                                                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                            {/* Circular Checkbox */}
                                                            <button
                                                              onClick={() => handleCompleteOptimistic(task.id!)}
                                                              className="w-4 h-4 rounded-full border flex items-center justify-center transition-all flex-shrink-0 text-[9px] font-bold hover:scale-110"
                                                              style={{
                                                                borderColor: prioColor,
                                                                color: prioColor,
                                                                backgroundColor: `${prioColor}15`
                                                              }}
                                                              title="Mark Complete"
                                                            >
                                                              <span className="opacity-0 group-hover/task:opacity-100 transition-opacity">✓</span>
                                                            </button>

                                                            {/* Task Title */}
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                              <span className="text-[13px] font-bold text-[#ECE0D2] truncate block">
                                                                {task.title}
                                                              </span>
                                                              {task.pinned && <span className="text-[10px]" title="Pinned">📌</span>}
                                                            </div>
                                                          </div>

                                                          {/* Badges and Expand Toggle */}
                                                          <div className="flex items-center gap-2 flex-shrink-0">
                                                            {task.dueDate && (
                                                              <span className="text-[9px] text-[#C5A880]/60 font-bold bg-[#2A2D35]/30 px-1.5 py-0.5 rounded-lg border border-[#2A2D35]/50 flex items-center gap-0.5">
                                                                📅 {task.dueDate}
                                                              </span>
                                                            )}
                                                            <span 
                                                              style={{ color: prioColor, borderColor: `${prioColor}30`, backgroundColor: `${prioColor}10` }} 
                                                              className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg border uppercase tracking-wider"
                                                            >
                                                              {displayPrio >= 8 ? "P1" : displayPrio >= 4 ? "P2" : "P3"}
                                                            </span>
                                                            <button
                                                              type="button"
                                                              onClick={(e) => {
                                                                e.stopPropagation()
                                                                setExpandedDescriptions(prev => ({ ...prev, [task.id!]: !prev[task.id!] }))
                                                              }}
                                                              className="text-[#C5A880]/70 hover:text-[#ECE0D2] p-0.5 hover:bg-[#2A2D35]/50 rounded-lg transition flex items-center justify-center"
                                                              title={expandedDescriptions[task.id!] ? "Collapse details" : "Expand details"}
                                                            >
                                                              <svg 
                                                                className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedDescriptions[task.id!] ? "rotate-180" : ""}`} 
                                                                fill="none" 
                                                                viewBox="0 0 24 24" 
                                                                stroke="currentColor" 
                                                                strokeWidth="2.5" 
                                                                strokeLinecap="round" 
                                                                strokeLinejoin="round"
                                                              >
                                                                <polyline points="6 9 12 15 18 9" />
                                                              </svg>
                                                            </button>
                                                          </div>
                                                        </div>

                                                        {/* Expanded Section */}
                                                        <AnimatePresence initial={false}>
                                                          {expandedDescriptions[task.id!] && (
                                                            <motion.div
                                                              initial={{ height: 0, opacity: 0 }}
                                                              animate={{ height: "auto", opacity: 1 }}
                                                              exit={{ height: 0, opacity: 0 }}
                                                              transition={{ duration: 0.2 }}
                                                              className="overflow-hidden w-full text-left"
                                                            >
                                                              <div className="mt-2.5 pt-2.5 border-t border-[#2A2D35]/40 flex flex-col gap-2.5 text-xs">
                                                                {/* Description */}
                                                                {task.description && task.description.trim() && (
                                                                  <div>
                                                                    <span className="text-[10px] font-bold text-[#C5A880]/60 uppercase tracking-wider block mb-0.5">Description</span>
                                                                    <p className="text-[11.5px] font-medium text-[#ECE0D2]/90 leading-relaxed break-words whitespace-pre-wrap">
                                                                      {task.description}
                                                                    </p>
                                                                  </div>
                                                                )}

                                                                {/* Real Subtasks List */}
                                                                {task.subtasks && task.subtasks.length > 0 && (
                                                                  <div>
                                                                    <span className="text-[10px] font-bold text-[#C5A880]/60 uppercase tracking-wider block mb-1">Subtasks</span>
                                                                    <div className="space-y-1.5 pl-1.5 border-l border-[#2A2D35]/50 ml-1">
                                                                      {task.subtasks.map((st: any) => (
                                                                        <div 
                                                                          key={st.id} 
                                                                          className="flex items-center justify-between p-2 bg-[#2A2D35]/10 hover:bg-[#2A2D35]/15 border border-[#2A2D35]/30 rounded-xl transition duration-150"
                                                                        >
                                                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                            <button
                                                                              type="button"
                                                                              onClick={() => handleToggleSubtask(task, st.id)}
                                                                              className="w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 text-[8px] font-bold hover:scale-110"
                                                                              style={{
                                                                                borderColor: st.completed ? "#7A967A" : "#C5A880",
                                                                                color: "#7A967A",
                                                                                backgroundColor: st.completed ? "#7A967A15" : "transparent"
                                                                              }}
                                                                            >
                                                                              {st.completed && "✓"}
                                                                            </button>
                                                                            <span className={`text-[11px] font-medium truncate block ${st.completed ? "text-[#C5A880]/50 line-through" : "text-[#ECE0D2]"}`}>
                                                                              {st.title}
                                                                            </span>
                                                                          </div>
                                                                          <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteSubtaskDirectly(task, st.id)}
                                                                            className="text-[#B38E8E]/70 hover:text-[#B38E8E] p-1 rounded hover:bg-[#B38E8E]/10 transition flex items-center justify-center ml-2"
                                                                            title="Delete subtask"
                                                                          >
                                                                            <TrashIcon className="w-3 h-3" />
                                                                          </button>
                                                                        </div>
                                                                      ))}
                                                                    </div>
                                                                  </div>
                                                                )}

                                                                {/* Notes */}
                                                                {task.notes && task.notes.trim() && (
                                                                  <div>
                                                                    <span className="text-[10px] font-bold text-[#C5A880]/60 uppercase tracking-wider block mb-0.5">Notes</span>
                                                                    <p className="text-[11px] font-medium text-[#C5A880]/80 italic bg-[#1D1F25]/20 p-2 rounded-xl border border-[#2A2D35]/30 break-words whitespace-pre-wrap">
                                                                      {task.notes}
                                                                    </p>
                                                                  </div>
                                                                )}

                                                                {/* Action Buttons */}
                                                                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#2A2D35]/20 mt-0.5 w-full">
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                      const timeSplit = parseISOSplits(task.startTime)
                                                                      setEditingTask(task)
                                                                      setEditTitle(task.title)
                                                                      setEditDescription(task.description || "")
                                                                      setEditDate(timeSplit.date || task.dueDate || "")
                                                                      setEditHour(timeSplit.hour)
                                                                      setEditMinute(timeSplit.minute)
                                                                      setEditAmPm(timeSplit.amPm)
                                                                      setEditDuration(task.duration || 60)
                                                                      setEditPriority(displayPrio)
                                                                      setEditList(task.listId || "list-1")
                                                                      setEditNotes(task.notes || "")
                                                                      setEditReminder(task.reminder || false)
                                                                      setEditRepeat(task.repeat || "none")
                                                                      setEditAssignee(task.assignedTo || "")
                                                                      setEditSubtasks(task.subtasks || [])
                                                                      setNewEditSubtaskTitle("")
                                                                      setEditValidationError(null)
                                                                    }}
                                                                    className="px-2 py-1 bg-[#2A2D35]/50 hover:bg-[#2A2D35] border border-[#2A2D35] rounded-xl text-[#ECE0D2] transition flex items-center gap-1 font-bold text-[10px]"
                                                                    title="Edit task"
                                                                  >
                                                                    <EditIcon className="w-3 h-3" />
                                                                    <span>Edit</span>
                                                                  </button>

                                                                  <div className="relative">
                                                                    <button
                                                                      type="button"
                                                                      onClick={() => setReschedulingTaskId(reschedulingTaskId === task.id ? null : task.id!)}
                                                                      className="px-2 py-1 bg-[#2A2D35]/50 hover:bg-[#2A2D35] border border-[#2A2D35] rounded-xl text-[#C5A880] hover:text-[#ECE0D2] transition font-bold text-[10px]"
                                                                    >
                                                                      Reschedule
                                                                    </button>
                                                                    {reschedulingTaskId === task.id && (
                                                                      <div className="absolute left-0 bottom-full mb-1.5 bg-[#22242A] border border-[#2A2D35] p-1.5 rounded-xl shadow-xl z-40 space-y-1 flex flex-col w-28">
                                                                        <button type="button" onClick={() => handleQuickReschedule(task.id!, 0)} className="text-[10px] text-left px-1.5 py-1 hover:bg-[#2A2D35] text-[#ECE0D2] font-bold">Today</button>
                                                                        <button type="button" onClick={() => handleQuickReschedule(task.id!, 1)} className="text-[10px] text-left px-1.5 py-1 hover:bg-[#2A2D35] text-[#ECE0D2] font-bold">Tomorrow</button>
                                                                        <button type="button" onClick={() => handleQuickReschedule(task.id!, 3)} className="text-[10px] text-left px-1.5 py-1 hover:bg-[#2A2D35] text-[#ECE0D2] font-bold">3 Days</button>
                                                                        <button type="button" onClick={() => handleQuickReschedule(task.id!, 7)} className="text-[10px] text-left px-1.5 py-1 hover:bg-[#2A2D35] text-[#ECE0D2] font-bold">Next Week</button>
                                                                      </div>
                                                                    )}
                                                                  </div>

                                                                  <button
                                                                    type="button"
                                                                    onClick={() => togglePin(task)}
                                                                    className={`px-2 py-1 border rounded-xl text-[10px] transition font-bold ${
                                                                      task.pinned 
                                                                        ? "bg-[#C5A880]/20 border-[#C5A880]/30 text-[#C5A880]" 
                                                                        : "bg-[#2A2D35]/50 hover:bg-[#2A2D35] border-[#2A2D35] text-[#C5A880]/60 hover:text-[#C5A880]"
                                                                    }`}
                                                                  >
                                                                    📌 {task.pinned ? "Pinned" : "Pin"}
                                                                  </button>

                                                                  <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteOptimistic(task)}
                                                                    className="px-2 py-1 bg-[#B38E8E]/10 hover:bg-[#B38E8E]/20 border border-[#B38E8E]/20 hover:border-[#B38E8E]/40 text-[#B38E8E] rounded-xl transition flex items-center gap-1 font-bold text-[10px] ml-auto"
                                                                  >
                                                                    <TrashIcon className="w-3 h-3" />
                                                                    <span>Delete</span>
                                                                  </button>
                                                                </div>
                                                              </div>
                                                            </motion.div>
                                                          )}
                                                        </AnimatePresence>
                                                      </motion.div>
                                                    </div>
                                                  )}
                                                </Draggable>
                                              )
                                            })
                                          )}
                                          {providedTasks.placeholder}
                                        </div>
                                      )}
                                    </Droppable>

                                    {/* Collapsible Completed Section inside List Card */}
                                    {completedTasks.length > 0 && (
                                      <div className="mt-2.5 border-t border-[#2A2D35]/30 pt-2 flex-shrink-0">
                                        <button
                                          onClick={() => setExpandedCompletedLists(prev => ({ ...prev, [list.id]: !prev[list.id] }))}
                                          className="w-full flex items-center justify-between text-[11px] font-bold text-[#C5A880]/60 hover:text-[#C5A880] transition uppercase tracking-wider py-1 px-1.5"
                                        >
                                          <span>Completed ({completedTasks.length})</span>
                                          <span>{expandedCompletedLists[list.id] ? "▾" : "▸"}</span>
                                        </button>

                                        {expandedCompletedLists[list.id] && (
                                          <div className="space-y-1.5 mt-1.5 max-h-[120px] overflow-y-auto pr-1 divide-y divide-[#2A2D35]/15">
                                            {completedTasks.map(task => (
                                              <div
                                                key={task.id}
                                                className="flex items-center gap-2.5 py-1.5 px-2 bg-[#2A2D35]/10 rounded-lg text-[#C5A880]/60 text-[12px] group transition"
                                              >
                                                <button
                                                  onClick={() => handleRestoreTask(task.id!)}
                                                  className="w-4 h-4 rounded-full border border-[#7A967A] bg-[#7A967A]/25 flex items-center justify-center text-[#7A967A] text-[9px] flex-shrink-0"
                                                  title="Restore task"
                                                >
                                                  ✓
                                                </button>
                                                <span className="flex-1 truncate line-through">{task.title}</span>
                                                <button
                                                  onClick={() => {
                                                    if (confirm("Permanently delete this task?")) {
                                                      deleteTask(task.id!)
                                                    }
                                                  }}
                                                  className="opacity-0 group-hover:opacity-100 transition text-[#B38E8E] hover:text-red-400 text-[10px] flex-shrink-0"
                                                  title="Delete permanently"
                                                >
                                                  🗑
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                  </div>
                                )}
                              </Draggable>
                            )
                          })}
                          {providedBoard.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </div>
            )}

            {/* TAB 3: CALENDAR */}
            {activeTab === "calendar" && (
              <div className="h-full overflow-hidden p-8 bg-[#18181B] flex flex-col space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-[#2A2D35] pb-4 flex-shrink-0">
                  <div className="flex flex-col sm:flex-row items-baseline gap-3">
                    <h2 className="text-[32px] font-black text-[#ECE0D2] tracking-tight leading-none">
                      {formatMonthYear(calendarDate)}
                    </h2>
                    <span className="text-[13px] text-[#C5A880] font-medium uppercase tracking-wide">
                      ({calendarView} view)
                    </span>
                  </div>

                  {/* Navigation controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-[#22242A] border border-[#2A2D35] rounded-2xl p-1 shadow-sm">
                      <button
                        onClick={handlePrevYear}
                        className="px-2.5 py-1.5 hover:bg-[#2A2D35] text-xs font-bold text-[#C5A880] hover:text-[#ECE0D2] rounded-xl transition"
                        title="Prev Year"
                      >
                        &lt;&lt;
                      </button>
                      <button
                        onClick={handlePrevMonth}
                        className="px-3 py-1.5 hover:bg-[#2A2D35] text-xs font-bold text-[#C5A880] hover:text-[#ECE0D2] rounded-xl transition"
                        title="Prev Month"
                      >
                        &lt;
                      </button>
                      <button
                        onClick={handleGoToday}
                        className="px-3.5 py-1.5 hover:bg-[#2A2D35] text-xs font-black text-[#C5A880] hover:text-[#ECE0D2] rounded-xl transition border-l border-r border-[#2A2D35]"
                      >
                        Today
                      </button>
                      <button
                        onClick={handleNextMonth}
                        className="px-3 py-1.5 hover:bg-[#2A2D35] text-xs font-bold text-[#C5A880] hover:text-[#ECE0D2] rounded-xl transition"
                        title="Next Month"
                      >
                        &gt;
                      </button>
                      <button
                        onClick={handleNextYear}
                        className="px-2.5 py-1.5 hover:bg-[#2A2D35] text-xs font-bold text-[#C5A880] hover:text-[#ECE0D2] rounded-xl transition"
                        title="Next Year"
                      >
                        &gt;&gt;
                      </button>
                    </div>

                    <div className="flex items-center bg-[#22242A] border border-[#2A2D35] rounded-2xl p-1 shadow-sm">
                      {["month", "week", "day"].map(viewOpt => (
                        <button
                          key={viewOpt}
                          onClick={() => setCalendarView(viewOpt as any)}
                          className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition ${
                            calendarView === viewOpt ? "bg-[#2A2D35] border border-[#2A2D35] text-[#ECE0D2] shadow-md" : "text-[#C5A880] hover:text-[#ECE0D2]"
                          }`}
                        >
                          {viewOpt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Calendar Panel Grid */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-[#22242A] border border-[#2A2D35] rounded-3xl relative p-5 shadow-lg">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={calendarDate.toISOString() + calendarView}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                    >
                      {/* Month */}
                      {calendarView === "month" && (
                        <div className="grid grid-cols-7 gap-2 h-full min-h-[500px]">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <div key={day} className="text-center font-bold text-[11px] uppercase tracking-wider text-[#C5A880] pb-2 border-b border-[#2A2D35]">{day}</div>
                          ))}
                          {getMonthDays(calendarDate).map((day, idx) => {
                            const dayTasks = tasks.filter(t => t.status !== "completed" && t.startTime && isSameDay(new Date(t.startTime), day))
                            const isToday = isSameDay(new Date(), day)
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  setCalendarDate(day)
                                  setCalendarView("day")
                                }}
                                className={`min-h-[85px] p-2.5 bg-[#2A2D35] border rounded-2xl hover:bg-[#22242A] transition cursor-pointer flex flex-col justify-between shadow-sm ${
                                  isToday ? "border-[#C5A880] bg-[#C5A880]/5" : "border-[#2A2D35]"
                                }`}
                              >
                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full inline-block ${
                                  isToday ? "bg-[#C5A880] text-[#18181B]" : "text-[#C5A880]"
                                }`}>
                                  {day.getDate()}
                                </span>
                                <div className="space-y-1 mt-1.5 flex-1 overflow-hidden">
                                  {dayTasks.slice(0, 3).map(task => (
                                    <div
                                      key={task.id}
                                      className="px-1.5 py-0.5 rounded-lg text-[9px] truncate font-bold border"
                                      style={{ backgroundColor: `${task.color || "#6366f1"}15`, color: task.color || "#6366f1", borderColor: `${task.color || "#6366f1"}30` }}
                                    >
                                      {task.title}
                                    </div>
                                  ))}
                                  {dayTasks.length > 3 && (
                                    <span className="text-[9px] text-[#C5A880] font-black uppercase">+ {dayTasks.length - 3} more</span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Week Timeline */}
                      {calendarView === "week" && (
                        <div className="flex flex-col h-full min-h-[900px] overflow-x-auto">
                          <div className="grid grid-cols-8 gap-1 border-b border-[#2A2D35] pb-3 text-center text-xs font-bold text-[#C5A880]">
                            <div className="text-left pl-2">Hour</div>
                            {getWeekDates(calendarDate).map((day, i) => {
                              const isToday = isSameDay(new Date(), day)
                              return (
                                <div
                                  key={i}
                                  className={`py-1 rounded-xl cursor-pointer ${
                                    isToday ? "bg-[#C5A880]/15 text-[#C5A880] font-black border border-[#C5A880]/30" : "text-[#ECE0D2]"
                                  }`}
                                  onClick={() => {
                                    setCalendarDate(day)
                                    setCalendarView("day")
                                  }}
                                >
                                  {day.toLocaleDateString([], { weekday: 'short' })} {day.getDate()}
                                </div>
                              )
                            })}
                          </div>

                          <div className="relative flex-1 grid grid-cols-8 mt-2" style={{ height: "900px" }}>
                            <div className="col-span-1 border-r border-[#2A2D35] pr-2 space-y-[44px]">
                              {[8,9,10,11,12,13,14,15,16,17,18,19,20,21,22].map(hr => (
                                <div key={hr} className="text-[11px] text-[#C5A880] font-bold text-right h-4">
                                  {hr > 12 ? hr - 12 : hr}:00 {hr >= 12 ? "PM" : "AM"}
                                </div>
                              ))}
                            </div>

                            {getWeekDates(calendarDate).map((day, colIdx) => {
                              const dateStr = day.toISOString().split("T")[0]
                              const columnTasks = tasks.filter(t => t.status !== "completed" && t.startTime && isSameDay(new Date(t.startTime), day))

                              return (
                                <div
                                  key={colIdx}
                                  className="col-span-1 relative border-r border-[#2A2D35]/50 last:border-r-0"
                                  style={{ height: "900px" }}
                                >
                                  {[8,9,10,11,12,13,14,15,16,17,18,19,20,21,22].map(hour => (
                                    <div
                                      key={hour}
                                      onClick={() => handleCalendarSlotClick(dateStr, hour)}
                                      className="h-[60px] border-b border-[#2A2D35]/30 hover:bg-[#2A2D35]/30 transition cursor-pointer"
                                    />
                                  ))}

                                  {columnTasks.map(task => {
                                    const { top, height } = getTaskCalendarStyles(task)
                                    return (
                                      <div
                                        key={task.id}
                                        className="absolute left-1 right-1 p-2.5 rounded-2xl border z-20 cursor-pointer hover:shadow-lg transition-all overflow-hidden bg-[#2A2D35] border-[#2A2D35] shadow-md"
                                        style={{
                                          top: `${top}px`,
                                          height: `${height}px`,
                                          borderColor: `${task.color || "#6366f1"}35`,
                                          borderLeft: `4px solid ${task.color || "#6366f1"}`
                                        }}
                                        onDoubleClick={() => {
                                          const timeSplit = parseISOSplits(task.startTime)
                                          setEditingTask(task)
                                          setEditTitle(task.title)
                                          setEditDescription(task.description || "")
                                          setEditDate(timeSplit.date || task.dueDate || "")
                                          setEditHour(timeSplit.hour)
                                          setEditMinute(timeSplit.minute)
                                          setEditAmPm(timeSplit.amPm)
                                          setEditDuration(task.duration || 60)
                                          setEditPriority(Math.round((task.priority ?? task.priority_score ?? 50) / 10))
                                          setEditList(task.listId || "list-1")
                                          setEditNotes(task.notes || "")
                                          setEditReminder(task.reminder || false)
                                          setEditRepeat(task.repeat || "none")
                                          setEditAssignee(task.assignedTo || "")
                                        }}
                                      >
                                        <div className="font-extrabold text-[13px] text-[#ECE0D2] truncate">{task.title}</div>
                                        <div className="text-[11px] text-[#C5A880]/70 font-bold block mt-1 uppercase">
                                          ⏰ {new Date(task.startTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Day View */}
                      {calendarView === "day" && (
                        <div className="flex flex-col h-full min-h-[900px]">
                          <div className="border-b border-[#2A2D35] pb-2 text-center text-xs font-extrabold text-[#C5A880] uppercase tracking-wider">
                            {calendarDate.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>

                          <div className="relative flex-1 grid grid-cols-6 mt-2" style={{ height: "900px" }}>
                            <div className="col-span-1 border-r border-[#2A2D35] pr-2 space-y-[44px]">
                              {[8,9,10,11,12,13,14,15,16,17,18,19,20,21,22].map(hr => (
                                <div key={hr} className="text-[11px] text-[#C5A880] font-bold text-right h-4">
                                  {hr > 12 ? hr - 12 : hr}:00 {hr >= 12 ? "PM" : "AM"}
                                </div>
                              ))}
                            </div>

                            <div className="col-span-5 relative" style={{ height: "900px" }}>
                              {[8,9,10,11,12,13,14,15,16,17,18,19,20,21,22].map(hour => (
                                <div
                                  key={hour}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => handleDropOnCalendarSlot(e, calendarDate.toISOString().split("T")[0], hour)}
                                  onClick={() => handleCalendarSlotClick(calendarDate.toISOString().split("T")[0], hour)}
                                  className="h-[60px] border-b border-[#2A2D35]/30 hover:bg-[#2A2D35]/30 transition cursor-pointer"
                                />
                              ))}

                              {tasks.filter(t => t.status !== "completed" && t.startTime && isSameDay(new Date(t.startTime), calendarDate)).map(task => {
                                const { top, height } = getTaskCalendarStyles(task)
                                return (
                                  <div
                                    key={task.id}
                                    draggable="true"
                                    onDragStart={(e) => handleCalendarDragStart(e, task.id!)}
                                    className="absolute left-2 right-2 p-3 rounded-2xl border z-20 cursor-grab hover:shadow-lg transition bg-[#2A2D35] border-[#2A2D35] shadow-md"
                                    style={{
                                      top: `${top}px`,
                                      height: `${height}px`,
                                      borderColor: `${task.color || "#6366f1"}35`,
                                      borderLeft: `4px solid ${task.color || "#6366f1"}`
                                    }}
                                    onDoubleClick={() => {
                                      const timeSplit = parseISOSplits(task.startTime)
                                      setEditingTask(task)
                                      setEditTitle(task.title)
                                      setEditDescription(task.description || "")
                                      setEditDate(timeSplit.date || task.dueDate || "")
                                      setEditHour(timeSplit.hour)
                                      setEditMinute(timeSplit.minute)
                                      setEditAmPm(timeSplit.amPm)
                                      setEditDuration(task.duration || 60)
                                      setEditPriority(Math.round((task.priority ?? task.priority_score ?? 50) / 10))
                                      setEditList(task.listId || "list-1")
                                      setEditNotes(task.notes || "")
                                      setEditReminder(task.reminder || false)
                                      setEditRepeat(task.repeat || "none")
                                      setEditAssignee(task.assignedTo || "")
                                    }}
                                  >
                                    <div className="font-extrabold text-xs text-[#ECE0D2]">{task.title}</div>
                                    <div className="text-[11px] text-[#C5A880]/70 mt-1 font-bold uppercase block">
                                      ⏰ {new Date(task.startTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* TAB 4: ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="h-full overflow-y-auto p-8 bg-[#18181B] space-y-6">
                <div className="max-w-6xl mx-auto space-y-6">
                  <div>
                    <h2 className="text-[32px] font-black text-[#ECE0D2] tracking-tight">
                      Notebook Insights
                    </h2>
                    <p className="text-[13px] text-[#C5A880] font-medium mt-1">
                      Visual logs showing completion rates and focus location tracking
                    </p>
                  </div>

                  {analyticsLoading ? (
                    <div className="h-[40vh] flex items-center justify-center text-[#C5A880] animate-pulse uppercase tracking-wider text-[11px] font-bold">Querying ledger logs...</div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="bg-[#2A2D35] border border-[#2A2D35] p-5 rounded-3xl shadow-md">
                          <span className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block">Logged logs</span>
                          <div className="text-2xl font-black text-[#C5A880] mt-1">{analyticsHabits.length}</div>
                        </div>
                        <div className="bg-[#2A2D35] border border-[#2A2D35] p-5 rounded-3xl shadow-md">
                          <span className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block">Avg Focus score</span>
                          <div className="text-2xl font-black text-[#7A967A] mt-1">{averageFocus} <span className="text-xs text-[#C5A880] font-bold">/ 10</span></div>
                        </div>
                        <div className="bg-[#2A2D35] border border-[#2A2D35] p-5 rounded-3xl shadow-md">
                          <span className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block">Deep Work</span>
                          <div className="text-2xl font-black text-[#C5A880] mt-1">{(totalFocusMins / 60).toFixed(1)} <span className="text-xs text-[#C5A880] font-bold">hrs</span></div>
                        </div>
                        <div className="bg-[#2A2D35] border border-[#2A2D35] p-5 rounded-3xl shadow-md">
                          <span className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block">Completion rate</span>
                          <div className="text-2xl font-black text-[#B38E8E] mt-1">
                            {tasks.length > 0 ? ((completedTasks.length / tasks.length) * 100).toFixed(0) : 0}%
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Area Chart */}
                        <div className="bg-[#2A2D35] border border-[#2A2D35] p-5 rounded-3xl flex flex-col shadow-md">
                          <h3 className="text-xs font-black text-[#ECE0D2] uppercase tracking-wider mb-4">Productivity Scores</h3>
                          <div className="h-64 w-full">
                            {analyticsScores.length === 0 ? (
                              <div className="h-full flex items-center justify-center text-xs text-[#C5A880] italic font-bold">No scores written.</div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsScores}>
                                  <defs>
                                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#C5A880" stopOpacity={0.15}/>
                                      <stop offset="95%" stopColor="#C5A880" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#22242A" />
                                  <XAxis dataKey="date" stroke="#C5A880" fontSize={9} />
                                  <YAxis stroke="#C5A880" domain={[0, 100]} fontSize={9} />
                                  <Tooltip contentStyle={{ background: "#22242A", border: "1px solid #2A2D35" }} />
                                  <Area type="monotone" dataKey="score" stroke="#C5A880" fillOpacity={1} fill="url(#scoreGrad)" strokeWidth={2} name="Score" />
                                </AreaChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </div>

                        {/* Pie Chart */}
                        <div className="bg-[#2A2D35] border border-[#2A2D35] p-5 rounded-3xl flex flex-col shadow-md">
                          <h3 className="text-xs font-black text-[#ECE0D2] uppercase tracking-wider mb-4">Distribution</h3>
                          <div className="h-64 w-full flex items-center justify-center">
                            {boardLists.length === 0 ? (
                              <div className="text-xs text-[#C5A880] italic">No categories.</div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={boardLists.map(l => ({
                                      name: l.name,
                                      value: tasks.filter(t => t.listId === l.id).length
                                    }))}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={4}
                                    dataKey="value"
                                  >
                                    {boardLists.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ background: "#22242A", border: "1px solid #2A2D35" }} />
                                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[11px] text-[#C5A880] font-bold uppercase tracking-wider">{value}</span>} />
                                </PieChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: COLLABORATION */}
            {activeTab === "collaboration" && (
              <div className="h-full overflow-y-auto p-8 bg-[#18181B] flex flex-col space-y-6">
                <div className="max-w-6xl mx-auto w-full space-y-6">
                  <div>
                    <h2 className="text-[32px] font-black text-[#ECE0D2] tracking-tight">
                      Teammates
                    </h2>
                    <p className="text-[13px] text-[#C5A880] mt-1 font-medium">
                      Create or join shared collaborative planner workgroups
                    </p>
                  </div>

                  {!team ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                      <form onSubmit={handleCreateTeam} className="bg-[#2A2D35] border border-[#2A2D35] p-6 rounded-3xl space-y-4 shadow-md text-[#ECE0D2]">
                        <h3 className="text-[13px] font-black text-[#ECE0D2] uppercase tracking-wider">Initialize Planner Group</h3>
                        <input
                          type="text"
                          required
                          placeholder="Group name (e.g. Study Session)"
                          value={teamNameInput}
                          onChange={e => setTeamNameInput(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#22242A] border border-[#2A2D35] rounded-2xl text-[13px] focus:outline-none"
                        />
                        <button type="submit" className="px-5 py-2.5 bg-[#3E2723] hover:bg-[#4E3629] border border-[#6B4423] text-[#ECE0D2] rounded-2xl text-xs font-bold transition">
                          Create Group
                        </button>
                      </form>

                      <form onSubmit={handleJoinTeam} className="bg-[#2A2D35] border border-[#2A2D35] p-6 rounded-3xl space-y-4 shadow-md text-[#ECE0D2]">
                        <h3 className="text-[13px] font-black text-[#ECE0D2] uppercase tracking-wider">Join Team Workspace</h3>
                        <input
                          type="text"
                          required
                          placeholder="Workspace Code (e.g. PRODO-ABCD)"
                          value={joinCodeInput}
                          onChange={e => setJoinCodeInput(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#22242A] border border-[#2A2D35] rounded-2xl text-[13px] focus:outline-none"
                        />
                        <button type="submit" className="px-5 py-2.5 bg-[#22242A] border border-[#2A2D35] text-[#ECE0D2] hover:bg-[#2A2D35] rounded-2xl text-xs font-bold transition">
                          Join Group
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="bg-[#2A2D35] border border-[#2A2D35] p-5 rounded-3xl space-y-4 shadow-md">
                        <div>
                          <span className="text-[11px] text-[#C5A880] font-bold uppercase tracking-wider">Active Workspace</span>
                          <h3 className="text-base font-black text-[#ECE0D2] mt-0.5">{team.name}</h3>
                        </div>
                        <div className="bg-[#22242A] border border-[#2A2D35] p-3 rounded-2xl flex items-center justify-between shadow-sm">
                          <div>
                            <span className="text-[11px] text-[#C5A880] font-bold uppercase block">Invite Code</span>
                            <span className="text-xs font-black text-indigo-400">{team.code}</span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(team.code)
                              alert("Invite code copied!")
                            }}
                            className="px-3 py-1.5 bg-[#2A2D35] border border-[#2A2D35] text-[#ECE0D2] text-[11px] rounded-xl font-bold hover:bg-[#22242A] transition"
                          >
                            Copy
                          </button>
                        </div>

                        {/* Leaderboard */}
                        <div className="space-y-2.5">
                          <span className="text-[11px] text-[#C5A880] font-bold uppercase tracking-wider block">Leaderboard</span>
                          <div className="space-y-2">
                            {team.members.map((memberId: string) => {
                              const completedCount = teamTasks.filter(t => t.assignedTo === memberId && t.status === "completed").length
                              return (
                                <div key={memberId} className="flex justify-between items-center p-3 bg-[#22242A] border border-[#2A2D35] rounded-2xl text-xs">
                                  <span className="font-extrabold text-[#ECE0D2] truncate mr-2">{team.memberNames[memberId] || "Teammate"}</span>
                                  <span className="text-indigo-400 font-bold">{completedCount} Completed</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Shared Team Tasks */}
                      <div className="bg-[#2A2D35] border border-[#2A2D35] p-5 rounded-3xl space-y-4 lg:col-span-2 flex flex-col min-h-[500px] shadow-md">
                        <div>
                          <span className="text-[11px] text-[#C5A880] font-bold uppercase tracking-wider block">Shared Planner Ledger</span>
                          <p className="text-[11px] text-[#C5A880] mt-0.5 font-bold">Click a ledger task to read team logs</p>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[350px] pr-1">
                          {teamTasks.filter(t => t.status !== "completed").length === 0 ? (
                            <div className="text-center py-12 text-[11px] text-[#C5A880] italic font-bold">No active shared tasks.</div>
                          ) : (
                            teamTasks.filter(t => t.status !== "completed").map(task => (
                              <div
                                key={task.id}
                                onClick={() => setActiveCommentTaskId(task.id)}
                                className={`p-4 bg-[#22242A] border rounded-2xl cursor-pointer transition flex justify-between items-start ${
                                  activeCommentTaskId === task.id ? "border-[#C5A880] bg-[#C5A880]/5" : "border-[#2A2D35] hover:border-[#C5A880]/50"
                                }`}
                              >
                                <div>
                                  <span className="text-xs font-bold text-[#ECE0D2] block">{task.title}</span>
                                  <span className="text-[11px] text-[#C5A880] font-bold block mt-1">Assigned: {task.assignedToName || "Teammate"}</span>
                                </div>
                                <span className="text-[11px] px-2 py-0.5 bg-[#2A2D35] rounded-lg font-bold uppercase text-[#C5A880] border border-[#2A2D35]">{task.status}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Discussion Chat */}
                        {activeCommentTaskId && (
                          <div className="border-t border-[#22242A] pt-4 space-y-3">
                            <span className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block">Workspace discussions</span>
                            <div className="bg-[#22242A] border border-[#2A2D35] rounded-2xl p-3 h-32 overflow-y-auto space-y-2">
                              {comments.length === 0 ? (
                                <div className="text-[11px] text-[#C5A880] italic font-bold">No comments written yet.</div>
                              ) : (
                                comments.map(c => (
                                  <div key={c.id} className="text-[13px] leading-relaxed">
                                    <span className="font-extrabold text-[#ECE0D2]">{c.userName}: </span>
                                    <span className="text-[#C5A880]">{c.content}</span>
                                  </div>
                                ))
                              )}
                            </div>
                            <form onSubmit={handleAddComment} className="flex gap-2">
                              <input
                                type="text"
                                required
                                placeholder="Type comment..."
                                value={newCommentText}
                                onChange={e => setNewCommentText(e.target.value)}
                                className="flex-1 px-3.5 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-xs text-[#ECE0D2]"
                              />
                              <button type="submit" className="px-4 py-2 bg-[#3E2723] hover:bg-[#4E3629] border border-[#6B4423] text-[#ECE0D2] rounded-xl text-xs font-bold transition">
                                Add
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: SETTINGS */}
            {activeTab === "settings" && (
              <div className="h-full overflow-y-auto p-8 bg-[#18181B]">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div>
                    <h2 className="text-[32px] font-black text-[#ECE0D2] tracking-tight">
                      Planner Preferences
                    </h2>
                    <p className="text-[13px] text-[#C5A880] mt-1 font-medium">
                      Configure details and integrations
                    </p>
                  </div>
                  
                  <div className="bg-[#2A2D35] border border-[#2A2D35] p-6 rounded-3xl space-y-4 shadow-md">
                    <h3 className="text-xs font-black text-[#ECE0D2] uppercase tracking-wider">Google Calendar Sync</h3>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${userProfile?.calendarConnected ? "bg-[#7A967A]" : "bg-[#B38E8E]"}`} />
                      <span className="text-[11px] text-[#C5A880] font-bold uppercase tracking-wider">
                        {userProfile?.calendarConnected ? "Connected" : "Inactive"}
                      </span>
                    </div>
                    <div className="pt-2">
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/auth/google?uid=${uid}`}
                        className="inline-block px-5 py-2.5 bg-[#3E2723] hover:bg-[#4E3629] border border-[#6B4423] text-[#ECE0D2] rounded-full text-xs font-bold transition shadow-sm"
                      >
                        {userProfile?.calendarConnected ? "Reconnect Calendar" : "Link Google Calendar"}
                      </a>
                    </div>
                  </div>

                  <div className="bg-[#2A2D35] border border-[#2A2D35] p-6 rounded-3xl space-y-4 shadow-md">
                    <h3 className="text-xs font-black text-[#ECE0D2] uppercase tracking-wider">Account Data</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#C5A880] font-bold uppercase tracking-wider">Name</span>
                        <span className="text-[#ECE0D2] font-extrabold">{userProfile?.displayName || "User"}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#C5A880] font-bold uppercase tracking-wider">Email Address</span>
                        <span className="text-[#ECE0D2] font-extrabold">{userProfile?.email || ""}</span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => setShowProfileModal(true)}
                        className="px-5 py-2.5 bg-[#22242A] border border-[#2A2D35] hover:bg-[#2A2D35] text-[#ECE0D2] rounded-full text-xs font-bold transition"
                      >
                        Modify Profile Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </div>

      {/* Undo Toast */}
      {showUndoToast && lastDeletedTask && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2A2D35] border border-[#2A2D35] px-5 py-4 rounded-3xl shadow-2xl flex items-center gap-4 text-xs">
          <span className="text-[#ECE0D2] font-extrabold">Task &quot;{lastDeletedTask.title}&quot; trashed.</span>
          <button
            onClick={handleUndoDelete}
            className="text-indigo-400 font-extrabold hover:underline"
          >
            Undo Action
          </button>
        </div>
      )}

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form 
            onSubmit={handleCreateTask} 
            className="bg-[#2A2D35] border border-[#2A2D35] rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col max-h-[82vh] text-[#ECE0D2] overflow-hidden"
          >
            {/* Fixed Header */}
            <div className="flex justify-between items-center pb-3 border-b border-[#22242A] flex-shrink-0">
              <h3 className="text-sm font-extrabold text-[#ECE0D2] uppercase tracking-wider">Create Task</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-[#C5A880] hover:text-[#ECE0D2] text-xl font-bold">&times;</button>
            </div>
            
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto py-4 pr-1.5 space-y-4">
              {createValidationError && (
                <div className="p-2.5 bg-[#B38E8E]/10 border border-[#B38E8E]/30 text-[#B38E8E] rounded-xl text-xs font-bold">
                  ⚠️ {createValidationError}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Task Title</label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  placeholder="Task title details..."
                  className="w-full px-3.5 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]/35 transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Description</label>
                <textarea
                  value={createDescription}
                  onChange={e => setCreateDescription(e.target.value)}
                  placeholder="Task description..."
                  className="w-full px-3.5 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] h-16 resize-none focus:outline-none focus:border-[#C5A880]/35 transition-all"
                />
              </div>

              {/* Time Presets */}
              <div>
                <span className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Quick Time Presets</span>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => handleApplyTimePreset("today_morning", "create")} className="px-2.5 py-1.5 bg-[#22242A] border border-[#2A2D35] text-[11px] font-bold rounded-xl text-[#ECE0D2] hover:bg-[#2A2D35] hover:border-[#C5A880]/30 transition duration-200">Today Morning</button>
                  <button type="button" onClick={() => handleApplyTimePreset("today_afternoon", "create")} className="px-2.5 py-1.5 bg-[#22242A] border border-[#2A2D35] text-[11px] font-bold rounded-xl text-[#ECE0D2] hover:bg-[#2A2D35] hover:border-[#C5A880]/30 transition duration-200">Today Afternoon</button>
                  <button type="button" onClick={() => handleApplyTimePreset("today_evening", "create")} className="px-2.5 py-1.5 bg-[#22242A] border border-[#2A2D35] text-[11px] font-bold rounded-xl text-[#ECE0D2] hover:bg-[#2A2D35] hover:border-[#C5A880]/30 transition duration-200">Today Evening</button>
                  <button type="button" onClick={() => handleApplyTimePreset("tomorrow_morning", "create")} className="px-2.5 py-1.5 bg-[#22242A] border border-[#2A2D35] text-[11px] font-bold rounded-xl text-[#ECE0D2] hover:bg-[#2A2D35] hover:border-[#C5A880]/30 transition duration-200">Tomorrow Morning</button>
                </div>
              </div>

              {/* Date & Split Time Picker */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Date Picker</label>
                  <input
                    type="date"
                    required
                    value={createDate}
                    onChange={e => setCreateDate(e.target.value)}
                    min={getLocalDateString()}
                    className="w-full px-3 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] h-10 focus:outline-none focus:border-[#C5A880]/35 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Time Picker</label>
                  <div className="flex items-center gap-1.5 h-10">
                    <select
                      value={createHour}
                      onChange={e => setCreateHour(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] h-full focus:outline-none focus:border-[#C5A880]/35 cursor-pointer"
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                        <option key={h} value={h} className="bg-[#2A2D35]">{h}</option>
                      ))}
                    </select>
                    <select
                      value={createMinute}
                      onChange={e => setCreateMinute(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] h-full focus:outline-none focus:border-[#C5A880]/35 cursor-pointer"
                    >
                      {["00", "15", "30", "45"].map(m => (
                        <option key={m} value={m} className="bg-[#2A2D35]">{m}</option>
                      ))}
                    </select>
                    <select
                      value={createAmPm}
                      onChange={e => setCreateAmPm(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] h-full focus:outline-none focus:border-[#C5A880]/35 cursor-pointer"
                    >
                      <option value="AM" className="bg-[#2A2D35]">AM</option>
                      <option value="PM" className="bg-[#2A2D35]">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Duration Presets */}
              <div>
                <span className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Duration Chips</span>
                <div className="flex flex-wrap gap-1.5">
                  {[15, 30, 45, 60, 120, 180, 240].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setCreateDuration(mins)}
                      className={`px-3 py-1.5 border rounded-xl text-[11px] font-bold transition-all duration-200 ${
                        createDuration === mins 
                          ? "bg-[#3E2723] border-[#6B4423] text-[#ECE0D2]" 
                          : "bg-[#22242A] border-[#2A2D35] text-[#C5A880] hover:text-[#ECE0D2] hover:border-[#C5A880]/35"
                      }`}
                    >
                      {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Priority Slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block">Priority Slider</label>
                  <span className="text-[11px] font-black" style={{ color: getPriorityColor(createPriority) }}>
                    Priority: {createPriority >= 8 ? "🔴 P1 (High)" : createPriority >= 4 ? "🟠 P2 (Medium)" : "🟢 P3 (Low)"}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={createPriority}
                  onChange={e => setCreatePriority(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer transition-all duration-150"
                  style={getPrioritySliderStyle(createPriority)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Notebook Section</label>
                  <select
                    value={createList}
                    onChange={e => setCreateList(e.target.value)}
                    className="w-full px-3 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]/35 cursor-pointer h-10"
                  >
                    {boardLists.map(bl => (
                      <option key={bl.id} value={bl.id} className="bg-[#2A2D35]">{bl.emoji || "🌿"} {bl.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Assign Teammate</label>
                  <select
                    value={createAssignee}
                    onChange={e => setCreateAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]/35 cursor-pointer h-10"
                  >
                    <option value="" className="bg-[#2A2D35]">Personal ledger</option>
                    {team && team.members.map((memberId: string) => (
                      <option key={memberId} value={memberId} className="bg-[#2A2D35]">
                        {team.memberNames[memberId] || "Teammate"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 pt-2.5">
                  <input
                    type="checkbox"
                    id="createReminder"
                    checked={createReminder}
                    onChange={e => setCreateReminder(e.target.checked)}
                    className="w-4 h-4 rounded border-[#2A2D35] bg-[#22242A] accent-[#C5A880] cursor-pointer"
                  />
                  <label htmlFor="createReminder" className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider cursor-pointer select-none">Reminder Alert</label>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Repeat</label>
                  <select
                    value={createRepeat}
                    onChange={e => setCreateRepeat(e.target.value)}
                    className="w-full px-3 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] focus:outline-none focus:border-[#C5A880]/35 cursor-pointer h-10"
                  >
                    <option value="none" className="bg-[#2A2D35]">No Repeat</option>
                    <option value="daily" className="bg-[#2A2D35]">Daily</option>
                    <option value="weekly" className="bg-[#2A2D35]">Weekly</option>
                    <option value="monthly" className="bg-[#2A2D35]">Monthly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Notes</label>
                <textarea
                  value={createNotes}
                  onChange={e => setCreateNotes(e.target.value)}
                  placeholder="Task notes ledger..."
                  className="w-full px-3 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] h-14 resize-none focus:outline-none focus:border-[#C5A880]/35 transition-all"
                />
              </div>

              {/* Subtasks Section */}
              <div>
                <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Subtasks</label>
                <div className="space-y-2">
                  {createSubtasks.length > 0 && (
                    <div className="space-y-1 bg-[#22242A] p-2 rounded-xl border border-[#2A2D35] max-h-32 overflow-y-auto">
                      {createSubtasks.map((st) => (
                        <div key={st.id} className="flex items-center justify-between text-xs py-1 px-1.5 hover:bg-[#2A2D35]/50 rounded">
                          <span className="truncate text-[#ECE0D2]">{st.title}</span>
                          <button
                            type="button"
                            onClick={() => setCreateSubtasks(prev => prev.filter(item => item.id !== st.id))}
                            className="text-[#B38E8E] hover:text-red-400 font-extrabold px-1"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add subtask title..."
                      value={newSubtaskTitle}
                      onChange={e => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddCreateSubtask()
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[12px] text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]/35 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddCreateSubtask}
                      className="px-3 py-1.5 bg-[#3E2723] hover:bg-[#4E3629] border border-[#6B4423] text-[#ECE0D2] rounded-xl text-xs font-bold transition duration-200"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex gap-3 justify-end pt-3 border-t border-[#22242A] flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4.5 py-2 bg-[#22242A] border border-[#2A2D35] text-[#C5A880] hover:text-[#ECE0D2] rounded-full text-xs font-bold transition duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!!createValidationError}
                className={`px-5 py-2 border rounded-full text-xs font-bold transition shadow-sm ${
                  createValidationError 
                    ? "bg-[#3E2723]/40 border-[#6B4423]/40 text-[#ECE0D2]/40 cursor-not-allowed" 
                    : "bg-[#3E2723] hover:bg-[#4E3629] border-[#6B4423] text-[#ECE0D2]"
                }`}
              >
                Add Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form 
            onSubmit={handleSaveEdit} 
            className="bg-[#2A2D35] border border-[#2A2D35] rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col max-h-[82vh] text-[#ECE0D2] overflow-hidden"
          >
            {/* Fixed Header */}
            <div className="flex justify-between items-center pb-3 border-b border-[#22242A] flex-shrink-0">
              <h3 className="text-sm font-extrabold text-[#ECE0D2] uppercase tracking-wider">Modify Task</h3>
              <button type="button" onClick={() => setEditingTask(null)} className="text-[#C5A880] hover:text-[#ECE0D2] text-xl font-bold">&times;</button>
            </div>
            
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto py-4 pr-1.5 space-y-4">
              {editValidationError && (
                <div className="p-2.5 bg-[#B38E8E]/10 border border-[#B38E8E]/30 text-[#B38E8E] rounded-xl text-xs font-bold">
                  ⚠️ {editValidationError}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]/35 transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Description</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] h-16 resize-none focus:outline-none focus:border-[#C5A880]/35 transition-all"
                />
              </div>

              {/* Time Presets */}
              <div>
                <span className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Quick Time Presets</span>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => handleApplyTimePreset("today_morning", "edit")} className="px-2.5 py-1.5 bg-[#22242A] border border-[#2A2D35] text-[11px] font-bold rounded-xl text-[#ECE0D2] hover:bg-[#2A2D35] hover:border-[#C5A880]/30 transition duration-200">Today Morning</button>
                  <button type="button" onClick={() => handleApplyTimePreset("today_afternoon", "edit")} className="px-2.5 py-1.5 bg-[#22242A] border border-[#2A2D35] text-[11px] font-bold rounded-xl text-[#ECE0D2] hover:bg-[#2A2D35] hover:border-[#C5A880]/30 transition duration-200">Today Afternoon</button>
                  <button type="button" onClick={() => handleApplyTimePreset("today_evening", "edit")} className="px-2.5 py-1.5 bg-[#22242A] border border-[#2A2D35] text-[11px] font-bold rounded-xl text-[#ECE0D2] hover:bg-[#2A2D35] hover:border-[#C5A880]/30 transition duration-200">Today Evening</button>
                  <button type="button" onClick={() => handleApplyTimePreset("tomorrow_morning", "edit")} className="px-2.5 py-1.5 bg-[#22242A] border border-[#2A2D35] text-[11px] font-bold rounded-xl text-[#ECE0D2] hover:bg-[#2A2D35] hover:border-[#C5A880]/30 transition duration-200">Tomorrow Morning</button>
                </div>
              </div>

              {/* Date & Split Time Picker */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Date Picker</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    min={getLocalDateString()}
                    className="w-full px-3 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] h-10 focus:outline-none focus:border-[#C5A880]/35 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Time</label>
                  <div className="flex items-center gap-1.5 h-10">
                    <select
                      value={editHour}
                      onChange={e => setEditHour(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] h-full focus:outline-none focus:border-[#C5A880]/35 cursor-pointer"
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <select
                      value={editMinute}
                      onChange={e => setEditMinute(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] h-full focus:outline-none focus:border-[#C5A880]/35 cursor-pointer"
                    >
                      {["00", "15", "30", "45"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={editAmPm}
                      onChange={e => setEditAmPm(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] h-full focus:outline-none focus:border-[#C5A880]/35 cursor-pointer"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Duration Presets */}
              <div>
                <span className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Duration Chips</span>
                <div className="flex flex-wrap gap-1.5">
                  {[15, 30, 45, 60, 120, 180, 240].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setEditDuration(mins)}
                      className={`px-3 py-1.5 border rounded-xl text-[11px] font-bold transition-all duration-200 ${
                        editDuration === mins 
                          ? "bg-[#3E2723] border-[#6B4423] text-[#ECE0D2]" 
                          : "bg-[#22242A] border-[#2A2D35] text-[#C5A880] hover:text-[#ECE0D2] hover:border-[#C5A880]/35"
                      }`}
                    >
                      {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block">Priority Slider</label>
                  <span className="text-[11px] font-black" style={{ color: getPriorityColor(editPriority) }}>
                    Priority: {editPriority >= 8 ? "🔴 P1 (High)" : editPriority >= 4 ? "🟠 P2 (Medium)" : "🟢 P3 (Low)"}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={editPriority}
                  onChange={e => setEditPriority(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer transition-all duration-150"
                  style={getPrioritySliderStyle(editPriority)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Notebook Section</label>
                  <select
                    value={editList}
                    onChange={e => setEditList(e.target.value)}
                    className="w-full px-3 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]/35 cursor-pointer h-10"
                  >
                    {boardLists.map(bl => (
                      <option key={bl.id} value={bl.id} className="bg-[#2A2D35]">{bl.emoji || "🌿"} {bl.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Assign Teammate</label>
                  <select
                    value={editAssignee}
                    onChange={e => setEditAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]/35 cursor-pointer h-10"
                  >
                    <option value="" className="bg-[#2A2D35]">Personal ledger</option>
                    {team && team.members.map((memberId: string) => (
                      <option key={memberId} value={memberId} className="bg-[#2A2D35]">
                        {team.memberNames[memberId] || "Teammate"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 pt-2.5">
                  <input
                    type="checkbox"
                    id="editReminder"
                    checked={editReminder}
                    onChange={e => setEditReminder(e.target.checked)}
                    className="w-4 h-4 rounded border-[#2A2D35] bg-[#22242A] accent-[#C5A880] cursor-pointer"
                  />
                  <label htmlFor="editReminder" className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider cursor-pointer select-none">Reminder Alert</label>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Repeat</label>
                  <select
                    value={editRepeat}
                    onChange={e => setEditRepeat(e.target.value)}
                    className="w-full px-3 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] focus:outline-none focus:border-[#C5A880]/35 cursor-pointer h-10"
                  >
                    <option value="none" className="bg-[#2A2D35]">No Repeat</option>
                    <option value="daily" className="bg-[#2A2D35]">Daily</option>
                    <option value="weekly" className="bg-[#2A2D35]">Weekly</option>
                    <option value="monthly" className="bg-[#2A2D35]">Monthly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[13px] text-[#ECE0D2] h-14 resize-none focus:outline-none focus:border-[#C5A880]/35 transition-all"
                />
              </div>

              {/* Subtasks Section */}
              <div>
                <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-1.5">Subtasks</label>
                <div className="space-y-2">
                  {editSubtasks.length > 0 && (
                    <div className="space-y-1.5 bg-[#22242A] p-2 rounded-xl border border-[#2A2D35] max-h-36 overflow-y-auto">
                      {editSubtasks.map((st) => (
                        <div key={st.id} className="flex items-center gap-2 py-1 px-1.5 hover:bg-[#2A2D35]/50 rounded">
                          {/* Checkbox inside edit modal */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditSubtasks(prev => prev.map(item =>
                                item.id === st.id ? { ...item, completed: !item.completed } : item
                              ))
                            }}
                            className="w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 text-[8px] font-bold"
                            style={{
                              borderColor: st.completed ? "#7A967A" : "#C5A880",
                              color: "#7A967A",
                              backgroundColor: st.completed ? "#7A967A15" : "transparent"
                            }}
                          >
                            {st.completed && "✓"}
                          </button>
                          
                          {/* Editable input for subtask title */}
                          <input
                            type="text"
                            value={st.title}
                            onChange={(e) => {
                              const val = e.target.value
                              setEditSubtasks(prev => prev.map(item =>
                                item.id === st.id ? { ...item, title: val } : item
                              ))
                            }}
                            className={`flex-1 bg-transparent border-b border-transparent focus:border-[#C5A880]/35 text-xs text-[#ECE0D2] focus:outline-none py-0.5 transition-all ${st.completed ? "line-through text-[#C5A880]/50" : ""}`}
                          />
                          
                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => setEditSubtasks(prev => prev.filter(item => item.id !== st.id))}
                            className="text-[#B38E8E] hover:text-red-400 font-extrabold px-1 text-sm"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add subtask */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add subtask title..."
                      value={newEditSubtaskTitle}
                      onChange={e => setNewEditSubtaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddEditSubtask()
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-[#22242A] border border-[#2A2D35] rounded-xl text-[12px] text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]/35 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddEditSubtask}
                      className="px-3 py-1.5 bg-[#3E2723] hover:bg-[#4E3629] border border-[#6B4423] text-[#ECE0D2] rounded-xl text-xs font-bold transition duration-200"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex gap-3 justify-end pt-3 border-t border-[#22242A] flex-shrink-0">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4.5 py-2 bg-[#22242A] border border-[#2A2D35] text-[#C5A880] hover:text-[#ECE0D2] rounded-full text-xs font-bold transition duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!!editValidationError}
                className={`px-5 py-2 border rounded-full text-xs font-bold transition shadow-sm ${
                  editValidationError 
                    ? "bg-[#3E2723]/40 border-[#6B4423]/40 text-[#ECE0D2]/40 cursor-not-allowed" 
                    : "bg-[#3E2723] hover:bg-[#4E3629] border-[#6B4423] text-[#ECE0D2]"
                }`}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profile settings modal */}
      {showProfileModal && (
        <ProfileModal
          uid={uid}
          onClose={() => {
            setShowProfileModal(false)
            if (auth.currentUser) {
              const docRef = doc(db, "users", auth.currentUser.uid)
              getDoc(docRef).then(snap => {
                if (snap.exists()) {
                  const data = snap.data()
                  setUserProfile(data as any)
                  if (data.boardLists) {
                    setBoardLists(data.boardLists)
                  }
                }
              })
            }
          }}
          onLogout={() => {
            setShowProfileModal(false)
            setUid(null)
          }}
        />
      )}
    </div>
  )
}

const getTaskCalendarStyles = (task: any) => {
  const timeStr = task.startTime || task.scheduled_start
  if (!timeStr) return { top: 0, height: 0 }
  
  try {
    const d = new Date(timeStr)
    const hours = d.getHours()
    const minutes = d.getMinutes()
    const duration = task.duration || task.duration_minutes || 60
    
    const startHour = 8
    let displayHour = hours
    if (hours < startHour) displayHour = startHour
    
    const top = (displayHour - startHour) * 60 + minutes
    const height = duration
    
    return { top, height }
  } catch {
    return { top: 0, height: 0 }
  }
}
