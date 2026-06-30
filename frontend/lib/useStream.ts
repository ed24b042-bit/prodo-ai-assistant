import { useState, useCallback, useEffect } from "react"

export type ThinkingStep = "listening" | "planning" | "coaching" | "responding"

export interface SubTask {
  id: string
  title: string
  completed: boolean
}

export interface Task {
  id?: string
  title: string
  deadline?: string | null
  duration_minutes?: number
  scheduled_start?: string
  scheduled_end?: string
  priority_score?: number
  color?: string
  needs_user_confirmation?: boolean
  confirmation_question?: string
  status: "pending" | "completed" | "missed" | "draft" | "confirmed" | "scheduled" | "cancelled"
  listId?: string
  listName?: string
  pinned?: boolean
  notes?: string
  description?: string
  dueDate?: string
  date?: string
  startTime?: string
  endTime?: string
  duration?: number
  priority?: number
  completedAt?: string
  reminder?: boolean
  repeat?: string
  teamId?: string
  assignedTo?: string
  assignedToName?: string
  subtasks?: SubTask[]
}

export interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export interface ScoreUpdate {
  score: number
  streak: number
}

export function useStream(uid: string) {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hey! I'm Prodo, your AI executive assistant. What's on your plate today?",
    timestamp: Date.now()
  }])
  const [thinking, setThinking] = useState<ThinkingStep | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [score, setScore] = useState<ScoreUpdate>({ score: 0, streak: 0 })
  const [loading, setLoading] = useState(false)

  // Fetch initial tasks and score on mount / login
  useEffect(() => {
    if (!uid) {
      setTasks([])
      setScore({ score: 0, streak: 0 })
      return
    }

    const fetchInitialData = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
      try {
        // Fetch tasks
        const tasksRes = await fetch(`${apiUrl}/api/tasks/${uid}`)
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json()
          if (tasksData.tasks) {
            setTasks(tasksData.tasks)
          }
        }

        // Fetch score
        const scoreRes = await fetch(`${apiUrl}/api/score/${uid}`)
        if (scoreRes.ok) {
          const scoreData = await scoreRes.json()
          setScore({
            score: scoreData.score ?? 0,
            streak: scoreData.streak_days ?? 0
          })
        }
      } catch (err) {
        console.error("Failed to fetch initial tasks or score:", err)
      }
    }

    fetchInitialData()
  }, [uid])

  const sendMessage = useCallback(async (message: string) => {
    setLoading(true)
    setThinking("listening")
    setMessages(prev => [...prev, {
      role: "user",
      content: message,
      timestamp: Date.now()
    }])

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, uid, sentAt: Date.now() }),
      })

      if (!res.body) throw new Error("No response body")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (!data) continue

          try {
            const event = JSON.parse(data)
            
            if (event.type === "thinking") {
              setThinking(event.label as ThinkingStep)
            }
            if (event.type === "response") {
              setThinking(null)
              setMessages(prev => [...prev, {
                role: "assistant",
                content: event.payload,
                timestamp: Date.now()
              }])
            }
            if (event.type === "tasks_updated") {
              setTasks(event.payload)
            }
            if (event.type === "score_updated") {
              setScore(event.payload)
            }
            if (event.type === "error") {
              console.error("Backend error event:", event.message)
              setThinking(null)
              setMessages(prev => [...prev, {
                role: "assistant",
                content: "Something went wrong while processing your request.",
                timestamp: Date.now()
              }])
            }
            if (event.type === "done") {
              setThinking(null)
              setLoading(false)
            }
          } catch (e) { /* skip malformed */ }
        }
      }
    } catch (err) {
      console.error("Failed to connect to backend:", err)
      setThinking(null)
      setLoading(false)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: Date.now()
      }])
    }
  }, [uid])

  const completeTask = useCallback(async (taskId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
    try {
      const res = await fetch(`${apiUrl}/api/tasks/${uid}/${taskId}/complete`, { method: "POST" })
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "completed" as const } : t))
      }
    } catch (e) {
      console.error("Failed to complete task:", e)
    }
  }, [uid])

  const deleteTask = useCallback(async (taskId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
    try {
      const res = await fetch(`${apiUrl}/api/tasks/${uid}/${taskId}`, { method: "DELETE" })
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId))
      }
    } catch (e) {
      console.error("Failed to delete task:", e)
    }
  }, [uid])

  const editTask = useCallback(async (taskId: string, updates: any) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
    try {
      const res = await fetch(`${apiUrl}/api/tasks/${uid}/${taskId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
      }
    } catch (e) {
      console.error("Failed to edit task:", e)
    }
  }, [uid])

  const markTaskMissed = useCallback(async (taskId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
    try {
      const res = await fetch(`${apiUrl}/api/tasks/${uid}/${taskId}/missed`, { method: "POST" })
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "missed" as const } : t))
      }
    } catch (e) {
      console.error("Failed to mark task missed:", e)
    }
  }, [uid])

  const createTask = useCallback(async (taskData: any) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
    try {
      const res = await fetch(`${apiUrl}/api/tasks/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData)
      })
      if (res.ok) {
        const data = await res.json()
        if (data.task) {
          setTasks(prev => [...prev, data.task])
        }
      }
    } catch (e) {
      console.error("Failed to create task:", e)
    }
  }, [uid])

  return { messages, thinking, tasks, score, loading, sendMessage, setTasks, completeTask, deleteTask, editTask, markTaskMissed, createTask }
}
