import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { competitionModules, hot100Groups } from '../data/competitionUnit'
import API_BASE from '../config/api'
import { buildAuthHeaders } from '../utils/auth'
import {
  createCompetitionProgress,
  normalizeCompetitionProgress,
  readCompetitionProgress,
  writeCompetitionProgress,
  toggleProblemState,
  computeOverallProgress,
  computeModuleProgress,
  computeProblemStatus,
} from '../utils/competitionProgress'

const CompetitionProgressContext = createContext(null)

function getUsername(user) {
  return user?.username || 'guest'
}

export function CompetitionProgressProvider({ children }) {
  const { user } = useAuth()
  const username = getUsername(user)
  const [progress, setProgress] = useState(() => createCompetitionProgress(username))
  const [hydrated, setHydrated] = useState(false)
  const lastSyncedRef = useRef('')

  useEffect(() => {
    const localProgress = readCompetitionProgress(localStorage, username)
    setProgress(localProgress)
    setHydrated(false)
    lastSyncedRef.current = JSON.stringify(localProgress)

    if (!user?.token) {
      setHydrated(true)
      return
    }

    let cancelled = false

    fetch(`${API_BASE}/users/${encodeURIComponent(username)}/competition-progress`, {
      headers: buildAuthHeaders(),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`competition progress fetch failed: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const remoteProgress = normalizeCompetitionProgress({
          username,
          ...(data?.progress || {}),
        })
        setProgress(remoteProgress)
        writeCompetitionProgress(localStorage, remoteProgress)
        lastSyncedRef.current = JSON.stringify(remoteProgress)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setHydrated(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [username, user?.token])

  useEffect(() => {
    if (!hydrated) return
    writeCompetitionProgress(localStorage, progress)
  }, [hydrated, progress])

  useEffect(() => {
    if (!hydrated || !user?.token) return

    const serialized = JSON.stringify(progress)
    if (serialized === lastSyncedRef.current) return

    let cancelled = false
    lastSyncedRef.current = serialized

    fetch(`${API_BASE}/users/${encodeURIComponent(username)}/competition-progress`, {
      method: 'PUT',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        completedProblemIds: progress.completedProblemIds,
        wrongProblemIds: progress.wrongProblemIds,
        favoriteProblemIds: progress.favoriteProblemIds,
      }),
    }).catch(() => {
      if (!cancelled) {
        lastSyncedRef.current = ''
      }
    })

    return () => {
      cancelled = true
    }
  }, [hydrated, progress, user?.token, username])

  const totalProblemCount = useMemo(
    () => hot100Groups.reduce((sum, group) => sum + group.problems.length, 0),
    []
  )

  const value = useMemo(() => {
    const updateProgress = (updater) => {
      setProgress((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater
        return {
          ...next,
          username,
        }
      })
    }

    const toggleCompleted = (problemId) => {
      updateProgress((current) => toggleProblemState(current, 'completedProblemIds', problemId))
    }

    const toggleWrong = (problemId) => {
      updateProgress((current) => toggleProblemState(current, 'wrongProblemIds', problemId))
    }

    const toggleFavorite = (problemId) => {
      updateProgress((current) => toggleProblemState(current, 'favoriteProblemIds', problemId))
    }

    return {
      progress,
      totalProblemCount,
      overallProgress: computeOverallProgress(progress, totalProblemCount),
      getProblemStatus: (problemId) => computeProblemStatus(progress, problemId),
      getModuleProgress: (moduleOrSlug) => {
        const module = typeof moduleOrSlug === 'string'
          ? competitionModules.find((item) => item.slug === moduleOrSlug)
          : moduleOrSlug

        return computeModuleProgress(module, progress)
      },
      toggleCompleted,
      toggleWrong,
      toggleFavorite,
      resetProgress: () => updateProgress(createCompetitionProgress(username)),
    }
  }, [progress, totalProblemCount, username])

  return (
    <CompetitionProgressContext.Provider value={value}>
      {children}
    </CompetitionProgressContext.Provider>
  )
}

export function useCompetitionProgress() {
  const context = useContext(CompetitionProgressContext)

  if (!context) {
    throw new Error('useCompetitionProgress must be used within a CompetitionProgressProvider')
  }

  return context
}
