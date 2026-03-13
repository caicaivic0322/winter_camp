import { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth, getUnlockedCourses } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import PartDetail from './pages/PartDetail'
import Lesson from './pages/Lesson'
import Visualizer from './pages/Visualizer'
import Login from './pages/Login'
import ExamList from './pages/Exam/ExamList'
import ExamPaper from './pages/Exam/ExamPaper'
import WrongBook from './pages/Exam/WrongBook'
import AdminExams from './pages/AdminExams'
import './styles/App.css'
import './styles/Supplementals.css'
import AdminUsers from './pages/AdminUsers'

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

// 主应用内容
function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  // 登录页面不显示导航栏
  const isLoginPage = location.pathname === '/login'

  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    )
  }

  return (
    <div className="app">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
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
          <Route path="/part/:partId" element={
            <ProtectedRoute>
              <PartDetail />
            </ProtectedRoute>
          } />
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
          <Route path="/my/wrong-book" element={
            <ProtectedRoute>
              <WrongBook />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
