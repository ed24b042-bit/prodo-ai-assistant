"use client"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { motion, AnimatePresence } from "framer-motion"
import { Task } from "@/lib/useStream"
import { useState } from "react"
import { HabitLogger } from "./HabitLogger"

export function TaskPanel({
  tasks, setTasks, uid, completeTask, deleteTask, editTask, markTaskMissed
}: {
  tasks: (Task & { id?: string })[]
  setTasks: (tasks: any[]) => void
  uid: string
  completeTask: (taskId: string) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  editTask: (taskId: string, updates: any) => Promise<void>
  markTaskMissed: (taskId: string) => Promise<void>
}) {
  const [loggingTaskId, setLoggingTaskId] = useState<string | null>(null)
  
  // Edit State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editStart, setEditStart] = useState("")
  const [editEnd, setEditEnd] = useState("")
  const [editPriority, setEditPriority] = useState(50)

  const onDragEnd = (result: any) => {
    if (!result.destination) return
    const items = Array.from(tasks)
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)
    setTasks(items)
  }

  const formatTime = (iso?: string) => {
    if (!iso) return ""
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch {
      return ""
    }
  }

  const toLocalDatetimeLocal = (isoString?: string) => {
    if (!isoString) return ""
    try {
      const d = new Date(isoString)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      const hours = String(d.getHours()).padStart(2, "0")
      const minutes = String(d.getMinutes()).padStart(2, "0")
      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch {
      return ""
    }
  }

  const handleSaveEdit = async (taskId: string) => {
    try {
      const updates = {
        title: editTitle,
        startTime: new Date(editStart).toISOString(),
        endTime: new Date(editEnd).toISOString(),
        priority: editPriority,
      }
      await editTask(taskId, updates)
      setEditingTaskId(null)
    } catch (e) {
      console.error("Error saving edits:", e)
    }
  }

  const activeTasks = tasks.filter(t => t.status === "pending" || t.status === "scheduled" || t.status === "draft" || t.status === "confirmed")

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#475569",
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginBottom: 12, padding: "0 4px"
      }}>
        Scheduled Tasks · {activeTasks.length}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="tasks">
          {provided => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              <AnimatePresence>
                {tasks.map((task, index) => {
                  const itemKey = task.id || task.title
                  const isEditing = editingTaskId === task.id

                  return (
                    <Draggable key={itemKey} draggableId={itemKey} index={index}>
                      {(provided, snapshot) => (
                        <div
                           ref={provided.innerRef}
                           {...provided.draggableProps}
                           {...provided.dragHandleProps}
                        >
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            style={{
                              background: snapshot.isDragging
                                ? "rgba(99,102,241,0.1)"
                                : "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderLeft: `3px solid ${task.color || "#6366f1"}`,
                              borderRadius: 10,
                              padding: "11px 13px",
                              marginBottom: 8,
                              cursor: "grab"
                            }}
                          >
                            {isEditing ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <input 
                                  value={editTitle} 
                                  onChange={e => setEditTitle(e.target.value)} 
                                  placeholder="Task Title"
                                  style={{ padding: "6px 10px", fontSize: 12, borderRadius: 6, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none" }}
                                />
                                <div style={{ display: "flex", gap: 6 }}>
                                  <input 
                                    type="datetime-local" 
                                    value={editStart} 
                                    onChange={e => setEditStart(e.target.value)} 
                                    style={{ flex: 1, padding: "6px 10px", fontSize: 11, borderRadius: 6, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none" }}
                                  />
                                  <input 
                                    type="datetime-local" 
                                    value={editEnd} 
                                    onChange={e => setEditEnd(e.target.value)} 
                                    style={{ flex: 1, padding: "6px 10px", fontSize: 11, borderRadius: 6, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none" }}
                                  />
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Priority:</span>
                                  <input 
                                    type="range" min="0" max="100" 
                                    value={editPriority} 
                                    onChange={e => setEditPriority(Number(e.target.value))} 
                                    style={{ flex: 1 }}
                                  />
                                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{editPriority}</span>
                                </div>
                                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
                                  <button 
                                    onClick={() => handleSaveEdit(task.id!)}
                                    style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                  >Save</button>
                                  <button 
                                    onClick={() => setEditingTaskId(null)}
                                    style={{ background: "rgba(255,255,255,0.08)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                  >Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={{
                                  fontSize: 13, fontWeight: 600,
                                  color: task.status === "completed" ? "#475569" : task.status === "missed" ? "#ef4444" : "#f1f5f9",
                                  textDecoration: task.status === "completed" ? "line-through" : "none",
                                  marginBottom: 4
                                }}>
                                  {task.title}
                                </div>
                                <div style={{ fontSize: 11, color: "#475569" }}>
                                  {formatTime(task.scheduled_start)} → {formatTime(task.scheduled_end)}
                                </div>
                                {task.needs_user_confirmation && (
                                  <div style={{
                                    marginTop: 6, fontSize: 11,
                                    color: "#f59e0b",
                                    background: "rgba(245,158,11,0.1)",
                                    padding: "4px 8px", borderRadius: 6
                                  }}>
                                    ⏳ Awaiting your confirmation
                                  </div>
                                )}
                                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                                  {task.status !== "completed" && task.status !== "missed" && (
                                    <>
                                      <button
                                        onClick={() => setLoggingTaskId(task.title)}
                                        style={{
                                          background: "rgba(34,197,94,0.1)",
                                          border: "1px solid rgba(34,197,94,0.2)",
                                          color: "#22c55e", borderRadius: 6,
                                          padding: "3px 8px", fontSize: 11, fontWeight: 600,
                                          cursor: "pointer"
                                        }}
                                      >✓ Complete</button>
                                      <button
                                        onClick={() => {
                                          if (task.id) {
                                            setEditingTaskId(task.id)
                                            setEditTitle(task.title)
                                            setEditStart(toLocalDatetimeLocal(task.scheduled_start))
                                            setEditEnd(toLocalDatetimeLocal(task.scheduled_end))
                                            setEditPriority(task.priority_score || 50)
                                          }
                                        }}
                                        style={{
                                          background: "rgba(99,102,241,0.1)",
                                          border: "1px solid rgba(99,102,241,0.2)",
                                          color: "#6366f1", borderRadius: 6,
                                          padding: "3px 8px", fontSize: 11, fontWeight: 600,
                                          cursor: "pointer"
                                        }}
                                      >✏ Edit</button>
                                      <button
                                        onClick={() => {
                                          if (task.id) markTaskMissed(task.id)
                                        }}
                                        style={{
                                          background: "rgba(245,158,11,0.1)",
                                          border: "1px solid rgba(245,158,11,0.2)",
                                          color: "#f59e0b", borderRadius: 6,
                                          padding: "3px 8px", fontSize: 11, fontWeight: 600,
                                          cursor: "pointer"
                                        }}
                                      >⏰ Missed</button>
                                      <button
                                        onClick={() => {
                                          if (task.id) deleteTask(task.id)
                                        }}
                                        style={{
                                          background: "rgba(239,68,68,0.1)",
                                          border: "1px solid rgba(239,68,68,0.2)",
                                          color: "#ef4444", borderRadius: 6,
                                          padding: "3px 8px", fontSize: 11, fontWeight: 600,
                                          cursor: "pointer"
                                        }}
                                      >🗑 Delete</button>
                                    </>
                                  )}
                                  {(task.status === "completed" || task.status === "missed") && (
                                    <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                                      <span style={{
                                        fontSize: 10,
                                        color: task.status === "completed" ? "#22c55e" : "#ef4444",
                                        textTransform: "uppercase",
                                        fontWeight: 700
                                      }}>
                                        {task.status}
                                      </span>
                                      <button
                                        onClick={() => {
                                          if (task.id) deleteTask(task.id)
                                        }}
                                        style={{
                                          background: "rgba(239,68,68,0.1)",
                                          border: "1px solid rgba(239,68,68,0.2)",
                                          color: "#ef4444", borderRadius: 6,
                                          padding: "3px 8px", fontSize: 11, fontWeight: 600,
                                          cursor: "pointer"
                                        }}
                                      >🗑 Delete</button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </motion.div>
                          {loggingTaskId === task.title && (
                            <HabitLogger
                              taskTitle={task.title}
                              uid={uid}
                              onClose={() => {
                                setLoggingTaskId(null)
                                if (task.id) completeTask(task.id)
                              }}
                            />
                          )}
                        </div>
                      )}
                    </Draggable>
                  )
                })}
              </AnimatePresence>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {tasks.length === 0 && (
        <div style={{
          textAlign: "center", color: "#334155",
          fontSize: 12, marginTop: 40, lineHeight: 1.8
        }}>
          No tasks scheduled yet.<br />Tell Prodo what you need to get done.
        </div>
      )}
    </div>
  )
}
