import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth, getUnlockedCourses } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Navbar from './components/Navbar'
import './styles/App.css'
import './styles/Supplementals.css'
import { canAccessCompetitionUnit } from '../shared/courseAccess.js'

// 懒加载所有页面组件，首屏只加载必要代码
const Home = lazy(() => import('./pages/Home'))
const PartDetail = lazy(() => import('./pages/PartDetail'))
const Lesson = lazy(() => import('./pages/Lesson'))
const Visualizer = lazy(() => import('./pages/Visualizer'))
const Login = lazy(() => import('./pages/Login'))
const CompetitionHub = lazy(() => import('./pages/CompetitionHub'))
const CompetitionLesson = lazy(() => import('./pages/CompetitionLesson'))
const CompetitionPractice = lazy(() => import('./pages/CompetitionPractice'))
const CompetitionProblemDetail = lazy(() => import('./pages/CompetitionProblemDetail'))
const CompetitionProgressProvider = lazy(() => import('./contexts/CompetitionProgressContext').then((mod) => ({ default: mod.CompetitionProgressProvider })))
const ExamList = lazy(() => import('./pages/Exam/ExamList'))
const ExamPaper = lazy(() => import('./pages/Exam/ExamPaper'))
const ExamResults = lazy(() => import('./pages/Exam/ExamResults'))
const AdminExams = lazy(() => import('./pages/AdminExams'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminScores = lazy(() => import('./pages/AdminScores'))

// 路由保护组件
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  const courseStatus = getUnlockedCourses()

  // 加载中
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner-large" />
        <p>加载中...</p>
      </div>
    )
  }

  // 课程已过期
  if (courseStatus.isExpired) {
    return <Navigate to="/login" replace />
  }

  // 未登录
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

function CompetitionRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const courseStatus = getUnlockedCourses()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner-large" />
        <p>加载中...</p>
      </div>
    )
  }

  if (courseStatus.isExpired) {
    return <Navigate to="/login" replace />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!canAccessCompetitionUnit(user)) {
    return <Navigate to="/" replace />
  }

  return children
}

function CompetitionShell() {
  return (
    <Suspense fallback={<div className="loading-screen"><div className="loading-spinner-large" /></div>}>
      <CompetitionProgressProvider>
        <Outlet />
      </CompetitionProgressProvider>
    </Suspense>
  )
}

// 主应用内容
function AppContent() {
  const location = useLocation()

  // 登录页面不显示导航栏
  const isLoginPage = location.pathname === '/login'

  if (isLoginPage) {
    return (
      <Suspense fallback={<div className="loading-screen"><div className="loading-spinner-large" /></div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Suspense fallback={<div className="loading-screen"><div className="loading-spinner-large" /></div>}>
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute>
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/exams" element={
            <ProtectedRoute>
              <AdminExams />
            </ProtectedRoute>
          } />
          <Route path="/admin/scores" element={
            <ProtectedRoute>
              <AdminScores />
            </ProtectedRoute>
          } />
          <Route path="/part/:partId" element={
            <ProtectedRoute>
              <PartDetail />
            </ProtectedRoute>
          } />
          <Route path="/competition" element={<CompetitionRoute><CompetitionShell /></CompetitionRoute>}>
            <Route index element={<CompetitionHub />} />
            <Route path="module/:slug" element={<CompetitionLesson />} />
            <Route path="practice" element={<CompetitionPractice />} />
            <Route path="problem/:id" element={<CompetitionProblemDetail />} />
          </Route>
          <Route path="/lesson/:id" element={
            <ProtectedRoute>
              <Lesson />
            </ProtectedRoute>
          } />
          <Route path="/visualizer/:type" element={
            <ProtectedRoute>
              <Visualizer />
            </ProtectedRoute>
          } />
          <Route path="/exams" element={
            <ProtectedRoute>
              <ExamList />
            </ProtectedRoute>
          } />
          <Route path="/exam/:id" element={
            <ProtectedRoute>
              <ExamPaper />
            </ProtectedRoute>
          } />
          <Route path="/my/exam-results" element={
            <ProtectedRoute>
              <ExamResults />
            </ProtectedRoute>
          } />
          <Route path="/my/exam-results/:attemptId" element={
            <ProtectedRoute>
              <ExamResults />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
