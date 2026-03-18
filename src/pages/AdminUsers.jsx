import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import API_BASE from '../config/api'
import { buildAuthHeaders } from '../utils/auth'
import { COURSE_LEVELS, DEFAULT_USER_LEVEL } from '../../shared/courseAccess.js'

const LEVELS = COURSE_LEVELS
const ROLES = [
  { value: 'user', label: '普通用户' },
  { value: 'admin', label: '管理员' },
]

const emptyForm = {
  username: '',
  password: '',
  nickname: '',
  role: 'user',
  level: DEFAULT_USER_LEVEL,
}

function AdminUsers() {
  const { user, refreshUser } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [updating, setUpdating] = useState({})
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [resettingUser, setResettingUser] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')

  const isAdmin = user?.role === 'admin'

  const sortedUsers = useMemo(() => {
    return [...list].sort((a, b) => {
      if (a.role !== b.role) return a.role === 'admin' ? -1 : 1
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })
  }, [list])

  const filteredUsers = useMemo(() => {
    return sortedUsers.filter(item => {
      const matchesKeyword = !keyword || [
        item.username,
        item.nickname,
      ].some(value => String(value || '').toLowerCase().includes(keyword.toLowerCase()))

      const matchesRole = roleFilter === 'all' || (item.role || 'user') === roleFilter
      const matchesLevel = levelFilter === 'all' || (item.level || DEFAULT_USER_LEVEL) === levelFilter

      return matchesKeyword && matchesRole && matchesLevel
    })
  }, [sortedUsers, keyword, roleFilter, levelFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/users`, {
        headers: buildAuthHeaders({ 'Accept': 'application/json' }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      setList(Array.isArray(data) ? data : [])
      setError('')
    } catch (e) {
      setError(`加载失败：${e?.message || '网络错误'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const setMessage = (type, message) => {
    if (type === 'error') {
      setError(message)
      setNotice('')
      return
    }

    setNotice(message)
    setError('')
  }

  const onChangeLevel = async (username, level) => {
    try {
      setUpdating(v => ({ ...v, [username]: true }))
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}/level`, {
        method: 'PATCH',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ level }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      setList(prev => prev.map(item => (
        item.username === username ? { ...item, level } : item
      )))
      setMessage('success', `已更新 ${username} 的等级为 ${level}`)

      if (username === user?.username) {
        await refreshUser()
      }
    } catch (e) {
      setMessage('error', `更新失败：${e?.message || '网络错误'}`)
    } finally {
      setUpdating(v => ({ ...v, [username]: false }))
    }
  }

  const onChangeRole = async (username, role) => {
    try {
      setUpdating(v => ({ ...v, [username]: true }))
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}/role`, {
        method: 'PATCH',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ role }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      setList(prev => prev.map(item => (
        item.username === username ? { ...item, role } : item
      )))
      setMessage('success', `已更新 ${username} 的角色为 ${role === 'admin' ? '管理员' : '普通用户'}`)

      if (username === user?.username) {
        await refreshUser()
      }
    } catch (e) {
      setMessage('error', `更新失败：${e?.message || '网络错误'}`)
    } finally {
      setUpdating(v => ({ ...v, [username]: false }))
    }
  }

  const onCreateUser = async (e) => {
    e.preventDefault()

    try {
      setCreating(true)
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(form),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      setList(prev => [data, ...prev])
      setForm(emptyForm)
      setMessage('success', `已添加用户 ${data.username}`)
    } catch (e) {
      setMessage('error', `添加失败：${e?.message || '网络错误'}`)
    } finally {
      setCreating(false)
    }
  }

  const onDeleteUser = async (target) => {
    if (target.role === 'admin') {
      setMessage('error', '管理员账号不支持删除')
      return
    }

    if (target.username === user?.username) {
      setMessage('error', '当前登录账号不能删除自己')
      return
    }

    const confirmed = window.confirm(`确认删除用户 ${target.username} 吗？相关考试记录也会一并清理。`)
    if (!confirmed) return

    try {
      setUpdating(v => ({ ...v, [target.username]: true }))
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(target.username)}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      setList(prev => prev.filter(item => item.username !== target.username))
      setMessage('success', `已删除用户 ${target.username}`)
    } catch (e) {
      setMessage('error', `删除失败：${e?.message || '网络错误'}`)
    } finally {
      setUpdating(v => ({ ...v, [target.username]: false }))
    }
  }

  const onResetPassword = async (target) => {
    const nextPassword = window.prompt(`为用户 ${target.username} 设置新密码`, resetPassword || '123456')
    if (nextPassword === null) return

    const password = nextPassword.trim()
    if (password.length < 6) {
      setMessage('error', '新密码至少需要 6 个字符')
      return
    }

    try {
      setResettingUser(target.username)
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(target.username)}/password`, {
        method: 'PATCH',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ password }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      setResetPassword(password)
      setMessage('success', `已重置 ${target.username} 的密码`)
    } catch (e) {
      setMessage('error', `重置失败：${e?.message || '网络错误'}`)
    } finally {
      setResettingUser('')
    }
  }

  const onImportUsers = async () => {
    if (!importFile) {
      setMessage('error', '请先选择一个 CSV 文件')
      return
    }

    try {
      setImporting(true)
      const formData = new FormData()
      formData.append('file', importFile)

      const res = await fetch(`${API_BASE}/admin/users/import`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: formData,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      setImportFile(null)
      await fetchUsers()

      const summary = `导入完成：新增 ${data.createdCount || 0} 个，跳过 ${data.skippedCount || 0} 个`
      const details = Array.isArray(data.errors) && data.errors.length > 0
        ? `；异常 ${data.errors.length} 条`
        : ''
      setMessage('success', summary + details)
    } catch (e) {
      setMessage('error', `导入失败：${e?.message || '网络错误'}`)
    } finally {
      setImporting(false)
    }
  }

  const onExportUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/export`, {
        headers: buildAuthHeaders(),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'users.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setMessage('success', '已导出用户 CSV')
    } catch (e) {
      setMessage('error', `导出失败：${e?.message || '网络错误'}`)
    }
  }

  const onDownloadTemplate = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/template`, {
        headers: buildAuthHeaders(),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'users-template.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setMessage('success', '已下载导入模板 CSV')
    } catch (e) {
      setMessage('error', `下载模板失败：${e?.message || '网络错误'}`)
    }
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: 32 }}>
        <h2>无权限</h2>
      </div>
    )
  }

  return (
    <motion.div
      className="container"
      style={{ padding: 32, display: 'grid', gap: 20 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <h2 style={{ marginBottom: 8 }}>用户管理</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          管理员可以在这里新增账号、调整课程等级，并清理不再使用的用户。
        </p>
      </div>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={{ margin: 0 }}>添加用户</h3>
            <p style={sectionDescStyle}>支持直接设置角色与等级，创建后可立即登录。</p>
          </div>
        </div>

        <form onSubmit={onCreateUser} style={formGridStyle}>
          <label style={fieldStyle}>
            <span>用户名</span>
            <input
              value={form.username}
              onChange={(e) => setForm(v => ({ ...v, username: e.target.value.trim() }))}
              placeholder="至少 3 个字符"
              required
              minLength={3}
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>昵称</span>
            <input
              value={form.nickname}
              onChange={(e) => setForm(v => ({ ...v, nickname: e.target.value }))}
              placeholder="显示名称"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>密码</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm(v => ({ ...v, password: e.target.value }))}
              placeholder="至少 6 位"
              required
              minLength={6}
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>角色</span>
            <select
              value={form.role}
              onChange={(e) => setForm(v => ({ ...v, role: e.target.value }))}
              style={inputStyle}
            >
              {ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>

          <label style={fieldStyle}>
            <span>等级</span>
            <select
              value={form.level}
              onChange={(e) => setForm(v => ({ ...v, level: e.target.value }))}
              style={inputStyle}
            >
              {LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              type="submit"
              disabled={creating}
              style={primaryButtonStyle}
            >
              {creating ? '创建中...' : '添加用户'}
            </button>
          </div>
        </form>
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={{ margin: 0 }}>批量导入与导出</h3>
            <p style={sectionDescStyle}>CSV 表头建议使用：username,password,nickname,role,level</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={onImportUsers}
            disabled={importing}
            style={{ ...primaryButtonStyle, width: 'auto' }}
          >
            {importing ? '导入中...' : '批量导入'}
          </button>
          <button
            type="button"
            onClick={onExportUsers}
            style={{ ...secondaryButtonStyle, width: 'auto' }}
          >
            导出 CSV
          </button>
          <button
            type="button"
            onClick={onDownloadTemplate}
            style={{ ...secondaryButtonStyle, width: 'auto' }}
          >
            下载模板
          </button>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={{ margin: 0 }}>用户列表</h3>
            <p style={sectionDescStyle}>
              共 {sortedUsers.length} 个账号，当前筛选结果 {filteredUsers.length} 个。
            </p>
          </div>
        </div>

        <div style={toolbarStyle}>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索用户名或昵称"
            style={{ ...inputStyle, minWidth: 220 }}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: 140 }}
          >
            <option value="all">全部角色</option>
            {ROLES.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: 140 }}
          >
            <option value="all">全部等级</option>
            {LEVELS.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setKeyword('')
              setRoleFilter('all')
              setLevelFilter('all')
            }}
            style={{ ...secondaryButtonStyle, width: 'auto' }}
          >
            清空筛选
          </button>
        </div>

        {notice ? (
          <div style={successStyle}>{notice}</div>
        ) : null}

        {error ? (
          <div style={errorStyle}>{error}</div>
        ) : null}

        {loading ? (
          <div>加载中...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={cellHeadStyle}>用户名</th>
                  <th style={cellHeadStyle}>昵称</th>
                  <th style={cellHeadStyle}>角色</th>
                  <th style={cellHeadStyle}>等级</th>
                  <th style={cellHeadStyle}>创建时间</th>
                  <th style={cellHeadStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(item => {
                  const disabled = !!updating[item.username] || resettingUser === item.username
                  const isSelf = item.username === user?.username

                  return (
                    <tr key={item.username}>
                      <td style={cellBodyStyle}>{item.username}</td>
                      <td style={cellBodyStyle}>{item.nickname}</td>
                      <td style={cellBodyStyle}>
                        <select
                          value={item.role || 'user'}
                          onChange={(e) => onChangeRole(item.username, e.target.value)}
                          disabled={disabled}
                          style={inputStyle}
                        >
                          {ROLES.map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={cellBodyStyle}>
                        <select
                          value={item.level || DEFAULT_USER_LEVEL}
                          onChange={(e) => onChangeLevel(item.username, e.target.value)}
                          disabled={disabled}
                          style={inputStyle}
                        >
                          {LEVELS.map(level => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                      </td>
                      <td style={cellBodyStyle}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                      </td>
                      <td style={cellBodyStyle}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onResetPassword(item)}
                            style={{
                              ...secondaryButtonStyle,
                              opacity: disabled ? 0.5 : 1,
                              cursor: disabled ? 'not-allowed' : 'pointer',
                            }}
                          >
                            重置密码
                          </button>
                          <button
                            type="button"
                            disabled={disabled || item.role === 'admin' || isSelf}
                            onClick={() => onDeleteUser(item)}
                            style={{
                              ...dangerButtonStyle,
                              opacity: disabled || item.role === 'admin' || isSelf ? 0.5 : 1,
                              cursor: disabled || item.role === 'admin' || isSelf ? 'not-allowed' : 'pointer',
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredUsers.length === 0 ? (
              <div style={emptyStateStyle}>没有匹配的用户，试试调整搜索词或筛选条件。</div>
            ) : null}
          </div>
        )}
      </section>
    </motion.div>
  )
}

const panelStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: 16,
  padding: 20,
}

const sectionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
}

const sectionDescStyle = {
  margin: '6px 0 0',
  color: 'var(--text-muted)',
}

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 14,
}

const fieldStyle = {
  display: 'grid',
  gap: 8,
  color: 'var(--text-body)',
}

const toolbarStyle = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 16,
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  background: 'var(--bg-surface)',
  color: 'var(--text-body)',
  border: '1px solid var(--border-default)',
  borderRadius: 10,
}

const primaryButtonStyle = {
  width: '100%',
  padding: '10px 14px',
  border: 'none',
  borderRadius: 10,
  background: 'var(--accent-primary)',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
}

const dangerButtonStyle = {
  padding: '8px 12px',
  border: 'none',
  borderRadius: 10,
  background: 'var(--status-danger-bg)',
  color: 'var(--status-danger-fg)',
  fontWeight: 600,
}

const secondaryButtonStyle = {
  padding: '8px 12px',
  border: '1px solid var(--border-default)',
  borderRadius: 10,
  background: 'var(--bg-surface)',
  color: 'var(--text-body)',
  fontWeight: 600,
}

const successStyle = {
  marginBottom: 12,
  padding: '10px 12px',
  borderRadius: 10,
  background: 'var(--status-success-bg)',
  color: 'var(--status-success-fg)',
}

const errorStyle = {
  marginBottom: 12,
  padding: '10px 12px',
  borderRadius: 10,
  background: 'var(--status-danger-bg)',
  color: 'var(--status-danger-fg)',
}

const emptyStateStyle = {
  padding: '18px 12px 4px',
  color: 'var(--text-muted)',
}

const cellHeadStyle = {
  padding: '12px',
}

const cellBodyStyle = {
  padding: '12px',
  borderTop: '1px solid var(--border-default)',
}

export default AdminUsers
