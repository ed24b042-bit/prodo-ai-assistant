"use client"
import { useState } from "react"
import { auth, db } from "@/lib/firebase"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { motion } from "framer-motion"

export function AuthInterface({
  onAuthSuccess
}: {
  onAuthSuccess: (uid: string) => void
}) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCred.user
        
        await updateProfile(user, { displayName })

        const userRef = doc(db, "users", user.uid)
        await setDoc(userRef, {
          displayName: displayName || "User",
          email: user.email || "",
          calendarAccessToken: "",
          calendarRefreshToken: "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          createdAt: serverTimestamp(),
          boardLists: [
            { id: "list-1", name: "Personal", color: "rose", emoji: "🌿" }
          ]
        })
        
        onAuthSuccess(user.uid)
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password)
        onAuthSuccess(userCred.user.uid)
      }
    } catch (err: any) {
      console.error(err)
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password.")
      } else if (err.code === "auth/email-already-in-use") {
        setError("Email already in use.")
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.")
      } else {
        setError("An error occurred during authentication.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setError("")
    setLoading(true)
    const provider = new GoogleAuthProvider()

    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      const userRef = doc(db, "users", user.uid)
      const userSnap = await getDoc(userRef)
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          displayName: user.displayName || "User",
          email: user.email || "",
          calendarAccessToken: "",
          calendarRefreshToken: "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          createdAt: serverTimestamp(),
          boardLists: [
            { id: "list-1", name: "Personal", color: "rose", emoji: "🌿" }
          ]
        })
      }

      onAuthSuccess(user.uid)
    } catch (err: any) {
      console.error(err)
      setError("Failed to sign in with Google.")
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setError("")
    setLoading(true)
    try {
      const demoUid = "demo_user"
      const demoProfile = {
        uid: demoUid,
        displayName: "Demo User",
        email: "demo@prodo.ai"
      }
      
      const userRef = doc(db, "users", demoUid)
      try {
        await setDoc(userRef, {
          displayName: "Demo User",
          email: "demo@prodo.ai",
          calendarAccessToken: "",
          calendarRefreshToken: "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          createdAt: serverTimestamp(),
          boardLists: [
            { id: "list-1", name: "Personal", color: "rose", emoji: "🌿" }
          ]
        })
      } catch (firestoreErr) {
        console.warn("Firestore init failed for demo user, proceeding anyway:", firestoreErr)
      }

      localStorage.setItem("prodo_demo_user", JSON.stringify(demoProfile))
      onAuthSuccess(demoUid)
    } catch (err: any) {
      console.error(err)
      setError("Failed to initialize demo login.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#18181B] px-6 text-[#ECE0D2]">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-[#2A2D35] border border-[#2A2D35] rounded-3xl p-8 shadow-2xl"
      >
        {/* Brand */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-[#3E2723] border border-[#6B4423] text-[#ECE0D2] rounded-2xl flex items-center justify-center text-xl shadow-sm">
            🌿
          </div>
        </div>

        <h2 className="text-xl font-extrabold text-[#ECE0D2] text-center mb-1">
          {isSignUp ? "Create Account" : "Open Task Manager"}
        </h2>
        <p className="text-xs text-[#C5A880] font-medium text-center mb-6 leading-relaxed">
          {isSignUp ? "Start organizing your schedule with our AI task manager" : "Sign in to manage your tasks and calendar events"}
        </p>

        {error && (
          <div className="bg-[#B38E8E]/10 border border-[#B38E8E]/30 text-[#B38E8E] rounded-2xl p-3 text-xs text-center mb-5 font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="text-[10px] font-bold text-[#C5A880] uppercase tracking-wider block">Your Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Alex Smith"
                required
                className="w-full mt-1.5 px-4 py-2.5 bg-[#22242A] border border-[#2A2D35] rounded-2xl text-xs text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-[#C5A880] uppercase tracking-wider block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full mt-1.5 px-4 py-2.5 bg-[#22242A] border border-[#2A2D35] rounded-2xl text-xs text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#C5A880] uppercase tracking-wider block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full mt-1.5 px-4 py-2.5 bg-[#22242A] border border-[#2A2D35] rounded-2xl text-xs text-[#ECE0D2] focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#3E2723] hover:bg-[#4E3629] border border-[#6B4423] text-[#ECE0D2] rounded-2xl text-xs font-bold transition-all duration-300 shadow-md"
          >
            {loading ? "Processing..." : isSignUp ? "Create Log" : "Open Log"}
          </button>
        </form>

        <div className="flex items-center my-6 text-[10px] font-bold text-[#C5A880] uppercase tracking-wider">
          <div className="flex-1 h-[1px] bg-[#22242A]" />
          <span className="px-3">or</span>
          <div className="flex-1 h-[1px] bg-[#22242A]" />
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full bg-[#22242A] hover:bg-[#2A2D35] border border-[#2A2D35] rounded-2xl py-3 text-xs font-bold text-[#ECE0D2] flex items-center justify-center gap-2.5 transition duration-200"
        >
          <svg width="15" height="15" viewBox="0 0 24 24">
            <path fill="#ea4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.323 0-6.021-2.698-6.021-6.02s2.698-6.022 6.021-6.022c1.516 0 2.894.562 3.96 1.488l3.116-3.116C19.167 1.488 15.892.8 12.24.8 6.059.8 1.022 5.836 1.022 12s5.037 11.2 11.218 11.2c5.898 0 10.841-4.218 10.841-11.2 0-.693-.078-1.371-.21-2.015H12.24Z"/>
          </svg>
          Continue with Google
        </button>

        <button
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full bg-[#3E2723]/30 hover:bg-[#3E2723]/50 border border-[#6B4423]/50 text-[#C5A880] rounded-2xl py-3 text-xs font-bold transition flex items-center justify-center gap-2 mt-4"
        >
          ⚡ Demo / Bypass Login
        </button>

        <p className="text-xs text-[#C5A880] font-medium text-center mt-6">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <span
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-indigo-400 font-bold hover:underline cursor-pointer"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </span>
        </p>
      </motion.div>
    </div>
  )
}
