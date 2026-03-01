'use client'
import React, { useState, useEffect } from 'react'
import './page.css'

export default function Home() {
  const [items, setItems] = useState([])
  const [message, setMessage] = useState('')
  const messageTimerRef = React.useRef(null)
  function showMessage(msg) {
    setMessage(msg)
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current)
    messageTimerRef.current = setTimeout(() => setMessage(''), 4000)
  }

  const [showAddModal, setShowAddModal] = useState(false)
  const [showLoanModal, setShowLoanModal] = useState(null)
  const [showReturnModal, setShowReturnModal] = useState(null)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showInfoModal, setShowInfoModal] = useState(null)
  const [showGlobalHistory, setShowGlobalHistory] = useState(false)

  const [loanHistory, setLoanHistory] = useState([])
  const [allLoans, setAllLoans] = useState([])

  const [loadingItems, setLoadingItems] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [newItem, setNewItem] = useState({ name: '', qty: '', image: null })
  const [formInfo, setFormInfo] = useState({})
  const [editItem, setEditItem] = useState({ name: '', total_qty: '', image: null })

  const [admins] = useState(['מיכל בארי', 'מרים וייס', 'שרי זהבי', 'נעה קצובר'])
  const [openBorrowers, setOpenBorrowers] = useState([])

  const [showMassMode, setShowMassMode] = useState(false)
  const [massMode, setMassMode] = useState(null)
  const [massSelection, setMassSelection] = useState({})
  const [massBorrower, setMassBorrower] = useState('')
  const [massAdmin, setMassAdmin] = useState('')
  const [massReturnBorrower, setMassReturnBorrower] = useState('')
  const [massReturnQty, setMassReturnQty] = useState({})

  const [searchQuery, setSearchQuery] = useState('')
  const [massSearchQuery, setMassSearchQuery] = useState('')

  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedShareBorrower, setSelectedShareBorrower] = useState('')
  const [sharePhoneNumber, setSharePhoneNumber] = useState('')

  const [massPayment, setMassPayment] = useState({})

  const [globalStatsTab, setGlobalStatsTab] = useState('overview')
  const [itemStatsTab, setItemStatsTab] = useState('overview')


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
    setMassSearchQuery('')
    setShowShareModal(false)
    setSelectedShareBorrower('')
    setSharePhoneNumber('')
    setMassPayment({})
    // reset which tab you were on when you reopen stats
  }

  useEffect(() => {
    async function loadItems() {
      setLoadingItems(true)
      try {
        const res = await fetch('/api/items')
        const text = await res.text()
        const data = text ? JSON.parse(text) : []
        if (data.error) showMessage(`שגיאה בטעינת פריטים: ${data.error}`)
        else setItems(data)
      } catch (err) {
        showMessage(`שגיאה בטעינת פריטים: ${err.message}`)
      } finally {
        setLoadingItems(false)
      }
    }
    loadItems()
  }, [])

  async function compressImage(file, maxWidth = 300, maxHeight = 300) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('נכשלה קריאת הקובץ'))
      reader.onload = e => { img.src = e.target.result }
      img.onerror = () => reject(new Error('נכשלה טעינת התמונה'))
      img.onload = () => {
        let width = img.width, height = img.height
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth }
        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight }
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(width); canvas.height = Math.round(height)
        canvas.getContext('2d').drawImage(img, 0, 0, Math.round(width), Math.round(height))
        canvas.toBlob(blob => {
          if (blob) resolve(blob)
          else reject(new Error('נכשלה דחיסת התמונה'))
        }, 'image/webp', 0.6)
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleAddItem(e) {
    e.preventDefault()
    if (!newItem.image) { showMessage('יש לבחור תמונה ❌'); return }
    if (!newItem.name.trim()) { showMessage('יש להזין שם פריט ❌'); return }
    const addQty = Number(newItem.qty)
    if (!addQty || addQty <= 0) { showMessage('כמות חייבת להיות גדולה מ-0 ❌'); return }
    setLoadingAction(true)
    try {
      const compressed = await compressImage(newItem.image)
      const formData = new FormData()
      formData.append('name', newItem.name)
      formData.append('qty', newItem.qty)
      formData.append('image', compressed, newItem.image.name)
      const res = await fetch('/api/items', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok && data.success) {
        showMessage('פריט נוסף ✅')
        setNewItem({ name: '', qty: '', image: null })
        setShowAddModal(false)
        setItems(await (await fetch('/api/items')).json())
      } else showMessage(`הוספת פריט נכשלה: ${data.error || 'שגיאה'} ❌`)
    } catch (err) {
      showMessage(`שגיאה בהוספת פריט: ${err.message} ❌`)
    } finally {
      setLoadingAction(false)
    }
  }

  async function handleEditItem(item_id) {
    const item = items.find(i => i.id === item_id)
    const newTotalQty = Number(editItem.total_qty)
    if (!newTotalQty || newTotalQty <= 0) { showMessage('כמות חייבת להיות גדולה מ-0 ❌'); return }
    const currentlyLoaned = item ? (item.total_qty - item.available_qty) : 0
    if (newTotalQty < currentlyLoaned) {
      showMessage(`לא ניתן להגדיר כמות נמוכה מהמושאל כרגע (${currentlyLoaned}) ❌`); return
    }
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
      const data = await res.json()
      if (res.ok && data.success) {
        showMessage('פריט עודכן ✅')
        setShowEditModal(null)
        setItems(await (await fetch('/api/items')).json())
      } else showMessage(`עריכת פריט נכשלה: ${data.error || 'שגיאה'} ❌`)
    } catch (err) {
      showMessage(`שגיאה בעריכת פריט: ${err.message} ❌`)
    } finally {
      setLoadingAction(false)
    }
  }

  async function handleLoan(item_id) {
    const info = formInfo[item_id]
    const item = items.find(i => i.id === item_id)
    if (!info?.borrower || !info?.qty || !info?.admin) { showMessage('מלא את כל השדות ❌'); return }
    const qty = Number(info.qty)
    if (!qty || qty <= 0) { showMessage('כמות חייבת להיות גדולה מ-0 ❌'); return }
    if (qty > item.available_qty) { showMessage(`לא ניתן להשאיל יותר מהזמין (${item.available_qty}) ❌`); return }
    setLoadingAction(true)
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id, borrower: info.borrower, quantity: qty, admin: info.admin, price: info.payment !== undefined && info.payment !== '' ? Number(info.payment) : -1 })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showMessage(`פריט הושאל ל${info.borrower} ✅`)
        saveBorrowerInfo(info.borrower, info.admin)
        setFormInfo({ ...formInfo, [item_id]: {} })
        setShowLoanModal(null)
        setItems(await (await fetch('/api/items')).json())
      } else showMessage(`השאלת פריט נכשלה: ${data.error || 'שגיאה'} ❌`)
    } catch (err) {
      showMessage(`שגיאה בהשאלת פריט: ${err.message} ❌`)
    } finally {
      setLoadingAction(false)
    }
  }

  async function handleReturn(item_id) {
    const info = formInfo[item_id]
    if (!info?.returner || !info?.returnQty) { showMessage('מלא את כל השדות ❌'); return }
    const returnQty = Number(info.returnQty)
    if (!returnQty || returnQty <= 0) { showMessage('כמות חייבת להיות גדולה מ-0 ❌'); return }
    const outstanding = loanHistory
      .filter(l => l.item_id === item_id && l.borrower === info.returner)
      .reduce((s, l) => s + (l.quantity - (l.returned_qty || 0)), 0)
    if (outstanding > 0 && returnQty > outstanding) {
      showMessage(`לא ניתן להחזיר יותר מהמושאל (${outstanding}) ❌`); return
    }
    setLoadingAction(true)
    try {
      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id, returner: info.returner, quantity: returnQty, price: info.paidAmount !== undefined && info.paidAmount !== '' ? Number(info.paidAmount) : -1 })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showMessage(`פריט הוחזר על ידי ${info.returner} ✅`)
        setFormInfo({ ...formInfo, [item_id]: {} })
        setShowReturnModal(null)
        setItems(await (await fetch('/api/items')).json())
      } else showMessage(`החזרת פריט נכשלה: ${data.error || 'שגיאה'} ❌`)
    } catch (err) {
      showMessage(`שגיאה בהחזרת פריט: ${err.message} ❌`)
    } finally {
      setLoadingAction(false)
    }
  }

  async function fetchLoanHistory(item_id) {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/loans/${item_id}`)
      const data = await res.json()
      setLoanHistory(Array.isArray(data) ? data : (data.loans || []))
      setShowInfoModal(item_id)
    } catch (err) {
      showMessage(`שגיאה בטעינת היסטוריה: ${err.message}`)
    } finally {
      setLoadingHistory(false)
    }
  }

  async function fetchAllLoans() {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/loans/all')
      const data = await res.json()
      setAllLoans(data)
      setShowGlobalHistory(true)
    } catch (err) {
      showMessage(`שגיאה בטעינת ההשאלות: ${err.message}`)
    } finally {
      setLoadingHistory(false)
    }
  }

  function calculateGlobalStats() {
    if (!Array.isArray(allLoans) || allLoans.length === 0) return null
    const now = new Date()
    const totalLoans = allLoans.length
    const totalBorrowed = allLoans.reduce((s, l) => s + l.quantity, 0)
    const totalReturned = allLoans.reduce((s, l) => s + (l.returned_qty || 0), 0)
    const totalOutstanding = totalBorrowed - totalReturned

    const borrowerMap = {}
    allLoans.forEach(loan => {
      if (!borrowerMap[loan.borrower]) borrowerMap[loan.borrower] = { count: 0, quantity: 0, returned: 0, lastDate: null }
      borrowerMap[loan.borrower].count += 1
      borrowerMap[loan.borrower].quantity += loan.quantity
      borrowerMap[loan.borrower].returned += loan.returned_qty || 0
      const d = new Date(loan.date_taken)
      if (!borrowerMap[loan.borrower].lastDate || d > borrowerMap[loan.borrower].lastDate)
        borrowerMap[loan.borrower].lastDate = d
    })
    const borrowers = Object.entries(borrowerMap)
      .map(([name, d]) => ({ name, loanCount: d.count, totalBorrowed: d.quantity, totalReturned: d.returned, outstanding: d.quantity - d.returned, lastDate: d.lastDate }))
      .sort((a, b) => b.outstanding - a.outstanding || b.totalBorrowed - a.totalBorrowed)

    const currentlyBorrowing = {}
    allLoans.forEach(loan => {
      const out = loan.quantity - (loan.returned_qty || 0)
      if (out > 0) {
        if (!currentlyBorrowing[loan.borrower]) currentlyBorrowing[loan.borrower] = []
        const days = Math.floor((now - new Date(loan.date_taken)) / 86400000)
        currentlyBorrowing[loan.borrower].push({ item_id: loan.item_id, quantity: out, dateTaken: loan.date_taken, days, overdue: days > 14 })
      }
    })

    const overdueLoans = allLoans
      .filter(l => (l.quantity - (l.returned_qty || 0)) > 0)
      .map(l => ({ ...l, days: Math.floor((now - new Date(l.date_taken)) / 86400000), outstanding: l.quantity - (l.returned_qty || 0) }))
      .filter(l => l.days > 14)
      .sort((a, b) => b.days - a.days)

    const itemUtil = items.map(item => {
      const loaned = item.total_qty - item.available_qty
      const pct = item.total_qty > 0 ? Math.round((loaned / item.total_qty) * 100) : 0
      return { ...item, loaned, pct }
    }).sort((a, b) => b.pct - a.pct)

    const returnRate = totalBorrowed > 0 ? Math.round((totalReturned / totalBorrowed) * 100) : 0
    const utilizationPct = items.length > 0
      ? Math.round(items.reduce((s, i) => s + (i.total_qty > 0 ? (i.total_qty - i.available_qty) / i.total_qty : 0), 0) / items.length * 100)
      : 0

    return { totalLoans, totalBorrowed, totalReturned, totalOutstanding, borrowers, currentlyBorrowing, overdueLoans, itemUtil, returnRate, utilizationPct }
  }

  function calculateItemStats(loans) {
    if (!Array.isArray(loans) || loans.length === 0) return null
    const now = new Date()
    const borrowerMap = {}
    loans.forEach(loan => {
      if (!borrowerMap[loan.borrower]) borrowerMap[loan.borrower] = { borrowed: 0, returned: 0, dates: [] }
      borrowerMap[loan.borrower].borrowed += loan.quantity || 0
      borrowerMap[loan.borrower].returned += loan.returned_qty || 0
      borrowerMap[loan.borrower].dates.push(new Date(loan.date_taken))
    })
    const borrowers = Object.entries(borrowerMap)
      .map(([name, d]) => ({ name, borrowed: d.borrowed, returned: d.returned, outstanding: d.borrowed - d.returned, lastDate: d.dates.sort((a, b) => b - a)[0] }))
      .sort((a, b) => b.outstanding - a.outstanding || b.borrowed - a.borrowed)

    const totalBorrowed = loans.reduce((s, l) => s + (l.quantity || 0), 0)
    const totalReturned = loans.reduce((s, l) => s + (l.returned_qty || 0), 0)
    const totalOutstanding = totalBorrowed - totalReturned
    const returnRate = totalBorrowed > 0 ? Math.round((totalReturned / totalBorrowed) * 100) : 0

    const loanLog = [...loans].sort((a, b) => new Date(b.date_taken) - new Date(a.date_taken)).map(l => ({
      ...l,
      days: Math.floor((now - new Date(l.date_taken)) / 86400000),
      outstanding: (l.quantity || 0) - (l.returned_qty || 0),
      overdue: Math.floor((now - new Date(l.date_taken)) / 86400000) > 14 && ((l.quantity || 0) - (l.returned_qty || 0)) > 0
    }))

    const overdueCount = loanLog.filter(l => l.overdue).length
    const avgDaysOut = loans.length > 0
      ? Math.round(loans.reduce((s, l) => s + Math.floor((now - new Date(l.date_taken)) / 86400000), 0) / loans.length)
      : 0

    return { totalLoans: loans.length, totalBorrowed, totalReturned, totalOutstanding, returnRate, borrowers, loanLog, overdueCount, avgDaysOut }
  }

  function isOverdue(dateTaken, days = 14) {
    return Math.floor((new Date() - new Date(dateTaken)) / (1000 * 60 * 60 * 24)) > days
  }

  function selectOpenBorrower(borrowerName, qty) {
    setFormInfo(prev => ({ ...prev, [showReturnModal]: { returner: borrowerName, returnQty: String(qty) } }))
  }

  async function openReturnModal(item_id) {
    setShowReturnModal(item_id)
    setFormInfo(prev => ({ ...prev, [item_id]: { returner: '', returnQty: '' } }))
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/loans/${item_id}`)
      const data = await res.json()
      const loans = Array.isArray(data) ? data : (data.loans || [])
      setLoanHistory(loans)
      const borrowers = {}
      loans.filter(l => l.item_id === item_id).forEach(loan => {
        const out = loan.quantity - (loan.returned_qty || 0)
        if (out > 0) borrowers[loan.borrower] = (borrowers[loan.borrower] || 0) + out
      })
      setOpenBorrowers(Object.entries(borrowers).map(([name, qty]) => ({ name, qty })))
    } catch (err) {
      showMessage(`שגיאה בטעינת המשאילים: ${err.message}`)
    } finally {
      setLoadingHistory(false)
    }
  }

  function getLastBorrowerInfo() {
    try { return JSON.parse(localStorage.getItem('lastBorrowerInfo')) || { borrower: '', admin: '' } }
    catch { return { borrower: '', admin: '' } }
  }

  function saveBorrowerInfo(borrower, admin) {
    localStorage.setItem('lastBorrowerInfo', JSON.stringify({ borrower, admin }))
  }

  async function processMassLoans() {
    const selectedItems_pre = Object.entries(massSelection).filter(([, q]) => q > 0)
    if (!massBorrower || !massAdmin || selectedItems_pre.length === 0) {
      showMessage('בחר משאיל, אדמין ופריטים לפחות ❌'); return
    }
    setLoadingAction(true)
    try {
      const selectedItems = selectedItems_pre.map(([item_id, qty]) => ({ item_id, quantity: parseInt(qty) }))
      for (const { item_id, quantity } of selectedItems) {
        const item = items.find(i => i.id === item_id)
        if (quantity > item.available_qty) {
          showMessage(`${item.name}: מבוקש ${quantity} אך זמין רק ${item.available_qty} ❌`)
          setLoadingAction(false)
          return
        }
      }
      for (const { item_id, quantity } of selectedItems) {
        const res = await fetch('/api/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id, borrower: massBorrower, quantity, admin: massAdmin, price: massPayment.amount !== undefined && massPayment.amount !== '' ? Number(massPayment.amount) : -1 }) })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(`שגיאה בפריט ${items.find(i => i.id === item_id)?.name}: ${data.error}`)
      }
      showMessage(`${selectedItems.length} פריטים הושאלו ל${massBorrower} ✅`)
      saveBorrowerInfo(massBorrower, massAdmin)
      setShowMassMode(false); setMassMode(null); setMassSelection({}); setMassBorrower(''); setMassAdmin('')
      setItems(await (await fetch('/api/items')).json())
    } catch (err) {
      showMessage(`שגיאה בהשאלה: ${err.message} ❌`)
    } finally {
      setLoadingAction(false)
    }
  }

  async function processMassReturns() {
    if (!massReturnBorrower || Object.values(massReturnQty).every(v => v <= 0)) {
      showMessage('בחר משאיל ופריטים בכמויות ❌'); return
    }
    setLoadingAction(true)
    try {
      const selectedItems = Object.entries(massReturnQty).filter(([, q]) => q > 0).map(([item_id, qty]) => ({ item_id, quantity: parseInt(qty) }))
      for (const { item_id, quantity } of selectedItems) {
        const borrowed = allLoans
          .filter(l => l.item_id === item_id && l.borrower === massReturnBorrower && (l.quantity - (l.returned_qty || 0)) > 0)
          .reduce((s, l) => s + (l.quantity - (l.returned_qty || 0)), 0)
        if (quantity > borrowed) {
          const item = items.find(i => i.id === item_id)
          showMessage(`${item?.name}: מבוקש להחזיר ${quantity} אך בהשאלה רק ${borrowed} ❌`)
          setLoadingAction(false)
          return
        }
      }
      for (const { item_id, quantity } of selectedItems) {
        const res = await fetch('/api/return', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id, returner: massReturnBorrower, quantity, price: massPayment.paid !== undefined && massPayment.paid !== '' ? Number(massPayment.paid) : -1 }) })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(`שגיאה בהחזרה ${items.find(i => i.id === item_id)?.name}: ${data.error}`)
      }
      showMessage(`${selectedItems.length} פריטים הוחזרו ✅`)
      setShowMassMode(false); setMassMode(null); setMassSelection({}); setMassReturnBorrower(''); setMassReturnQty({})
      setItems(await (await fetch('/api/items')).json())
    } catch (err) {
      showMessage(`שגיאה בהחזרה: ${err.message} ❌`)
    } finally {
      setLoadingAction(false)
    }
  }

  async function openMassReturnMode() {
    setMassMode('return')
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/loans/all')
      setAllLoans(await res.json() || [])
    } catch (err) {
      showMessage(`שגיאה בטעינת ההשאלות: ${err.message}`)
    } finally {
      setLoadingHistory(false)
    }
  }

  function openLoanModal(item_id) {
    const last = getLastBorrowerInfo()
    setFormInfo(prev => ({ ...prev, [item_id]: { borrower: last.borrower, qty: '', admin: last.admin } }))
    setShowLoanModal(item_id)
  }

  // literal newlines in .join() calls). Keeping only this clean version that builds
  // a plain text string and opens WhatsApp directly — same pattern as handleShare.
  function exportGlobalStats() {
    const stats = calculateGlobalStats()
    if (!stats) { showMessage('אין נתונים לייצוא ❌'); return }
    const date = new Date().toLocaleDateString('he-IL')
    let txt = `📊 סטטיסטיקה כללית — גמ"ח עיר דוד\n${date}\n`
    txt += `${'─'.repeat(28)}\n`
    txt += `סה"כ השאלות: ${stats.totalLoans}\n`
    txt += `סה"כ יחידות שהושאלו: ${stats.totalBorrowed}\n`
    txt += `סה"כ יחידות שהוחזרו: ${stats.totalReturned}\n`
    txt += `עדיין בהשאלה: ${stats.totalOutstanding}\n`
    txt += `אחוז החזרה: ${stats.returnRate}%\n`
    txt += `תפוסה ממוצעת: ${stats.utilizationPct}%\n`
    if (stats.overdueLoans.length > 0) {
      txt += `\n⚠️ פריטים באיחור (${stats.overdueLoans.length}):\n`
      stats.overdueLoans.forEach(l => {
        const item = items.find(i => i.id === l.item_id)
        txt += `  • ${l.borrower} — ${item?.name || 'פריט'}: ${l.outstanding} יח׳ (${l.days} ימים)\n`
      })
    }
    txt += `\n👥 משאילים פעילים (${Object.keys(stats.currentlyBorrowing).length}):\n`
    Object.entries(stats.currentlyBorrowing).forEach(([borrower, loans]) => {
      txt += `  ${borrower}:\n`
      loans.forEach(l => {
        const item = items.find(i => i.id === l.item_id)
        txt += `    • ${item?.name || 'פריט'}: ${l.quantity} יח׳ (${l.days} ימים${l.overdue ? ' ⚠️' : ''})\n`
      })
    })
    txt += `\n📦 ניצולת פריטים:\n`
    stats.itemUtil.forEach(i => {
      txt += `  ${i.name}: ${i.loaned}/${i.total_qty} (${i.pct}%)\n`
    })
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank')
    showMessage('הדוח נשלח ✅')
  }

  // This version takes the item object (matching the JSX call site) and builds a clean string.
  function exportItemStats(item) {
    const stats = calculateItemStats(loanHistory)
    if (!stats) { showMessage('אין נתונים לייצוא ❌'); return }
    const date = new Date().toLocaleDateString('he-IL')
    let txt = `📦 סטטיסטיקת פריט: ${item.name}\n${date}\n`
    txt += `${'─'.repeat(28)}\n`
    txt += `סה"כ השאלות: ${stats.totalLoans}\n`
    txt += `הושאל: ${stats.totalBorrowed} | הוחזר: ${stats.totalReturned} | פתוח: ${stats.totalOutstanding}\n`
    txt += `אחוז החזרה: ${stats.returnRate}%\n`
    txt += `ממוצע ימי השאלה: ${stats.avgDaysOut}\n`
    if (stats.overdueCount > 0) txt += `⚠️ השאלות באיחור: ${stats.overdueCount}\n`
    txt += `\n👤 לפי משאיל:\n`
    stats.borrowers.forEach(b => {
      txt += `  ${b.name}: ${b.borrowed} יח׳ הושאלו, ${b.returned} הוחזרו, ${b.outstanding} פתוח\n`
    })
    txt += `\n📜 יומן השאלות:\n`
    stats.loanLog.forEach(l => {
      const d = new Date(l.date_taken).toLocaleDateString('he-IL')
      const status = l.outstanding === 0 ? 'הוחזר' : l.overdue ? '⚠️ איחור' : 'פתוח'
      txt += `  ${d} — ${l.borrower}: ${l.quantity} יח׳ [${status}]\n`
    })
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank')
    showMessage('הדוח נשלח ✅')
  }

  // never called from anywhere in the JSX.

  function handleShare() {
    if (!selectedShareBorrower) { showMessage('אנא בחר משאיל'); return }
    if (!sharePhoneNumber.trim()) { showMessage('אנא הכנס מספר טלפון'); return }
    const borrowerLoans = allLoans.filter(l => l.borrower === selectedShareBorrower && (l.quantity - (l.returned_qty || 0)) > 0)
    if (borrowerLoans.length === 0) { showMessage('אין פריטים בהשאלה לאדם זה'); return }
    const itemsList = borrowerLoans.map(loan => {
      const item = items.find(i => i.id === loan.item_id)
      return `• ${item?.name || 'פריט'}: ${loan.quantity - (loan.returned_qty || 0)} יח׳`
    }).join('\n')
    const messageText = `שלום ${selectedShareBorrower} זוהי הודעה אוטומטית\n\nלהלן רשימת הפריטים שלקחת מהגמ"ח:\n\n${itemsList}\n\nלתשומת לבכם!\n* אין לקיים פעילויות יצירה ישירות על המפות, אלא לפרוס ניילון.\n* הדלקת נרות רק על מרכז שולחן ולא ישירות על המפה. טפטופי חלב הורסים את המפות.\n* מפות יש לכבס ולייבש היטב היטב! מפות לחות מעלות עובש ומתקלקלות.\n\nשמחנו להיות חלק מהשמחה שלכם`
    const clean = sharePhoneNumber.replace(/[^0-9+]/g, '')
    const formatted = clean.startsWith('+') ? clean : `+972${clean.replace(/^0/, '')}`
    window.open(`https://wa.me/${formatted.replace('+', '')}?text=${encodeURIComponent(messageText)}`, '_blank')
    closeAllModals()
    showMessage('הודעה נשלחה ל-WhatsApp')
  }

  return (
    <main>
      {/* ── HEADER ── */}
      <header className="app-header">
        <h1 className="app-title">גמ"ח <span>עיר דוד</span></h1>
        <div className="header-actions">
          <button className="hdr-btn" onClick={fetchAllLoans} disabled={loadingHistory} title="סטטיסטיקה">
            <span className="icon">📊</span><span>סטטיסטיקה</span>
          </button>
          <button className="hdr-btn" onClick={() => { setShowShareModal(true); fetchAllLoans() }} title="WhatsApp">
            <span className="icon">💬</span><span>שלח</span>
          </button>
          <button className="hdr-btn" onClick={() => setShowMassMode(true)} title="מצב המוני">
            <span className="icon">⚡</span><span>המוני</span>
          </button>
          <button className="hdr-btn primary" onClick={() => setShowAddModal(true)} disabled={loadingAction || loadingItems}>
            <span className="icon">＋</span><span>פריט חדש</span>
          </button>
        </div>
      </header>

      {/* ── MESSAGE ── */}
      {message && <div className="message" onClick={() => setMessage('')} style={{ cursor: 'pointer' }}>{message}</div>}

      {/* ── GLOBAL LOADING OVERLAY ── */}
      {(loadingItems || loadingAction || loadingHistory) && (
        <div className="global-loading-overlay">
          <div className="loader-dots">
            <span /><span /><span /><span /><span />
          </div>
          <div className="loader-label">
            {loadingAction ? 'מבצע פעולה' : loadingHistory ? 'טוען נתונים' : 'טוען פריטים'}
          </div>
        </div>
      )}

      {/* ── ITEMS GRID ── */}
      {!loadingItems && (
        <>
          <div className="search-bar">
            <input
              type="text"
              placeholder="חיפוש פריטים..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="grid">
            {items
              .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(item => (
                <div key={item.id} className="card">
                  <img src={item.image_url} alt={item.name} />

                  <div className="card-header">
                    <button className="card-icon-btn" title="עריכה"
                      onClick={() => { setEditItem({ name: item.name, total_qty: item.total_qty, image: null }); setShowEditModal(item.id) }}>
                      ✏️
                    </button>
                    <button className="card-icon-btn" title="היסטוריה" disabled={loadingHistory}
                      onClick={() => fetchLoanHistory(item.id)}>
                      ℹ️
                    </button>
                  </div>

                  <h3>{item.name}</h3>
                  <p className="card-qty">
                    <span className="qty-available">{item.available_qty}</span>
                    <span className="qty-separator">/</span>
                    {item.total_qty} זמין
                  </p>

                  <div className="card-actions">
                    <button
                      className="btn btn-blue"
                      disabled={item.available_qty <= 0 || loadingAction}
                      onClick={() => openLoanModal(item.id)}
                    >
                      📤 השאלה
                    </button>
                    {item.available_qty < item.total_qty && (
                      <button
                        className="btn btn-green"
                        disabled={loadingAction}
                        onClick={() => openReturnModal(item.id)}
                      >
                        📥 החזרה
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════ */}

      {/* ── ADD ITEM ── */}
      {showAddModal && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <form className="modal-form" onMouseDown={e => e.stopPropagation()} onSubmit={handleAddItem}>
            <h2>➕ הוספת פריט חדש</h2>
            <input placeholder="שם פריט" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required />
            <input type="number" placeholder='סה"כ כמות' value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: e.target.value })} required />
            <input type="file" accept="image/*" onChange={e => setNewItem({ ...newItem, image: e.target.files[0] })} required />
            <div className="modal-buttons">
              <button type="submit" className="btn btn-solid" disabled={loadingAction}>{loadingAction ? 'טוען...' : 'הוסף פריט'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>ביטול</button>
            </div>
          </form>
        </div>
      )}

      {/* ── LOAN MODAL (per item) ── */}
      {items.map(item => showLoanModal === item.id && (
        <div key={`loan-${item.id}`} className="modal" onMouseDown={() => closeAllModals()}>
          <form className="modal-form" onMouseDown={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); handleLoan(item.id) }}>
            <h2>📤 השאלת פריט</h2>
            <p>{item.name} — זמין: {item.available_qty}</p>
            <input
              placeholder="מי לוקח"
              value={formInfo[item.id]?.borrower || ''}
              onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], borrower: e.target.value } })}
              required
            />
            <input
              type="number"
              placeholder="כמות"
              min="1"
              max={item.available_qty}
              value={formInfo[item.id]?.qty || ''}
              onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], qty: e.target.value } })}
              required
            />
            <select
              value={formInfo[item.id]?.admin || ''}
              onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], admin: e.target.value } })}
              required
            >
              <option value="">בחר מאשר</option>
              {admins.map((admin, i) => <option key={i} value={admin}>{admin}</option>)}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="סכום (השאר ריק לחינם)"
              value={formInfo[item.id]?.payment || ''}
              onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], payment: e.target.value } })}
            />
            <div className="modal-buttons">
              <button type="submit" className="btn btn-solid" disabled={loadingAction}>{loadingAction ? 'טוען...' : '📤 השאל'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowLoanModal(null)}>ביטול</button>
            </div>
          </form>
        </div>
      ))}

      {/* ── RETURN MODAL (per item) ── */}
      {items.map(item => showReturnModal === item.id && (
        <div key={`return-${item.id}`} className="modal" onMouseDown={() => closeAllModals()}>
          <form className="modal-form" onMouseDown={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); handleReturn(item.id) }}>
            <h2>📥 החזרת פריט</h2>
            <p>{item.name}</p>

            {openBorrowers.length > 0 && (
              <div className="borrowers-checklist">
                <p className="checklist-label">בחר משאיל לבחירה מהירה:</p>
                {openBorrowers.map((b, i) => (
                  <button key={i} type="button" className="borrower-btn" onClick={() => selectOpenBorrower(b.name, b.qty)}>
                    {b.name} — {b.qty} יח׳ בהשאלה
                  </button>
                ))}
              </div>
            )}

            <input
              placeholder="שם המחזיר"
              value={formInfo[item.id]?.returner || ''}
              onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], returner: e.target.value } })}
              required
            />
            <input
              type="number"
              placeholder="כמות להחזרה"
              min="1"
              value={formInfo[item.id]?.returnQty || ''}
              onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], returnQty: e.target.value } })}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="סכום ששולם (השאר ריק לחינם)"
              value={formInfo[item.id]?.paidAmount || ''}
              onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], paidAmount: e.target.value } })}
            />
            {(() => {
              const paid = parseFloat(formInfo[item.id]?.paidAmount || 0)
              const required = loanHistory.find(l => l.item_id === item.id && l.borrower === formInfo[item.id]?.returner)?.payment || 0
              if (required && required !== -1 && paid < required) {
                return <div className="warning-message">⚠️ חובה: {required} ש"ח | שולם: {paid} ש"ח</div>
              }
            })()}

            <div className="modal-buttons">
              <button type="submit" className="btn btn-success" disabled={loadingAction}>{loadingAction ? 'טוען...' : '📥 החזר'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowReturnModal(null)}>ביטול</button>
            </div>
          </form>
        </div>
      ))}

      {/* ── EDIT MODAL (per item) ── */}
      {items.map(item => showEditModal === item.id && (
        <div key={`edit-${item.id}`} className="modal" onMouseDown={() => closeAllModals()}>
          <form className="modal-form" onMouseDown={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); handleEditItem(item.id) }}>
            <h2>✏️ עריכת פריט</h2>
            <input placeholder="שם פריט" value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} required />
            <input type="number" placeholder='סה"כ כמות' value={editItem.total_qty} onChange={e => setEditItem({ ...editItem, total_qty: e.target.value })} required />
            <input type="file" accept="image/*" onChange={e => setEditItem({ ...editItem, image: e.target.files[0] })} />
            <div className="modal-buttons">
              <button type="submit" className="btn btn-solid" disabled={loadingAction}>{loadingAction ? 'טוען...' : 'עדכן'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(null)}>ביטול</button>
            </div>
          </form>
        </div>
      ))}

      {/* ── INFO MODAL (per item) ── */}
      {items.map(item => showInfoModal === item.id && (() => {
        const stats = calculateItemStats(loanHistory)
        const utilPct = item.total_qty > 0 ? Math.round((item.total_qty - item.available_qty) / item.total_qty * 100) : 0
        return (
          <div key={`info-${item.id}`} className="modal" onMouseDown={() => closeAllModals()}>
            <div className="modal-form" style={{ maxHeight: '88vh', overflowY: 'auto', maxWidth: '540px' }} onMouseDown={e => e.stopPropagation()}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>📋 {item.name}</h2>
                <button className="export-btn" style={{ width: 'auto', padding: '0.4rem 0.75rem', marginBottom: 0 }} onClick={() => exportItemStats(item)}>
                  📤 ייצא
                </button>
              </div>

              {!stats ? <p>אין היסטוריה להשאלה</p> : (
                <>
                  <div className="stats-tabs">
                    {[['overview', 'סיכום'], ['borrowers', 'משאילים'], ['log', 'יומן']].map(([id, label]) => (
                      <button key={id} className={`stats-tab${itemStatsTab === id ? ' active' : ''}`} onClick={() => setItemStatsTab(id)}>{label}</button>
                    ))}
                  </div>

                  {itemStatsTab === 'overview' && (
                    <>
                      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                        <div className="stat-box"><h4>השאלות</h4><p>{stats.totalLoans}</p></div>
                        <div className="stat-box"><h4>כרגע בחוץ</h4><p style={{ color: stats.totalOutstanding > 0 ? 'var(--red)' : 'var(--green)' }}>{stats.totalOutstanding}</p></div>
                        <div className="stat-box"><h4>אחוז החזרה</h4><p style={{ color: stats.returnRate >= 80 ? 'var(--green)' : 'var(--amber)' }}>{stats.returnRate}%</p></div>
                        <div className="stat-box"><h4>ממוצע ימים</h4><p>{stats.avgDaysOut}</p></div>
                      </div>

                      <div className="stats-section">
                        <p className="stats-section-title">ניצולת מלאי</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{item.total_qty - item.available_qty} / {item.total_qty} יחידות בשימוש</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: utilPct > 80 ? 'var(--red)' : utilPct > 50 ? 'var(--amber)' : 'var(--green)' }}>{utilPct}%</span>
                        </div>
                        <div className="progress-wrap">
                          <div className="progress-fill" style={{ width: `${utilPct}%`, background: utilPct > 80 ? 'var(--red)' : utilPct > 50 ? 'var(--amber)' : 'var(--green)' }} />
                        </div>
                      </div>

                      <div className="stats-section">
                        <p className="stats-section-title">שיעור החזרה</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{stats.totalReturned} הוחזרו מתוך {stats.totalBorrowed}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-2)' }}>{stats.returnRate}%</span>
                        </div>
                        <div className="progress-wrap">
                          <div className="progress-fill green" style={{ width: `${stats.returnRate}%` }} />
                        </div>
                      </div>

                      {stats.overdueCount > 0 && (
                        <div style={{ padding: '0.65rem 0.9rem', background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                          <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: '0.85rem' }}>⚠️ {stats.overdueCount} השאלות חריגות (מעל 14 יום)</span>
                        </div>
                      )}
                    </>
                  )}

                  {itemStatsTab === 'borrowers' && (
                    <div className="stats-section">
                      <table className="stats-table">
                        <thead>
                          <tr>
                            <th>שם</th>
                            <th style={{ textAlign: 'center' }}>לקח</th>
                            <th style={{ textAlign: 'center' }}>החזיר</th>
                            <th style={{ textAlign: 'center' }}>פתוח</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.borrowers.map((b, i) => (
                            <tr key={i}>
                              <td className="td-name">{b.name}</td>
                              <td className="td-num">{b.borrowed}</td>
                              <td className="td-num">{b.returned}</td>
                              <td className="td-badge">
                                {b.outstanding > 0
                                  ? <span className="badge badge-red">{b.outstanding}</span>
                                  : <span className="badge badge-green">✓</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {itemStatsTab === 'log' && (
                    <div className="stats-section">
                      {stats.loanLog.map((loan, i) => (
                        <div key={i} className="history-item">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <strong>{loan.borrower}</strong>
                            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                              {loan.overdue && <span className="badge badge-red">⚠️ חריג</span>}
                              {loan.outstanding === 0 && <span className="badge badge-green">הוחזר</span>}
                              {loan.outstanding > 0 && !loan.overdue && <span className="badge badge-blue">{loan.outstanding} בחוץ</span>}
                            </div>
                          </div>
                          <p>{new Date(loan.date_taken).toLocaleDateString('he-IL')} · {loan.quantity} יח׳ · {loan.days} ימים{loan.admin ? ` · ${loan.admin}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="modal-buttons">
                <button type="button" className="btn btn-ghost" style={{ flex: 'none', width: '100%' }} onClick={() => setShowInfoModal(null)}>סגור</button>
              </div>
            </div>
          </div>
        )
      })())}

      {/* ── GLOBAL STATS ── */}
      {showGlobalHistory && (() => {
        const stats = calculateGlobalStats()
        return (
          <div className="modal" onMouseDown={() => closeAllModals()}>
            <div className="modal-form" style={{ maxHeight: '92vh', overflowY: 'auto', maxWidth: '600px' }} onMouseDown={e => e.stopPropagation()}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.5rem' }}>
                <h2 style={{ margin: 0 }}>📊 סטטיסטיקה</h2>
                <button className="export-btn" style={{ width: 'auto', padding: '0.4rem 0.75rem', marginBottom: 0 }} onClick={exportGlobalStats}>
                  📤 ייצא
                </button>
              </div>

              {!stats ? <p>אין נתונים להצגה</p> : (
                <>
                  <div className="stats-tabs">
                    {[['overview', 'סיכום'], ['borrowers', 'משאילים'], ['items', 'פריטים'], ['overdue', 'חריגות']].map(([id, label]) => (
                      <button key={id} className={`stats-tab${globalStatsTab === id ? ' active' : ''}`} onClick={() => setGlobalStatsTab(id)}>
                        {id === 'overdue' && stats.overdueLoans.length > 0 ? `⚠️ ${label}` : label}
                      </button>
                    ))}
                  </div>

                  {globalStatsTab === 'overview' && (
                    <>
                      <div className="stats-grid">
                        <div className="stat-box"><h4>סה"כ השאלות</h4><p>{stats.totalLoans}</p></div>
                        <div className="stat-box"><h4>כרגע בחוץ</h4><p style={{ color: stats.totalOutstanding > 0 ? 'var(--red)' : 'var(--green)' }}>{stats.totalOutstanding}</p></div>
                        <div className="stat-box"><h4>אחוז החזרה</h4><p style={{ color: stats.returnRate >= 80 ? 'var(--green)' : 'var(--amber)' }}>{stats.returnRate}%</p></div>
                        <div className="stat-box"><h4>ניצולת מלאי</h4><p style={{ color: stats.utilizationPct > 80 ? 'var(--red)' : 'var(--blue)' }}>{stats.utilizationPct}%</p></div>
                      </div>

                      <div className="stats-section">
                        <p className="stats-section-title">מי לקח כרגע</p>
                        {Object.entries(stats.currentlyBorrowing).length === 0 ? (
                          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>אין פריטים בהשאלה כרגע</p>
                        ) : (
                          Object.entries(stats.currentlyBorrowing).map(([borrower, loans], i) => (
                            <div key={i} className="history-item">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>{borrower}</strong>
                                {loans.some(l => l.overdue) && <span className="badge badge-red">⚠️ חריג</span>}
                              </div>
                              {loans.map((loan, j) => {
                                const it = items.find(x => x.id === loan.item_id)
                                return (
                                  <p key={j} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>• {it?.name || 'פריט'}: {loan.quantity} יח׳</span>
                                    <span style={{ color: loan.overdue ? 'var(--red)' : 'var(--text-3)' }}>{loan.days} ימים</span>
                                  </p>
                                )
                              })}
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {globalStatsTab === 'borrowers' && (
                    <div className="stats-section">
                      <table className="stats-table">
                        <thead>
                          <tr>
                            <th>שם</th>
                            <th style={{ textAlign: 'center' }}>השאלות</th>
                            <th style={{ textAlign: 'center' }}>לקח</th>
                            <th style={{ textAlign: 'center' }}>פתוח</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.borrowers.map((b, i) => (
                            <tr key={i}>
                              <td className="td-name">{b.name}</td>
                              <td className="td-num">{b.loanCount}</td>
                              <td className="td-num">{b.totalBorrowed}</td>
                              <td className="td-badge">
                                {b.outstanding > 0
                                  ? <span className="badge badge-red">{b.outstanding}</span>
                                  : <span className="badge badge-green">✓</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {globalStatsTab === 'items' && (
                    <div className="stats-section">
                      <p className="stats-section-title">ניצולת לפי פריט</p>
                      {stats.itemUtil.map((item, i) => (
                        <div key={i} className="util-row">
                          <span className="util-name">{item.name}</span>
                          <div className="util-bar-wrap">
                            <div className="progress-wrap" style={{ flex: 1 }}>
                              <div className="progress-fill" style={{
                                width: `${item.pct}%`,
                                background: item.pct > 80 ? 'var(--red)' : item.pct > 50 ? 'var(--amber)' : 'var(--green)'
                              }} />
                            </div>
                            <span className="util-pct">{item.pct}%</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', flexShrink: 0 }}>{item.loaned}/{item.total_qty}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {globalStatsTab === 'overdue' && (
                    <div className="stats-section">
                      {stats.overdueLoans.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--green)' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
                          <p style={{ margin: 0, fontWeight: 700 }}>אין השאלות חריגות!</p>
                        </div>
                      ) : (
                        <>
                          <p className="stats-section-title">{stats.overdueLoans.length} השאלות מעל 14 יום</p>
                          {stats.overdueLoans.map((loan, i) => {
                            const it = items.find(x => x.id === loan.item_id)
                            return (
                              <div key={i} className="history-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong>{loan.borrower}</strong>
                                  <span className="badge badge-red">{loan.days} ימים</span>
                                </div>
                                <p>{it?.name || 'פריט'} · {loan.outstanding} יח׳ · {new Date(loan.date_taken).toLocaleDateString('he-IL')}</p>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="modal-buttons">
                <button type="button" className="btn btn-ghost" style={{ flex: 'none', width: '100%' }} onClick={() => setShowGlobalHistory(false)}>סגור</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── MASS MODE PICKER ── */}
      {showMassMode && !massMode && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <div className="modal-form" onMouseDown={e => e.stopPropagation()}>
            <h2>⚡ מצב המוני</h2>
            <p>בחר פעולה לביצוע על מספר פריטים בו-זמנית</p>
            <div className="mode-picker">
              <button type="button" className="mode-btn" onClick={() => { setMassMode('take'); const l = getLastBorrowerInfo(); setMassBorrower(l.borrower); setMassAdmin(l.admin) }}>
                <span className="mode-icon">📤</span>
                <div><div>השאלה</div><div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontWeight: 400 }}>קח מספר פריטים בבת אחת</div></div>
              </button>
              <button type="button" className="mode-btn" onClick={openMassReturnMode}>
                <span className="mode-icon">📥</span>
                <div><div>החזרה</div><div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontWeight: 400 }}>החזר מספר פריטים בבת אחת</div></div>
              </button>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => closeAllModals()} style={{ width: '100%' }}>ביטול</button>
          </div>
        </div>
      )}

      {/* ── MASS TAKE ── */}
      {showMassMode && massMode === 'take' && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <div className="modal-form" style={{ maxHeight: '90vh', overflowY: 'auto', maxWidth: '560px' }} onMouseDown={e => e.stopPropagation()}>
            <h2>📤 השאלה המונית</h2>

            <input placeholder="מי לוקח" value={massBorrower} onChange={e => setMassBorrower(e.target.value)} required />
            <select value={massAdmin} onChange={e => setMassAdmin(e.target.value)} required>
              <option value="">בחר מאשר</option>
              {admins.map((a, i) => <option key={i} value={a}>{a}</option>)}
            </select>
            <input type="number" step="0.01" placeholder="סכום תשלום (השאר ריק לחינם)" value={massPayment.amount || ''} onChange={e => setMassPayment({ ...massPayment, amount: e.target.value })} />

            <p className="section-label" style={{ marginTop: '1rem' }}>בחר פריטים וכמויות</p>
            <input type="text" placeholder="חיפוש..." value={massSearchQuery} onChange={e => setMassSearchQuery(e.target.value)} className="search-input" style={{ width: '100%', maxWidth: '100%', marginBottom: '0.75rem' }} />

            {items
              .filter(item => item.available_qty > 0 && item.name.toLowerCase().includes(massSearchQuery.toLowerCase()))
              .map(item => (
                <div key={item.id} className="mass-item">
                  <img src={item.image_url} alt={item.name} />
                  <div className="mass-item-info">
                    <p>{item.name}</p>
                    <p className="available">זמין: {item.available_qty}</p>
                  </div>
                  <input
                    type="number" min="0" max={item.available_qty} placeholder="0"
                    value={massSelection[item.id] || ''}
                    onChange={e => { const v = e.target.value ? parseInt(e.target.value) : 0; if (v >= 0) setMassSelection(prev => ({ ...prev, [item.id]: v })) }}
                  />
                </div>
              ))}

            <div className="modal-buttons" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-solid" onClick={processMassLoans} disabled={loadingAction || !massBorrower || !massAdmin}>
                {loadingAction ? 'טוען...' : '✅ בצע השאלה'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setMassMode(null); setMassSelection({}) }}>חזור</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MASS RETURN ── */}
      {showMassMode && massMode === 'return' && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <div className="modal-form" style={{ maxHeight: '90vh', overflowY: 'auto', maxWidth: '560px' }} onMouseDown={e => e.stopPropagation()}>
            <h2>📥 החזרה המונית</h2>

            <select value={massReturnBorrower} onChange={e => setMassReturnBorrower(e.target.value)} required>
              <option value="">בחר משאיל</option>
              {allLoans
                .filter(l => (l.quantity - (l.returned_qty || 0)) > 0)
                .map(l => l.borrower)
                .filter((v, i, a) => a.indexOf(v) === i).sort()
                .map((b, i) => <option key={i} value={b}>{b}</option>)}
            </select>
            <input type="number" step="0.01" placeholder="סכום ששולם (השאר ריק לחינם)" value={massPayment.paid || ''} onChange={e => setMassPayment({ ...massPayment, paid: e.target.value })} />

            {massReturnBorrower && (
              <>
                <p className="section-label" style={{ marginTop: '1rem' }}>בחר פריטים וכמויות</p>
                {items.map(item => {
                  const borrowed = allLoans
                    .filter(l => l.item_id === item.id && l.borrower === massReturnBorrower && (l.quantity - (l.returned_qty || 0)) > 0)
                    .reduce((s, l) => s + (l.quantity - (l.returned_qty || 0)), 0)
                  if (borrowed <= 0) return null
                  return (
                    <div key={item.id} className="mass-item">
                      <img src={item.image_url} alt={item.name} />
                      <div className="mass-item-info">
                        <p>{item.name}</p>
                        <p className="available">בהשאלה: {borrowed}</p>
                      </div>
                      <input
                        type="number" min="0" max={borrowed} placeholder="0"
                        value={massReturnQty[item.id] || ''}
                        onChange={e => { const v = e.target.value ? parseInt(e.target.value) : 0; if (v >= 0) setMassReturnQty(prev => ({ ...prev, [item.id]: v })) }}
                      />
                    </div>
                  )
                })}
              </>
            )}

            <div className="modal-buttons" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-success" onClick={processMassReturns} disabled={loadingAction || !massReturnBorrower}>
                {loadingAction ? 'טוען...' : '✅ בצע החזרה'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setMassMode(null); setMassReturnQty({}) }}>חזור</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE - PICK BORROWER ── */}
      {showShareModal && !selectedShareBorrower && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <div className="modal-form" style={{ maxHeight: '85vh', overflowY: 'auto', maxWidth: '440px' }} onMouseDown={e => e.stopPropagation()}>
            <h2>💬 שלח דרך WhatsApp</h2>
            <p>בחר משאיל לשליחת רשימת הפריטים בהשאלה</p>
            {(() => {
              const unique = allLoans
                .filter(l => (l.quantity - (l.returned_qty || 0)) > 0)
                .map(l => l.borrower)
                .filter((v, i, a) => a.indexOf(v) === i).sort()
              return unique.length === 0 ? <p>אין משאילים כרגע</p> : (
                <div className="share-list">
                  {unique.map((borrower, i) => (
                    <button key={i} type="button" className="share-borrower-btn" onClick={() => setSelectedShareBorrower(borrower)}>{borrower}</button>
                  ))}
                </div>
              )
            })()}
            <div className="modal-buttons">
              <button type="button" className="btn btn-ghost" style={{ flex: 'none', width: '100%' }} onClick={() => closeAllModals()}>סגור</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE - ENTER PHONE ── */}
      {showShareModal && selectedShareBorrower && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <div className="modal-form" onMouseDown={e => e.stopPropagation()}>
            <h2>📱 שלח ל-{selectedShareBorrower}</h2>
            <p>הכנס מספר טלפון לשליחה ב-WhatsApp</p>
            <input
              type="tel"
              placeholder="0501234567"
              value={sharePhoneNumber}
              onChange={e => setSharePhoneNumber(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleShare()}
              autoFocus
            />
            <div className="modal-buttons">
              <button type="button" className="btn btn-solid" style={{ background: '#25d366', borderColor: '#25d366' }} onClick={handleShare}>
                ✓ שלח ב-WhatsApp
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setSelectedShareBorrower('')}>חזור</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <nav className="mobile-tab-bar">
        <button className="tab-btn" onClick={fetchAllLoans} disabled={loadingHistory}>
          <span className="tab-icon">📊</span>
          <span className="tab-label">סטטיסטיקה</span>
        </button>
        <button className="tab-btn" onClick={() => { setShowShareModal(true); fetchAllLoans() }}>
          <span className="tab-icon">💬</span>
          <span className="tab-label">שלח</span>
        </button>
        <button className="tab-btn tab-add" onClick={() => setShowAddModal(true)} disabled={loadingAction || loadingItems}>
          <span className="tab-icon-wrap">＋</span>
          <span className="tab-label">הוסף</span>
        </button>
        <button className="tab-btn" onClick={() => setShowMassMode(true)}>
          <span className="tab-icon">⚡</span>
          <span className="tab-label">המוני</span>
        </button>
      </nav>

    </main>
  )
}