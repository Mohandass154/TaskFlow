import { useState, useEffect } from 'react'
import './App.css'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore'

import { auth, db } from './firebase'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [authError, setAuthError] = useState('')
  const [message, setMessage] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('Pending')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [activeView, setActiveView] = useState('Dashboard')

  // Authentication listener

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Load user-specific tasks from Firestore

  useEffect(() => {
    if (!user) {
      setTasks([])
      return
    }

    setLoadingTasks(true)

    const tasksRef = collection(db, 'users', user.uid, 'tasks')

    const unsubscribe = onSnapshot(
      tasksRef,
      (snapshot) => {
        const taskData = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data()
        }))

        taskData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0
          const timeB = b.createdAt?.toMillis?.() || 0
          return timeB - timeA
        })

        setTasks(taskData)
        setLoadingTasks(false)
      },
      (error) => {
        console.error(error)
        setMessage('Unable to load tasks. Please check your Firestore rules.')
        setLoadingTasks(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  // Authentication

  async function handleAuth(e) {
    e.preventDefault()

    setAuthError('')
    setFormLoading(true)

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (error) {
      const errors = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must contain at least 6 characters.',
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.'
      }

      setAuthError(
        errors[error.code] || error.message
      )
    } finally {
      setFormLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth)
      resetForm()
      setSearch('')
      setStatusFilter('All')
      setActiveView('Dashboard')
      setMessage('')
    } catch (error) {
      setMessage('Unable to log out. Please try again.')
    }
  }

  // Reset task form

  function resetForm() {
    setTitle('')
    setDescription('')
    setDueDate('')
    setStatus('Pending')
    setEditingTaskId(null)
    setShowForm(false)
  }

  // Add or update task

  async function handleSubmit(e) {
    e.preventDefault()

    if (!title.trim()) {
      setMessage('Please enter a task title.')
      return
    }

    setFormLoading(true)
    setMessage('')

    try {
      const tasksRef = collection(db, 'users', user.uid, 'tasks')

      const taskData = {
        title: title.trim(),
        description: description.trim(),
        dueDate,
        status,
        updatedAt: serverTimestamp()
      }

      if (editingTaskId) {
        const taskRef = doc(
          db,
          'users',
          user.uid,
          'tasks',
          editingTaskId
        )

        await updateDoc(taskRef, taskData)
        setMessage('Task updated successfully!')
      } else {
        await addDoc(tasksRef, {
          ...taskData,
          createdAt: serverTimestamp()
        })

        setMessage('Task added successfully!')
      }

      resetForm()
    } catch (error) {
      console.error(error)
      setMessage('Unable to save task. Please try again.')
    } finally {
      setFormLoading(false)
    }
  }

  // Edit task

  function editTask(task) {
    setTitle(task.title)
    setDescription(task.description || '')
    setDueDate(task.dueDate || '')
    setStatus(task.status)
    setEditingTaskId(task.id)
    setShowForm(true)
  }

  // Delete task

  async function deleteTask(id) {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this task?'
    )

    if (!confirmDelete) return

    try {
      const taskRef = doc(db, 'users', user.uid, 'tasks', id)

      await deleteDoc(taskRef)

      setMessage('Task deleted successfully!')
    } catch (error) {
      console.error(error)
      setMessage('Unable to delete task. Please try again.')
    }
  }

  // Task statistics

  const totalTasks = tasks.length

  const pendingTasks = tasks.filter(
    task => task.status === 'Pending'
  ).length

  const progressTasks = tasks.filter(
    task => task.status === 'In Progress'
  ).length

  const completedTasks = tasks.filter(
    task => task.status === 'Completed'
  ).length

  // Search and filters

  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'All' || task.status === statusFilter

    const matchesView =
      activeView !== 'Completed' || task.status === 'Completed'

    return matchesSearch && matchesStatus && matchesView
  })

  // Loading screen

  if (authLoading) {
    return (
      <div className="loading-screen">
        <h2>TaskFlow</h2>
        <p>Loading your workspace...</p>
      </div>
    )
  }

  // Login and registration screen

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">

          <h1>TaskFlow</h1>

          <p className="auth-subtitle">
            Organize your work. Achieve more.
          </p>

          <h2>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>

          <form onSubmit={handleAuth}>

            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength="6"
              required
            />

            {authError && (
              <p className="error-message">{authError}</p>
            )}

            <button type="submit" disabled={formLoading}>
              {formLoading
                ? 'Please wait...'
                : isRegister
                  ? 'Create Account'
                  : 'Login'}
            </button>

          </form>

          <p className="auth-switch">
            {isRegister
              ? 'Already have an account?'
              : "Don't have an account?"}

            <span onClick={() => {
              setIsRegister(!isRegister)
              setAuthError('')
            }}>
              {isRegister ? ' Login' : ' Register'}
            </span>
          </p>

        </div>
      </div>
    )
  }

  // Main dashboard

  return (
    <div className="app">

      <aside className="sidebar">

        <h2>TaskFlow</h2>

        <nav>

          <p
            className={activeView === 'Dashboard' ? 'active' : ''}
            onClick={() => setActiveView('Dashboard')}
          >
            Dashboard
          </p>

          <p
            className={activeView === 'My Tasks' ? 'active' : ''}
            onClick={() => setActiveView('My Tasks')}
          >
            My Tasks
          </p>

          <p
            className={activeView === 'Completed' ? 'active' : ''}
            onClick={() => setActiveView('Completed')}
          >
            Completed
          </p>

          <p
            className={activeView === 'Settings' ? 'active' : ''}
            onClick={() => setActiveView('Settings')}
          >
            Settings
          </p>

        </nav>

        <div className="sidebar-bottom">
          <p className="user-email">{user.email}</p>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

      </aside>

      <main className="main-content">

        <header className="top-header">

          <div>
            <h1>My Workspace</h1>
            <p>Manage your tasks and stay productive.</p>
          </div>

          <div className="profile-info">
            {user.email}
          </div>

        </header>

        {message && (
          <div className="message-box">
            <span>{message}</span>
            <button onClick={() => setMessage('')}>×</button>
          </div>
        )}

        <section className="stats">

          <div className="card">
            <h3>Total Tasks</h3>
            <h2>{totalTasks}</h2>
          </div>

          <div className="card">
            <h3>Pending</h3>
            <h2>{pendingTasks}</h2>
          </div>

          <div className="card">
            <h3>In Progress</h3>
            <h2>{progressTasks}</h2>
          </div>

          <div className="card">
            <h3>Completed</h3>
            <h2>{completedTasks}</h2>
          </div>

        </section>

        {activeView === 'Settings' ? (

          <section className="tasks settings-section">

            <h2>Settings</h2>

            <p>Account Information</p>

            <div className="settings-info">
              <strong>Email:</strong>
              <span>{user.email}</span>
            </div>

            <div className="settings-info">
              <strong>Account ID:</strong>
              <span>{user.uid}</span>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>

          </section>

        ) : (

          <section className="tasks">

            <div className="task-heading">

              <h2>
                {activeView === 'Completed'
                  ? 'Completed Tasks'
                  : activeView === 'My Tasks'
                    ? 'My Tasks'
                    : 'My Tasks'}
              </h2>

              {activeView !== 'Completed' && (
                <button onClick={() => {
                  if (showForm) {
                    resetForm()
                  } else {
                    setShowForm(true)
                  }
                }}>
                  {showForm ? 'Cancel' : 'Add New Task'}
                </button>
              )}

            </div>

            {showForm && (

              <form onSubmit={handleSubmit} className="task-form">

                <input
                  type="text"
                  placeholder="Enter task title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />

                <textarea
                  placeholder="Enter task description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />

                <label>Due Date</label>

                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />

                <label>Status</label>

                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>

                <button type="submit" disabled={formLoading}>
                  {formLoading
                    ? 'Saving...'
                    : editingTaskId
                      ? 'Update Task'
                      : 'Save Task'}
                </button>

              </form>

            )}

            <div className="filter-section">

              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

            </div>

            {loadingTasks ? (

              <p className="empty-message">Loading tasks...</p>

            ) : filteredTasks.length === 0 ? (

              <p className="empty-message">
                No tasks found. Add a new task to get started.
              </p>

            ) : (

              <div className="task-list">

                {filteredTasks.map(task => (

                  <div className="task-item" key={task.id}>

                    <h3>{task.title}</h3>

                    <p>{task.description || 'No description'}</p>

                    <p>
                      Due Date: {task.dueDate || 'Not set'}
                    </p>

                    <span className={`status-badge ${task.status.toLowerCase().replace(' ', '-')}`}>
                      {task.status}
                    </span>

                    <div className="task-actions">

                      <button onClick={() => editTask(task)}>
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => deleteTask(task.id)}
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </section>

        )}

      </main>

    </div>
  )
}

export default App