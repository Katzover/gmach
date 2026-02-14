'use client'
import { useState, useEffect } from 'react'
import './page.css'

export default function Home() {
  const [items, setItems] = useState([])
  const [message, setMessage] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showLoanModal, setShowLoanModal] = useState(null)
  const [showReturnModal, setShowReturnModal] = useState(null)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showInfoModal, setShowInfoModal] = useState(null)
  const [showGlobalHistory, setShowGlobalHistory] = useState(false)

  const [loanHistory, setLoanHistory] = useState([])
  const [allLoans, setAllLoans] = useState([])

  // Loading states
  const [loadingItems, setLoadingItems] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [newItem, setNewItem] = useState({ name: '', qty: '', image: null })
  const [formInfo, setFormInfo] = useState({})
  const [editItem, setEditItem] = useState({ name: '', total_qty: '', image: null })

  // NEW STATES
  const [activeTab, setActiveTab] = useState('loan') // loan / return
  const [returnBorrower, setReturnBorrower] = useState('')
  const [admins, setAdmins] = useState(['מיכל בארי', 'מרים וייס', 'שרי זהבי', 'נעה קצובר'])
  
  // MASS BORROWING - sticky form values stored in localStorage
  // (loaded into formInfo when opening loan modal)
  const [openBorrowers, setOpenBorrowers] = useState([])
  
  // MASS MODE - for bulk operations
  const [showMassMode, setShowMassMode] = useState(false)
  const [massMode, setMassMode] = useState(null) // 'take' or 'return'
  const [massSelection, setMassSelection] = useState({}) // { item_id: qty }
  const [massBorrower, setMassBorrower] = useState('')
  const [massAdmin, setMassAdmin] = useState('')
  const [massReturner, setMassReturner] = useState('')
  const [massReturnBorrower, setMassReturnBorrower] = useState('')
  const [massReturnQty, setMassReturnQty] = useState({})

  function closeAllModals() {
    setShowAddModal(false)
    setShowLoanModal(null)
    setShowReturnModal(null)
    setShowEditModal(null)
    setShowInfoModal(null)
    setShowGlobalHistory(false)
    setShowMassMode(false)
    setMassMode(null)
    setMassSelection({})
  }

  useEffect(() => {
    async function loadItems() {
      setLoadingItems(true)
      try {
        const res = await fetch('/api/items')
        const text = await res.text()
        const data = text ? JSON.parse(text) : []
        if (data.error) setMessage(`שגיאה בטעינת פריטים: ${data.error}`)
        else setItems(data)
      } catch (err) {
        console.error(err)
        setMessage(`שגיאה בטעינת פריטים: ${err.message}`)
      } finally {
        setLoadingItems(false)
      }
    }
    loadItems()
  }, [])

  async function compressImage(file, maxWidth = 300, maxHeight = 300) {
    return new Promise(resolve => {
      const img = new Image()
      const reader = new FileReader()
      reader.onload = e => { img.src = e.target.result }

      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth }
        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        canvas.toBlob(blob => resolve(blob), 'image/webp', 0.6)
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleAddItem(e) {
    e.preventDefault()
    if (!newItem.image) return

    setLoadingAction(true)
    try {
      const compressed = await compressImage(newItem.image)
      const formData = new FormData()
      formData.append('name', newItem.name)
      formData.append('qty', newItem.qty)
      formData.append('image', compressed, newItem.image.name)

      const res = await fetch('/api/items', { method: 'POST', body: formData })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (res.ok && data.success) {
        setMessage('פריט נוסף ✅')
        setNewItem({ name: '', qty: '', image: null })
        setShowAddModal(false)
        const refreshed = await fetch('/api/items')
        setItems(await refreshed.json())
      } else setMessage(`הוספת פריט נכשלה: ${data.error || 'שגיאה בלתי קבועה'} ❌`)
    } catch (err) {
      console.error(err)
      setMessage(`שגיאה בהוספת פריט: ${err.message} ❌`)
    } finally {
      setLoadingAction(false)
    }
  }

  async function handleEditItem(item_id) {
    setLoadingAction(true)
    try {
      const formData = new FormData()
      formData.append('id', item_id)
      formData.append('name', editItem.name)
      formData.append('total_qty', editItem.total_qty)
      if (editItem.image) {
        const compressed = await compressImage(editItem.image)
        formData.append('image', compressed, editItem.image.name)
      }

      const res = await fetch('/api/items', { method: 'PUT', body: formData })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (res.ok && data.success) {
        setMessage('פריט עודכן ✅')
        setShowEditModal(null)
        const refreshed = await fetch('/api/items')
        setItems(await refreshed.json())
      } else setMessage(`עריכת פריט נכשלה: ${data.error || 'שגיאה בלתי קבועה'} ❌`)
    } catch (err) {
      console.error(err)
      setMessage(`שגיאה בעריכת פריט: ${err.message} ❌`)
    } finally {
      setLoadingAction(false)
    }
  }

  async function handleLoan(item_id) {
    const info = formInfo[item_id]
    const item = items.find(i => i.id === item_id)
    if (!info?.borrower || !info?.qty || !info?.admin) {
      setMessage('מלא את כל השדות כדי להשאיל ❌')
      return
    }
    if (info.qty > item.available_qty) {
      setMessage(`לא ניתן להשאיל יותר מהזמין (${item.available_qty}) ❌`)
      return
    }

    setLoadingAction(true)
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          item_id, 
          borrower: info.borrower, 
          quantity: Number(info.qty),
          admin: info.admin
        })
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (res.ok && data.success) {
        setMessage(`פריט הושאל ל${info.borrower} ✅`)
        // Save borrower and admin for next loan
        saveBorrowerInfo(info.borrower, info.admin)
        setFormInfo({ ...formInfo, [item_id]: {} })
        setShowLoanModal(null)
        const refreshed = await fetch('/api/items')
        setItems(await refreshed.json())
      } else setMessage(`השאלת פריט נכשלה: ${data.error || 'שגיאה בלתי קבועה'} ❌`)
    } catch (err) {
      console.error(err)
      setMessage(`שגיאה בהשאלת פריט: ${err.message} ❌`)
    } finally {
      setLoadingAction(false)
    }
  }

  async function handleReturn(item_id) {
    const info = formInfo[item_id]
    if (!info?.returner || !info?.returnQty) {
      setMessage('מלא את כל השדות כדי להחזיר ❌')
      return
    }

    setLoadingAction(true)
    try {
      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id, returner: info.returner, quantity: Number(info.returnQty) })
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (res.ok && data.success) {
        setMessage(`פריט הוחזר על ידי ${info.returner} ✅`)
        setFormInfo({ ...formInfo, [item_id]: {} })
        setShowReturnModal(null)
        const refreshed = await fetch('/api/items')
        setItems(await refreshed.json())
      } else setMessage(`החזרת פריט נכשלה: ${data.error || 'שגיאה בלתי קבועה'} ❌`)
    } catch (err) {
      console.error(err)
      setMessage(`שגיאה בהחזרת פריט: ${err.message} ❌`)
    } finally {
      setLoadingAction(false)
    }
  }

  async function fetchLoanHistory(item_id) {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/loans/${item_id}`)
      const text = await res.text()
      const data = text ? JSON.parse(text) : []

      const loans = Array.isArray(data) ? data : (data.loans || [])
      setLoanHistory(loans)

      setShowInfoModal(item_id)
    } catch (err) {
      console.error(err)
      setMessage(`שגיאה בטעינת היסטוריית השאלות: ${err.message}`)
    } finally {
      setLoadingHistory(false)
    }
  }

  async function fetchAllLoans() {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/loans/all')
      const text = await res.text()
      const data = text ? JSON.parse(text) : []
      setAllLoans(data)
      setShowGlobalHistory(true)
    } catch (err) {
      console.error(err)
      setMessage(`שגיאה בטעינת ההשאלות: ${err.message}`)
    } finally {
      setLoadingHistory(false)
    }
  }

  function calculateGlobalStats() {
    if (!Array.isArray(allLoans) || allLoans.length === 0) return null

    const totalLoans = allLoans.length
    const totalBorrowed = allLoans.reduce((sum, loan) => sum + loan.quantity, 0)
    const totalReturned = allLoans.reduce((sum, loan) => sum + (loan.returned_qty || 0), 0)
    const totalOutstanding = totalBorrowed - totalReturned

    const borrowerMap = {}
    allLoans.forEach(loan => {
      if (!borrowerMap[loan.borrower]) {
        borrowerMap[loan.borrower] = { count: 0, quantity: 0, returned: 0 }
      }
      borrowerMap[loan.borrower].count += 1
      borrowerMap[loan.borrower].quantity += loan.quantity
      borrowerMap[loan.borrower].returned += loan.returned_qty || 0
    })

    const topBorrowers = Object.entries(borrowerMap)
      .map(([name, data]) => ({
        name,
        loanCount: data.count,
        totalBorrowed: data.quantity,
        totalReturned: data.returned,
        outstanding: data.quantity - data.returned
      }))
      .sort((a, b) => b.totalBorrowed - a.totalBorrowed)
      .slice(0, 10)

    const currentlyBorrowing = {}
    allLoans.forEach(loan => {
      const outstanding = loan.quantity - (loan.returned_qty || 0)
      if (outstanding > 0) {
        if (!currentlyBorrowing[loan.borrower]) {
          currentlyBorrowing[loan.borrower] = []
        }
        currentlyBorrowing[loan.borrower].push({
          item_id: loan.item_id,
          quantity: outstanding,
          dateTaken: loan.date_taken
        })
      }
    })

    return {
      totalLoans,
      totalBorrowed,
      totalReturned,
      totalOutstanding,
      topBorrowers,
      currentlyBorrowing
    }
  }

  function calculateItemStats(loans) {
    if (!Array.isArray(loans) || loans.length === 0) return null

    const totalLoans = loans.length
    const totalBorrowed = loans.reduce((sum, loan) => sum + (loan.quantity || 0), 0)
    const totalReturned = loans.reduce((sum, loan) => sum + (loan.returned_qty || 0), 0)
    const totalOutstanding = totalBorrowed - totalReturned

    const borrowerMap = {}
    loans.forEach(loan => {
      if (!borrowerMap[loan.borrower]) {
        borrowerMap[loan.borrower] = { borrowed: 0, returned: 0 }
      }
      borrowerMap[loan.borrower].borrowed += loan.quantity || 0
      borrowerMap[loan.borrower].returned += loan.returned_qty || 0
    })

    const borrowers = Object.entries(borrowerMap)
      .map(([name, data]) => ({
        name,
        borrowed: data.borrowed,
        returned: data.returned,
        outstanding: data.borrowed - data.returned
      }))
      .sort((a, b) => b.outstanding - a.outstanding)

    return {
      totalLoans,
      totalBorrowed,
      totalReturned,
      totalOutstanding,
      borrowers
    }
  }

  function isOverdue(dateTaken, days = 14) {
    const taken = new Date(dateTaken)
    const diffDays = Math.floor((new Date() - taken) / (1000 * 60 * 60 * 24))
    return diffDays > days
  }

  // Select borrower from checklist and update form
  function selectOpenBorrower(borrowerName, qty) {
    setFormInfo(prev => ({ ...prev, [showReturnModal]: { returner: borrowerName, returnQty: String(qty) } }))
  }

  // Get open borrowers for an item (borrowed but not returned everything)
  function getOpenBorrowers(item_id) {
    const itemLoans = loanHistory.filter(loan => loan.item_id === item_id)
    const borrowers = {}
    
    itemLoans.forEach(loan => {
      const outstanding = loan.quantity - (loan.returned_qty || 0)
      if (outstanding > 0) {
        if (!borrowers[loan.borrower]) {
          borrowers[loan.borrower] = outstanding
        } else {
          borrowers[loan.borrower] += outstanding
        }
      }
    })
    
    return Object.entries(borrowers).map(([name, qty]) => ({ name, qty }))
  }

  // Open return modal and fetch open borrowers
  async function openReturnModal(item_id) {
    setShowReturnModal(item_id)
    setFormInfo(prev => ({ ...prev, [item_id]: { returner: '', returnQty: '' } }))
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/loans/${item_id}`)
      const text = await res.text()
      const data = text ? JSON.parse(text) : []
      const loans = Array.isArray(data) ? data : (data.loans || [])
      setLoanHistory(loans)
      
      // Calculate open borrowers
      const itemLoans = loans.filter(loan => loan.item_id === item_id)
      const borrowers = {}
      itemLoans.forEach(loan => {
        const outstanding = loan.quantity - (loan.returned_qty || 0)
        if (outstanding > 0) {
          if (!borrowers[loan.borrower]) {
            borrowers[loan.borrower] = outstanding
          } else {
            borrowers[loan.borrower] += outstanding
          }
        }
      })
      setOpenBorrowers(Object.entries(borrowers).map(([name, qty]) => ({ name, qty })))
    } catch (err) {
      console.error(err)
      setMessage(`שגיאה בטעינת המשאילים: ${err.message}`)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Helper: get last borrower info from localStorage
  function getLastBorrowerInfo() {
    try {
      const saved = localStorage.getItem('lastBorrowerInfo')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Error loading borrower info:', e)
    }
    return { borrower: '', admin: '' }
  }

  // Helper: save borrower info to localStorage
  function saveBorrowerInfo(borrower, admin) {
    localStorage.setItem('lastBorrowerInfo', JSON.stringify({ borrower, admin }))
  }

  // MASS MODE - Process all selected loans
  async function processMassLoans() {
    if (!massBorrower || !massAdmin || Object.keys(massSelection).length === 0) {
      setMessage('בחר משאיל, אדמין ופריטים לפחות \u274c')
      return
    }

    setLoadingAction(true)
    try {
      const selectedItems = Object.entries(massSelection)
        .filter(([_, qty]) => qty > 0)
        .map(([item_id, qty]) => ({ item_id, quantity: parseInt(qty) }))

      for (const { item_id, quantity } of selectedItems) {
        const res = await fetch('/api/loans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id,
            borrower: massBorrower,
            quantity,
            admin: massAdmin
          })
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(`\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05e4\u05e8\u05d9\u05d8 ${items.find(i => i.id === item_id)?.name}: ${data.error}`)
        }
      }

      setMessage(`${selectedItems.length} \u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u05d4\u05d5\u05e9\u05d0\u05dc\u05d5 \u05dc${massBorrower} \u2705`)
      saveBorrowerInfo(massBorrower, massAdmin)
      
      // Reset
      setShowMassMode(false)
      setMassMode(null)
      setMassSelection({})
      setMassBorrower('')
      setMassAdmin('')
      
      // Refresh items
      const refreshed = await fetch('/api/items')
      setItems(await refreshed.json())
    } catch (err) {
      console.error(err)
      setMessage(`\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d4\u05e9\u05d0\u05dc\u05d4: ${err.message} \u274c`)
    } finally {
      setLoadingAction(false)
    }
  }

  // MASS MODE - Process all selected returns
  async function processMassReturns() {
    if (!massReturnBorrower || Object.keys(massReturnQty).length === 0 || Object.values(massReturnQty).every(v => v <= 0)) {
      setMessage('\u05d1\u05d7\u05e8 \u05de\u05e9\u05d0\u05d9\u05dc \u05d5\u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u05d1\u05db\u05de\u05d5\u05d9\u05d5\u05ea \u274c')
      return
    }

    setLoadingAction(true)
    try {
      const selectedItems = Object.entries(massReturnQty)
        .filter(([_, qty]) => qty > 0)
        .map(([item_id, qty]) => ({ item_id, quantity: parseInt(qty) }))

      for (const { item_id, quantity } of selectedItems) {
        const res = await fetch('/api/return', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id,
            returner: massReturnBorrower,
            quantity
          })
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(`\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d4\u05d7\u05d6\u05e8\u05d4 ${items.find(i => i.id === item_id)?.name}: ${data.error}`)
        }
      }

      setMessage(`${selectedItems.length} \u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u05d4\u05d5\u05d7\u05d6\u05e8\u05d5 \u2705`)
      
      // Reset
      setShowMassMode(false)
      setMassMode(null)
      setMassSelection({})
      setMassReturnBorrower('')
      setMassReturnQty({})
      
      // Refresh items
      const refreshed = await fetch('/api/items')
      setItems(await refreshed.json())
    } catch (err) {
      console.error(err)
      setMessage(`\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d4\u05d7\u05d6\u05e8\u05d4: ${err.message} \u274c`)
    } finally {
      setLoadingAction(false)
    }
  }

  // Open return mode and fetch all loans for borrower dropdown
  async function openMassReturnMode() {
    setMassMode('return')
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/loans/all')
      const data = await res.json()
      setAllLoans(data || [])
    } catch (err) {
      console.error('Error fetching loans:', err)
      setMessage(`שגיאה בטעינת ההשאלות: ${err.message}`)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Open loan modal with pre-filled last borrower/admin
  function openLoanModal(item_id) {
    const lastInfo = getLastBorrowerInfo()
    setFormInfo(prev => ({
      ...prev,
      [item_id]: {
        borrower: lastInfo.borrower,
        qty: '',
        admin: lastInfo.admin
      }
    }))
    setShowLoanModal(item_id)
  }

  return (
    <main>
      <h1>גמ"ח – ניהול מלאי</h1>

      {message && <div className="message">{message}</div>}

      {/* GLOBAL LOADING OVERLAY - shows spinner for any loading state */}
      {(loadingItems || loadingAction || loadingHistory) && (
        <div className="global-loading-overlay" aria-hidden>
          <div className="spinner" />
        </div>
      )}

      {/* TOP BUTTONS */}
      <div className="top-buttons">
        <button
          className="history-btn"
          onClick={fetchAllLoans}
          title="היסטוריה כללית"
          disabled={loadingHistory}
        >
          {loadingHistory ? 'טוען...' : '📊'}
        </button>

        <button
          className="history-btn"
          onClick={() => setShowMassMode(true)}
          title="מצב המוני"
          style={{ bottom: '160px' }}
        >
          ⚡
        </button>

        <button
          className="add-btn"
          onClick={() => setShowAddModal(true)}
          disabled={loadingAction || loadingItems}
          title="הוסף פריט"
        >
          +
        </button>
      </div>

      {/* LOADING ITEMS */}
      {loadingItems ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="grid">
          {items.map(item => (
            <div key={item.id} className="card">
              <img src={item.image_url} alt={item.name} />

              <div className="card-header">
                <button
                  className="card-icon-btn"
                  onClick={() => {
                    setEditItem({ name: item.name, total_qty: item.total_qty, image: null })
                    setShowEditModal(item.id)
                  }}
                  title="עריכה"
                >
                  ✏️
                </button>
                <button
                  className="card-icon-btn"
                  onClick={() => fetchLoanHistory(item.id)}
                  title="היסטוריה"
                  disabled={loadingHistory}
                >
                  ℹ️
                </button>
              </div>

              <h3>{item.name}</h3>
              <p>זמין: {item.available_qty} / {item.total_qty}</p>

              <button
                disabled={item.available_qty <= 0 || loadingAction}
                onClick={() => openLoanModal(item.id)}
              >
                {loadingAction ? 'טוען...' : 'השאלה'}
              </button>

              {item.available_qty < item.total_qty && (
                <button
                  disabled={loadingAction}
                  onClick={() => openReturnModal(item.id)}
                >
                  {loadingAction ? 'טוען...' : 'החזרה'}
                </button>
              )}

              {showLoanModal === item.id && (
                <div className="modal" onMouseDown={() => closeAllModals()}>
                  <form
                    className="modal-form"
                    onMouseDown={e => e.stopPropagation()}
                    onSubmit={e => { e.preventDefault(); handleLoan(item.id) }}
                  >
                    <h2>השאלת פריט: {item.name}</h2>
                    <input
                      placeholder="מי לקח"
                      value={formInfo[item.id]?.borrower || ''}
                      onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], borrower: e.target.value } })}
                      required
                    />
                    <input
                      type="number"
                      placeholder="כמות"
                      value={formInfo[item.id]?.qty || ''}
                      onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], qty: e.target.value } })}
                      required
                    />
                    <select
                      value={formInfo[item.id]?.admin || ''}
                      onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], admin: e.target.value } })}
                      required
                    >
                      <option value="">בחר משאיל</option>
                      {admins.map((admin, idx) => (
                        <option key={idx} value={admin}>{admin}</option>
                      ))}
                    </select>
                    <div className="modal-buttons">
                      <button type="submit" disabled={loadingAction}>
                        {loadingAction ? 'טוען...' : 'השאלה'}
                      </button>
                      <button type="button" onClick={() => setShowLoanModal(null)}>
                        ביטול
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {showReturnModal === item.id && (
                <div className="modal" onMouseDown={() => closeAllModals()}>
                  <form
                    className="modal-form"
                    onMouseDown={e => e.stopPropagation()}
                    onSubmit={e => { e.preventDefault(); handleReturn(item.id) }}
                  >
                    <h2>החזרת פריט: {item.name}</h2>
                    
                    {openBorrowers.length > 0 && (
                      <div className="borrowers-checklist">
                        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>בחר משאיל:</p>
                        {openBorrowers.map((borrower, idx) => (
                          <div key={idx} className="borrower-option">
                            <button
                              type="button"
                              className="borrower-btn"
                              onClick={() => selectOpenBorrower(borrower.name, borrower.qty)}
                            >
                              {borrower.name} ({borrower.qty} בהשאלה)
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <input
                      placeholder="מי מחזיר"
                      value={formInfo[item.id]?.returner || ''}
                      onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], returner: e.target.value } })}
                      required
                    />
                    <input
                      type="number"
                      placeholder="כמות להחזרה"
                      value={formInfo[item.id]?.returnQty || ''}
                      onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], returnQty: e.target.value } })}
                      required
                    />
                    <div className="modal-buttons">
                      <button type="submit" disabled={loadingAction}>
                        {loadingAction ? 'טוען...' : 'החזרה'}
                      </button>
                      <button type="button" onClick={() => setShowReturnModal(null)}>
                        ביטול
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {showEditModal === item.id && (
                <div className="modal" onMouseDown={() => closeAllModals()}>
                  <form
                    className="modal-form"
                    onMouseDown={e => e.stopPropagation()}
                    onSubmit={e => { e.preventDefault(); handleEditItem(item.id) }}
                  >
                    <h2>עריכת פריט: {item.name}</h2>
                    <input
                      placeholder="שם פריט"
                      value={editItem.name}
                      onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                      required
                    />
                    <input
                      type="number"
                      placeholder='סה"כ כמות'
                      value={editItem.total_qty}
                      onChange={e => setEditItem({ ...editItem, total_qty: e.target.value })}
                      required
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setEditItem({ ...editItem, image: e.target.files[0] })}
                    />
                    <div className="modal-buttons">
                      <button type="submit" disabled={loadingAction}>
                        {loadingAction ? 'טוען...' : 'עדכן פריט'}
                      </button>
                      <button type="button" onClick={() => setShowEditModal(null)}>
                        ביטול
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {showInfoModal === item.id && (
                <div className="modal" onMouseDown={() => closeAllModals()}>
                  <div className="modal-form" style={{ maxHeight: '80vh', overflowY: 'auto' }} onMouseDown={e => e.stopPropagation()}>
                    <h2>היסטוריית השאלות: {item.name}</h2>

                    {(() => {
                      const stats = calculateItemStats(loanHistory)
                      if (!stats) return <p>אין היסטוריה להשאלה</p>

                      return (
                        <>
                          <div className="history-card">
                            <h3>סטטיסטיקה</h3>
                            <p><strong>סה"כ השאלות:</strong> {stats.totalLoans}</p>
                            <p><strong>סה"כ כמות שהושאלה:</strong> {stats.totalBorrowed}</p>
                            <p><strong>סה"כ כמות שהוחזרה:</strong> {stats.totalReturned}</p>
                            <p><strong>סה"כ כמות עדיין בהשאלה:</strong> {stats.totalOutstanding}</p>
                          </div>

                          <div className="history-card">
                            <h3>👤 לפי משאיל</h3>
                            {stats.borrowers.map((b, idx) => (
                              <div key={idx} className="history-item">
                                <p
                                  className="history-link"
                                  onClick={() => openReturnFor(item.id, b.name)}
                                >
                                  <strong>{b.name}</strong>
                                </p>
                                <p>הושאל: {b.borrowed} | הוחזר: {b.returned} | פתוח: {b.outstanding}</p>
                              </div>
                            ))}
                          </div>

                          <div className="history-card">
                            <h3>📜 פרטים</h3>
                            {loanHistory.map((loan, idx) => {
                              const overdue = isOverdue(loan.date_taken)
                              return (
                                <div key={idx} className="history-item">
                                  <p><strong>שם המשאיל:</strong> {loan.borrower}</p>
                                  <p><strong>כמות:</strong> {loan.quantity}</p>
                                  <p><strong>תאריך:</strong> {new Date(loan.date_taken).toLocaleDateString('he-IL')}</p>
                                  {loan.admin && <p><strong>אדמין:</strong> {loan.admin}</p>}
                                  <p><strong>החזור:</strong> {loan.returned_qty || 0} / {loan.quantity}</p>
                                  {overdue && <p className="overdue">⚠️ overdue (יותר מ-14 ימים)</p>}
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )
                    })()}

                    <div className="modal-buttons">
                      <button type="button" onClick={() => setShowInfoModal(null)}>סגור</button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <form className="modal-form" onMouseDown={e => e.stopPropagation()} onSubmit={handleAddItem}>
            <h2>הוספת פריט חדש</h2>
            <input placeholder="שם פריט" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required />
            <input type="number" placeholder='סה"כ כמות' value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: e.target.value })} required />
            <input type="file" accept="image/*" onChange={e => setNewItem({ ...newItem, image: e.target.files[0] })} required />
            <div className="modal-buttons">
              <button type="submit" disabled={loadingAction}>
                {loadingAction ? 'טוען...' : 'הוסף פריט'}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)}>
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {showGlobalHistory && (() => {
        const stats = calculateGlobalStats()
        return (
          <div className="modal" onMouseDown={() => closeAllModals()}>
            <div className="modal-form" style={{ maxHeight: '90vh', overflowY: 'auto', maxWidth: '600px' }} onMouseDown={e => e.stopPropagation()}>
              <h2>📊 סטטיסטיקה כללית</h2>

              {!stats ? (
                <p>אין נתונים להצגה</p>
              ) : (
                <>
                  <div className="stats-grid">
                    <div className="stat-box">
                      <h4>סה"כ השאלות</h4>
                      <p>{stats.totalLoans}</p>
                    </div>
                    <div className="stat-box">
                      <h4>סה"כ שהושאל</h4>
                      <p>{stats.totalBorrowed}</p>
                    </div>
                    <div className="stat-box">
                      <h4>סה"כ שהוחזר</h4>
                      <p>{stats.totalReturned}</p>
                    </div>
                    <div className="stat-box">
                      <h4>עדיין בהשאלה</h4>
                      <p style={{ color: '#dc3545' }}>{stats.totalOutstanding}</p>
                    </div>
                  </div>

                  <div className="history-card">
                    <h3>👥 המשאילים המובילים</h3>
                    {stats.topBorrowers.map((borrower, idx) => (
                      <div key={idx} className="history-item">
                        <p><strong>{idx + 1}. {borrower.name}</strong></p>
                        <p>השאלות: {borrower.loanCount}</p>
                        <p>סה"כ שהושאל: {borrower.totalBorrowed}</p>
                        <p>עדיין בהשאלה: {borrower.outstanding}</p>
                      </div>
                    ))}
                  </div>

                  <div className="history-card">
                    <h3>📦 המשאילים הנוכחיים</h3>
                    {Object.entries(stats.currentlyBorrowing).length === 0 ? (
                      <p>אין פריטים בהשאלה כרגע</p>
                    ) : (
                      Object.entries(stats.currentlyBorrowing).map(([borrower, loans], idx) => (
                        <div key={idx} className="history-item">
                          <p><strong>{borrower}</strong></p>
                          {loans.map((loan, lIdx) => {
                            const item = items.find(i => i.id === loan.item_id)
                            const daysAgo = Math.floor((new Date() - new Date(loan.dateTaken)) / (1000 * 60 * 60 * 24))
                            return (
                              <p key={lIdx} style={{ marginLeft: '1rem', fontSize: '1rem' }}>
                                • {item?.name || 'פריט'}: {loan.quantity} יח׳ - מ{daysAgo} ימים
                              </p>
                            )
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              <div className="modal-buttons">
                <button type="button" onClick={() => setShowGlobalHistory(false)}>סגור</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MASS MODE */}
      {showMassMode && !massMode && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <div className="modal-form" onMouseDown={e => e.stopPropagation()}>
            <h2>בחר מצב</h2>
            <div className="modal-buttons" style={{ flexDirection: 'column', gap: '1rem' }}>
              <button 
                type="button"
                onClick={() => {
                  setMassMode('take')
                  const lastInfo = getLastBorrowerInfo()
                  setMassBorrower(lastInfo.borrower)
                  setMassAdmin(lastInfo.admin)
                }}
                style={{ padding: '1rem', fontSize: '1.1rem' }}
              >
                📤 השאלה - קח פריטים
              </button>
              <button 
                type="button"
                onClick={openMassReturnMode}
                style={{ padding: '1rem', fontSize: '1.1rem' }}
              >
                📥 החזרה - החזר פריטים
              </button>
              <button 
                type="button"
                onClick={() => closeAllModals()}
                style={{ padding: '0.75rem', backgroundColor: '#ccc', color: '#333' }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MASS TAKE MODE */}
      {showMassMode && massMode === 'take' && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <div className="modal-form" style={{ maxHeight: '90vh', overflowY: 'auto', maxWidth: '600px' }} onMouseDown={e => e.stopPropagation()}>
            <h2>השאלה המונית</h2>
            
            <input
              placeholder="מי לוקח"
              value={massBorrower}
              onChange={e => setMassBorrower(e.target.value)}
              required
            />
            
            <select
              value={massAdmin}
              onChange={e => setMassAdmin(e.target.value)}
              required
            >
              <option value="">בחר משאיל</option>
              {admins.map((admin, idx) => (
                <option key={idx} value={admin}>{admin}</option>
              ))}
            </select>

            <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>בחר פריטים וכמויות:</p>
              {items.filter(item => item.available_qty > 0).map(item => (
                <div key={item.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '6px'
                }}>
                  <img src={item.image_url} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{item.name}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>זמין: {item.available_qty}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={item.available_qty}
                    value={massSelection[item.id] || ''}
                    onChange={e => {
                      const val = e.target.value ? parseInt(e.target.value) : 0
                      if (val >= 0) {
                        setMassSelection(prev => ({
                          ...prev,
                          [item.id]: val
                        }))
                      }
                    }}
                    style={{ width: '60px', padding: '0.4rem' }}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            <div className="modal-buttons">
              <button 
                type="button" 
                onClick={processMassLoans}
                disabled={loadingAction || !massBorrower || !massAdmin}
              >
                {loadingAction ? 'טוען...' : '✅ בצע השאלה'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setMassMode(null)
                  setMassSelection({})
                }}
              >
                חזור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MASS RETURN MODE */}
      {showMassMode && massMode === 'return' && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <div className="modal-form" style={{ maxHeight: '90vh', overflowY: 'auto', maxWidth: '600px' }} onMouseDown={e => e.stopPropagation()}>
            <h2>החזרה המונית</h2>
            
            <select
              value={massReturnBorrower}
              onChange={e => setMassReturnBorrower(e.target.value)}
              required
            >
              <option value="">בחר משאיל</option>
              {allLoans
                .filter(loan => (loan.quantity - (loan.returned_qty || 0)) > 0)
                .map(loan => loan.borrower)
                .filter((v, i, a) => a.indexOf(v) === i)
                .sort()
                .map((borrower, idx) => (
                  <option key={idx} value={borrower}>{borrower}</option>
                ))}
            </select>

            <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>בחר פריטים וכמויות:</p>
              {items.map(item => {
                const borrowed = allLoans.filter(
                  loan => loan.item_id === item.id && 
                  loan.borrower === massReturnBorrower && 
                  (loan.quantity - (loan.returned_qty || 0)) > 0
                ).reduce((sum, loan) => sum + (loan.quantity - (loan.returned_qty || 0)), 0)
                
                if (borrowed <= 0) return null
                
                return (
                  <div key={item.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.5rem',
                    marginBottom: '0.5rem',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '6px'
                  }}>
                    <img src={item.image_url} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>{item.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>בהשאלה: {borrowed}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={borrowed}
                      value={massReturnQty[item.id] || ''}
                      onChange={e => {
                        const val = e.target.value ? parseInt(e.target.value) : 0
                        if (val >= 0) {
                          setMassReturnQty(prev => ({
                            ...prev,
                            [item.id]: val
                          }))
                        }
                      }}
                      style={{ width: '60px', padding: '0.4rem' }}
                      placeholder="0"
                    />
                  </div>
                )
              })}
            </div>

            <div className="modal-buttons">
              <button 
                type="button" 
                onClick={processMassReturns}
                disabled={loadingAction || !massReturnBorrower}
              >
                {loadingAction ? 'טוען...' : '✅ בצע החזרה'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setMassMode(null)
                  setMassReturnQty({})
                }}
              >
                חזור
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
