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

  // ── TEST MODE ──
  const [testMode, setTestMode] = useState(false)
  // Shadow copies of real data used only in test mode
  const testItemsRef = React.useRef(null)
  const testLoansRef = React.useRef([])   // flat list of all loans
  let testLoanIdCounter = React.useRef(1000)

  function initTestShadow(realItems) {
    testItemsRef.current = realItems.map(i => ({ ...i }))
    testLoansRef.current = []
    testLoanIdCounter.current = 1000
  }

  const DEMO_ITEMS = [
    { id: 'demo-1', name: 'מפה לבנה גדולה', total_qty: 8, available_qty: 8, image_url: '' },
    { id: 'demo-2', name: 'כיסא מתקפל',      total_qty: 20, available_qty: 20, image_url: '' },
    { id: 'demo-3', name: 'שולחן עגול',       total_qty: 5,  available_qty: 5,  image_url: '' },
  ]

  function enterTestMode() {
    const base = items.length > 0 ? items : DEMO_ITEMS
    initTestShadow(base)
    if (items.length === 0) setItems(DEMO_ITEMS.map(i => ({ ...i })))
    setTestMode(true)
  }

  function clearTestData() {
    initTestShadow(items)
    // Re-render by forcing a local items refresh from the shadow
    setItems(testItemsRef.current.map(i => ({ ...i })))
    setAllLoans([])
    setLoanHistory([])
    showMessage('נתוני הבדיקה אופסו 🧹')
  }

  function exitTestMode() {
    setTestMode(false)
    testItemsRef.current = null
    testLoansRef.current = []
    // Reload real data
    fetch('/api/items').then(r => r.json()).then(d => setItems(d)).catch(() => {})
    setAllLoans([])
    setLoanHistory([])
  }

  // Fake fetch that simulates API responses using in-memory test data
  function testFetch(url, options = {}) {
    const method = options.method || 'GET'
    const shadow = testItemsRef.current
    const loans = testLoansRef.current

    return new Promise((resolve) => {
      setTimeout(() => {
        // GET /api/items
        if (url === '/api/items' && method === 'GET') {
          resolve({ ok: true, json: () => Promise.resolve(shadow.map(i => ({ ...i }))), text: () => Promise.resolve(JSON.stringify(shadow)) })
          return
        }
        // POST /api/items (add item)
        if (url === '/api/items' && method === 'POST') {
          const fd = options.body
          const name = fd.get('name')
          const qty = Number(fd.get('qty'))
          const newId = `test-${Date.now()}`
          shadow.push({ id: newId, name, total_qty: qty, available_qty: qty, image_url: '' })
          resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
          return
        }
        // PUT /api/items (edit item)
        if (url === '/api/items' && method === 'PUT') {
          const fd = options.body
          const id = fd.get('id')
          const name = fd.get('name')
          const total_qty = Number(fd.get('total_qty'))
          const item = shadow.find(i => i.id === id)
          if (item) {
            const loaned = item.total_qty - item.available_qty
            item.name = name
            item.total_qty = total_qty
            item.available_qty = total_qty - loaned
          }
          resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
          return
        }
        // POST /api/loans (loan)
        if (url === '/api/loans' && method === 'POST') {
          const body = JSON.parse(options.body)
          const item = shadow.find(i => i.id === body.item_id)
          if (item && item.available_qty >= body.quantity) {
            item.available_qty -= body.quantity
            const loan = { id: String(testLoanIdCounter.current++), item_id: body.item_id, borrower: body.borrower, quantity: body.quantity, returned_qty: 0, admin: body.admin, payment: body.price, date_taken: new Date().toISOString() }
            loans.push(loan)
            resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
          } else {
            resolve({ ok: false, json: () => Promise.resolve({ error: 'אין מספיק יחידות זמינות' }) })
          }
          return
        }
        // POST /api/return
        if (url === '/api/return' && method === 'POST') {
          const body = JSON.parse(options.body)
          const item = shadow.find(i => i.id === body.item_id)
          let remaining = body.quantity
          for (const loan of loans) {
            if (loan.item_id === body.item_id && loan.borrower === body.returner) {
              const out = loan.quantity - (loan.returned_qty || 0)
              if (out > 0 && remaining > 0) {
                const ret = Math.min(out, remaining)
                loan.returned_qty = (loan.returned_qty || 0) + ret
                remaining -= ret
              }
            }
          }
          if (item) item.available_qty += (body.quantity - remaining)
          resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
          return
        }
        // GET /api/loans/:id
        if (url.startsWith('/api/loans/') && !url.endsWith('/all') && method === 'GET') {
          const itemId = url.replace('/api/loans/', '')
          const filtered = loans.filter(l => l.item_id === itemId)
          resolve({ ok: true, json: () => Promise.resolve(filtered) })
          return
        }
        // GET /api/loans/all
        if (url === '/api/loans/all' && method === 'GET') {
          resolve({ ok: true, json: () => Promise.resolve([...loans]) })
          return
        }
        resolve({ ok: false, json: () => Promise.resolve({ error: 'לא נתמך במצב בדיקה' }) })
      }, 60)
    })
  }

  // Unified fetch: use testFetch in test mode, real fetch otherwise
  const apiFetch = React.useCallback((url, options) => {
    return testMode ? testFetch(url, options) : fetch(url, options)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testMode])

  // ── TUTORIAL ──
  const TUTORIAL_STEPS = [
    { id: 'welcome',   target: null,              title: 'ברוכים הבאים לגמ״ח עיר דוד', body: 'הדרכה קצרה תעזור לכם להכיר את המערכת. כל הפעולות בהדרכה מתבצעות במצב בדיקה — שום פעולה לא תישמר.', icon: '👋' },
    { id: 'add-item',  target: 'tutorial-add',    title: 'הוספת פריט חדש',   body: 'לחצו על "הוספה" להוספת פריט למלאי. ניתן לקבוע שם, כמות ותמונה.',                                            icon: '➕' },
    { id: 'loan',      target: 'tutorial-loan',   title: 'השאלת פריט',       body: 'לחצו על "📤 השאלה" בכרטיסיית הפריט, מלאו את שם הלווה, הכמות והמאשר/ת.',                                   icon: '📤' },
    { id: 'return',    target: 'tutorial-return', title: 'החזרת פריט',       body: 'לחצו על "📥 החזרה" לרישום החזרה. המערכת מציגה אוטומטית את רשימת הלווים הפעילים לפריט זה.',              icon: '📥' },
    { id: 'list-mode', target: 'tutorial-list',   title: 'מצב רשימה',        body: 'השאילו או החזירו מספר פריטים בפעולה אחת. אידיאלי לאירועים עם ציוד רב.',                                    icon: '✅' },
    { id: 'send',      target: 'tutorial-send',   title: 'שליחה בוואטסאפ',   body: 'בחרו לווה מהרשימה ותיפתח הודעה מוכנה בוואטסאפ עם פירוט כל הפריטים שלו — לשליחה ישירה.',              icon: '💬' },
    { id: 'stats',     target: 'tutorial-stats',  title: 'סטטיסטיקה',        body: 'צפו בנתוני ההשאלות, עקבו אחר הלווים הפעילים, וזהו פריטים שלא הוחזרו בזמן.',                             icon: '📊' },
    { id: 'test-mode', target: 'tutorial-test',   title: 'מצב בדיקה',        body: 'מצב בדיקה מאפשר לנסות את כל הפעולות מבלי שדבר יישמר. כדי להיכנס: פתחו סטטיסטיקה ← לחצו "כניסה למצב בדיקה" בתחתית.', icon: '🧪' },
    { id: 'done',      target: null,              title: 'הכל מוכן!',         body: 'כל הכבוד! כעת תוכלו להשתמש במערכת. להפעלה מחדש של ההדרכה — לחצו על 🎓 בסרגל הניווט.',             icon: '🎓' },
  ]

  const [tutorialActive, setTutorialActive] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [tutorialVisible, setTutorialVisible] = useState(false) // controls CSS animation
  // Live spotlight rect tracked via rAF
  const [spotlightRect, setSpotlightRect] = useState(null)
  const rafRef = React.useRef(null)
  // Viewport size — updated on resize so SVG always fits screen correctly
  const [vpSize, setVpSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const update = () => {
      const vp = window.visualViewport
      setVpSize({ w: vp ? vp.width : window.innerWidth, h: vp ? vp.height : window.innerHeight })
    }
    update()
    window.addEventListener('resize', update)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', update)
    }
  }, [])

  // rAF loop: continuously tracks target element position so spotlight stays accurate
  // Picks the VISIBLE element when multiple share the same data-tutorial (e.g. desktop+mobile buttons)
  function startSpotlightTracking(targetId) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (!targetId) { setSpotlightRect(null); return }
    let missCount = 0
    const track = () => {
      const els = document.querySelectorAll('[data-tutorial="' + targetId + '"]')
      // Find the first one that is actually visible (non-zero size, not display:none)
      let found = null
      for (const el of els) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) { found = { el, r }; break }
      }
      if (found) {
        missCount = 0
        const { r } = found
        const pad = 10
        setSpotlightRect({ x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 })
        rafRef.current = requestAnimationFrame(track)
      } else {
        missCount++
        if (missCount < 8) {
          rafRef.current = requestAnimationFrame(track)
        } else {
          setSpotlightRect(null)
          rafRef.current = null
        }
      }
    }
    rafRef.current = requestAnimationFrame(track)
  }

  function stopSpotlightTracking() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    setSpotlightRect(null)
  }

  function startTutorial() {
    closeAllModals()
    if (!testMode) enterTestMode()
    setTutorialStep(0)
    setTutorialActive(true)
    // Trigger CSS entrance on next frame
    requestAnimationFrame(() => requestAnimationFrame(() => setTutorialVisible(true)))
  }

  function endTutorial() {
    setTutorialVisible(false)
    stopSpotlightTracking()
    setTimeout(() => { setTutorialActive(false); setTutorialStep(0) }, 280)
    try { localStorage.setItem('tutorialDone', '1') } catch {}
  }

  function tutorialGoTo(next) {
    setTutorialVisible(false)
    stopSpotlightTracking()
    setTimeout(() => {
      setTutorialStep(next)
      requestAnimationFrame(() => requestAnimationFrame(() => setTutorialVisible(true)))
    }, 200)
  }

  function tutorialNext() {
    const next = tutorialStep + 1
    if (next >= TUTORIAL_STEPS.length) { endTutorial(); return }
    tutorialGoTo(next)
  }

  function tutorialPrev() {
    if (tutorialStep === 0) return
    tutorialGoTo(tutorialStep - 1)
  }

  // When step changes, scroll target into view and start tracking
  useEffect(() => {
    if (!tutorialActive) return
    const step = TUTORIAL_STEPS[tutorialStep]
    if (!step.target) { stopSpotlightTracking(); return }
    // Scroll first, then start tracking after scroll settles
    const el = document.querySelector('[data-tutorial="' + step.target + '"]')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Wait for scroll to settle before tracking
    const t = setTimeout(() => startSpotlightTracking(step.target), 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialActive, tutorialStep])

  // Cleanup rAF on unmount
  useEffect(() => () => stopSpotlightTracking(), [])

  // Fake-loan first item when tutorial reaches 'return' step so button is visible; roll back on leave
  const [tutorialFakeLoaned, setTutorialFakeLoaned] = useState(false)
  useEffect(() => {
    if (!tutorialActive) return
    const step = TUTORIAL_STEPS[tutorialStep]
    if (step.id === 'return' && !tutorialFakeLoaned && testItemsRef.current && testItemsRef.current.length > 0) {
      const first = testItemsRef.current[0]
      if (first.available_qty > 0) {
        first.available_qty -= 1
        setItems(testItemsRef.current.map(i => ({ ...i })))
        setTutorialFakeLoaned(true)
      }
    } else if (step.id !== 'return' && tutorialFakeLoaned && testItemsRef.current && testItemsRef.current.length > 0) {
      const first = testItemsRef.current[0]
      first.available_qty = Math.min(first.total_qty, first.available_qty + 1)
      setItems(testItemsRef.current.map(i => ({ ...i })))
      setTutorialFakeLoaned(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialActive, tutorialStep])

  // Auto-start on first visit — wait until items have loaded so spotlight targets exist
  const tutorialPendingRef = React.useRef(false)
  useEffect(() => {
    try {
      if (!localStorage.getItem('tutorialDone')) tutorialPendingRef.current = true
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (tutorialPendingRef.current && !loadingItems) {
      tutorialPendingRef.current = false
      // Small extra delay so DOM fully paints before we start tracking
      setTimeout(() => startTutorial(), 500)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingItems])


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
        const res = await apiFetch('/api/items')
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
    if (!newItem.image) { showMessage('נא לבחור תמונה ❌'); return }
    if (!newItem.name.trim()) { showMessage('נא להזין שם לפריט ❌'); return }
    const addQty = Number(newItem.qty)
    if (!addQty || addQty <= 0) { showMessage('הכמות חייבת להיות גדולה מ-0 ❌'); return }
    setLoadingAction(true)
    try {
      const compressed = await compressImage(newItem.image)
      const formData = new FormData()
      formData.append('name', newItem.name)
      formData.append('qty', newItem.qty)
      formData.append('image', compressed, newItem.image.name)
      const res = await apiFetch('/api/items', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok && data.success) {
        showMessage('פריט נוסף ✅')
        setNewItem({ name: '', qty: '', image: null })
        setShowAddModal(false)
        setItems(await (await apiFetch('/api/items')).json())
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
    if (!newTotalQty || newTotalQty <= 0) { showMessage('הכמות חייבת להיות גדולה מ-0 ❌'); return }
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
      const res = await apiFetch('/api/items', { method: 'PUT', body: formData })
      const data = await res.json()
      if (res.ok && data.success) {
        showMessage('פריט עודכן ✅')
        setShowEditModal(null)
        setItems(await (await apiFetch('/api/items')).json())
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
    if (!info?.borrower || !info?.qty || !info?.admin) { showMessage('יש למלא את כל השדות ❌'); return }
    const qty = Number(info.qty)
    if (!qty || qty <= 0) { showMessage('הכמות חייבת להיות גדולה מ-0 ❌'); return }
    if (qty > item.available_qty) { showMessage(`לא ניתן להשאיל יותר מהזמין (${item.available_qty}) ❌`); return }
    setLoadingAction(true)
    try {
      const res = await apiFetch('/api/loans', {
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
        setItems(await (await apiFetch('/api/items')).json())
      } else showMessage(`השאלת פריט נכשלה: ${data.error || 'שגיאה'} ❌`)
    } catch (err) {
      showMessage(`שגיאה בהשאלת פריט: ${err.message} ❌`)
    } finally {
      setLoadingAction(false)
    }
  }

  async function handleReturn(item_id) {
    const info = formInfo[item_id]
    if (!info?.returner || !info?.returnQty) { showMessage('יש למלא את כל השדות ❌'); return }
    const returnQty = Number(info.returnQty)
    if (!returnQty || returnQty <= 0) { showMessage('הכמות חייבת להיות גדולה מ-0 ❌'); return }
    const outstanding = loanHistory
      .filter(l => l.item_id === item_id && l.borrower === info.returner)
      .reduce((s, l) => s + (l.quantity - (l.returned_qty || 0)), 0)
    if (outstanding > 0 && returnQty > outstanding) {
      showMessage(`לא ניתן להחזיר יותר מהמושאל (${outstanding}) ❌`); return
    }
    setLoadingAction(true)
    try {
      const res = await apiFetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id, returner: info.returner, quantity: returnQty, price: info.paidAmount !== undefined && info.paidAmount !== '' ? Number(info.paidAmount) : -1 })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showMessage(`פריט הוחזר על ידי ${info.returner} ✅`)
        setFormInfo({ ...formInfo, [item_id]: {} })
        setShowReturnModal(null)
        setItems(await (await apiFetch('/api/items')).json())
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
      const res = await apiFetch(`/api/loans/${item_id}`)
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
      const res = await apiFetch('/api/loans/all')
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
      const res = await apiFetch(`/api/loans/${item_id}`)
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
      showMessage('יש לבחור לווה, מאשר ולפחות פריט אחד ❌'); return
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
        const res = await apiFetch('/api/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id, borrower: massBorrower, quantity, admin: massAdmin, price: massPayment.amount !== undefined && massPayment.amount !== '' ? Number(massPayment.amount) : -1 }) })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(`שגיאה בפריט ${items.find(i => i.id === item_id)?.name}: ${data.error}`)
      }
      showMessage(`${selectedItems.length} פריטים הושאלו ל${massBorrower} ✅`)
      saveBorrowerInfo(massBorrower, massAdmin)
      setShowMassMode(false); setMassMode(null); setMassSelection({}); setMassBorrower(''); setMassAdmin('')
      setItems(await (await apiFetch('/api/items')).json())
    } catch (err) {
      showMessage(`שגיאה בהשאלה: ${err.message} ❌`)
    } finally {
      setLoadingAction(false)
    }
  }

  async function processMassReturns() {
    if (!massReturnBorrower || Object.values(massReturnQty).every(v => v <= 0)) {
      showMessage('יש לבחור לווה ולהגדיר כמויות ❌'); return
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
        const res = await apiFetch('/api/return', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id, returner: massReturnBorrower, quantity, price: massPayment.paid !== undefined && massPayment.paid !== '' ? Number(massPayment.paid) : -1 }) })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(`שגיאה בהחזרה ${items.find(i => i.id === item_id)?.name}: ${data.error}`)
      }
      showMessage(`${selectedItems.length} פריטים הוחזרו ✅`)
      setShowMassMode(false); setMassMode(null); setMassSelection({}); setMassReturnBorrower(''); setMassReturnQty({})
      setItems(await (await apiFetch('/api/items')).json())
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
      const res = await apiFetch('/api/loans/all')
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
    const date = new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
    const sep = '━'.repeat(24)
    let txt = `📊 *גמ"ח עיר דוד — סיכום כללי*\n📅 ${date}\n${sep}\n\n`

    txt += `📈 *נתוני פעילות*\n`
    txt += `  סה"כ השאלות: ${stats.totalLoans}\n`
    txt += `  יחידות שהושאלו: ${stats.totalBorrowed}\n`
    txt += `  יחידות שהוחזרו: ${stats.totalReturned}\n`
    txt += `  עדיין בהשאלה: ${stats.totalOutstanding}\n`
    txt += `  אחוז החזרה: ${stats.returnRate}%\n`
    txt += `  תפוסה ממוצעת: ${stats.utilizationPct}%\n`

    if (stats.overdueLoans.length > 0) {
      txt += `\n⚠️ *פריטים באיחור — ${stats.overdueLoans.length}*\n`
      stats.overdueLoans.forEach(l => {
        const item = items.find(i => i.id === l.item_id)
        txt += `  • ${l.borrower} | ${item?.name || 'פריט'} | ${l.outstanding} יח׳ | ${l.days} ימים\n`
      })
    }

    const activeBorrowers = Object.keys(stats.currentlyBorrowing)
    if (activeBorrowers.length > 0) {
      txt += `\n👥 *לווים פעילים — ${activeBorrowers.length}*\n`
      activeBorrowers.forEach(borrower => {
        txt += `\n  👤 ${borrower}\n`
        stats.currentlyBorrowing[borrower].forEach(l => {
          const item = items.find(i => i.id === l.item_id)
          const flag = l.overdue ? ' ⚠️' : ''
          txt += `     • ${item?.name || 'פריט'}: ${l.quantity} יח׳ (${l.days} ימים)${flag}\n`
        })
      })
    }

    txt += `\n📦 *ניצולת מלאי*\n`
    stats.itemUtil.forEach(i => {
      const bar = '█'.repeat(Math.round(i.pct / 10)) + '░'.repeat(10 - Math.round(i.pct / 10))
      txt += `  ${i.name}\n  ${bar} ${i.pct}% (${i.loaned}/${i.total_qty})\n`
    })

    txt += `\n${sep}\nגמ"ח עיר דוד 🏡`
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank')
    showMessage('הדוח נשלח ✅')
  }

  function exportItemStats(item) {
    const stats = calculateItemStats(loanHistory)
    if (!stats) { showMessage('אין נתונים לייצוא ❌'); return }
    const date = new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
    const sep = '━'.repeat(24)
    let txt = `📦 *${item.name}*\n📅 ${date}\n${sep}\n\n`

    txt += `📈 *סיכום*\n`
    txt += `  סה"כ השאלות: ${stats.totalLoans}\n`
    txt += `  הושאל: ${stats.totalBorrowed} יח׳  |  הוחזר: ${stats.totalReturned} יח׳  |  פתוח: ${stats.totalOutstanding} יח׳\n`
    txt += `  אחוז החזרה: ${stats.returnRate}%\n`
    txt += `  ממוצע ימי השאלה: ${stats.avgDaysOut}\n`
    if (stats.overdueCount > 0) txt += `  ⚠️ השאלות באיחור: ${stats.overdueCount}\n`

    if (stats.borrowers.length > 0) {
      txt += `\n👥 *לפי לווה*\n`
      stats.borrowers.forEach(b => {
        const outstanding = b.outstanding > 0 ? ` | פתוח: ${b.outstanding} ⚠️` : ' | הוחזר הכל ✓'
        txt += `  • ${b.name}: ${b.borrowed} הושאלו, ${b.returned} הוחזרו${outstanding}\n`
      })
    }

    if (stats.loanLog.length > 0) {
      txt += `\n📜 *יומן השאלות*\n`
      stats.loanLog.forEach(l => {
        const d = new Date(l.date_taken).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' })
        const status = l.outstanding === 0 ? '✓ הוחזר' : l.overdue ? '⚠️ איחור' : '⏳ פתוח'
        txt += `  ${d}  |  ${l.borrower}  |  ${l.quantity} יח׳  |  ${status}\n`
      })
    }

    txt += `\n${sep}\nגמ"ח עיר דוד 🏡`
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank')
    showMessage('הדוח נשלח ✅')
  }

  // never called from anywhere in the JSX.

  function handleShare(borrowerName) {
    const name = borrowerName || selectedShareBorrower
    if (!name) { showMessage('נא לבחור לווה'); return }
    const borrowerLoans = allLoans.filter(l => l.borrower === name && (l.quantity - (l.returned_qty || 0)) > 0)
    if (borrowerLoans.length === 0) { showMessage('לאדם זה אין פריטים בהשאלה כרגע'); return }
    const itemsList = borrowerLoans.map(loan => {
      const item = items.find(i => i.id === loan.item_id)
      return `• ${item?.name || 'פריט'}: ${loan.quantity - (loan.returned_qty || 0)} יח׳`
    }).join('\n')
    const messageText = `שלום ${name}, זוהי הודעה אוטומטית מגמ"ח עיר דוד.\n\nלהלן רשימת הפריטים שבהשאלתך:\n\n${itemsList}\n\nלתשומת לבך:\n• אין לבצע פעילויות יצירה ישירות על המפות — יש לפרוס ניילון.\n• הדלקת נרות רק במרכז השולחן, לא ישירות על המפה.\n• מפות יש לכבס ולייבש היטב; מפות לחות עלולות להתעפש.\n\nשמחנו להיות חלק מהשמחה שלכם 🎉`
    window.open(`https://wa.me/?text=${encodeURIComponent(messageText)}`, '_blank')
    closeAllModals()
    showMessage('נפתח וואטסאפ לשליחה ✅')
  }

  return (
    <main>
      {/* ── HEADER ── */}
      <header className="app-header">
        <h1 className="app-title">גמ"ח <span>עיר דוד</span></h1>
        <p className="app-tagline">נוצר ע"י איתמר קצובר</p>
        <div className="header-actions">
          <button className="hdr-btn" data-tutorial="tutorial-stats" onClick={fetchAllLoans} disabled={loadingHistory} title="סטטיסטיקה">
            <span className="icon">📊</span><span>סטטיסטיקה</span>
          </button>
          <button className="hdr-btn" data-tutorial="tutorial-send" onClick={() => { setShowShareModal(true); fetchAllLoans() }} title="WhatsApp">
            <span className="icon">💬</span><span>שלח</span>
          </button>
          <button className="hdr-btn" onClick={() => setShowMassMode(true)} data-tutorial="tutorial-list" title="מצב רשימה">
            <span className="icon">✅</span><span>רשימה</span>
          </button>
          <button className="hdr-btn primary" data-tutorial="tutorial-add" onClick={() => setShowAddModal(true)} disabled={loadingAction || loadingItems}>
            <span className="icon">＋</span><span>פריט חדש</span>
          </button>
          <button className="hdr-btn hdr-btn-tutorial" onClick={startTutorial} title="הדרכה">
            <span className="icon">🎓</span><span>הדרכה</span>
          </button>

        </div>
      </header>

      {/* ── MESSAGE ── */}
      {message && <div className="message" onClick={() => setMessage('')} style={{ cursor: 'pointer' }}>{message}</div>}

      {/* ── TEST MODE BANNER ── */}
      {testMode && (
        <div className="test-mode-banner">
          <span>🧪 מצב בדיקה פעיל — אין שמירה</span>
          <button className="test-clear-btn" onClick={clearTestData}>🧹 אפס</button>
          <button className="test-exit-btn" onClick={exitTestMode}>✕ צא</button>
        </div>
      )}

      {/* ── GLOBAL LOADING OVERLAY ── */}
      {(loadingItems || loadingAction || loadingHistory) && (
        <div className="global-loading-overlay">
          <div className="loader-dots">
            <span /><span /><span /><span /><span />
          </div>
          <div className="loader-label">
            {loadingAction ? 'מבצע...' : loadingHistory ? 'טוען...' : 'טוען...'}
          </div>
        </div>
      )}

      {/* ── ITEMS GRID ── */}
      {!loadingItems && (
        <>
          <div className="search-bar">
            <input
              type="text"
              placeholder="חיפוש..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="grid">
            {items
              .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((item, filteredIdx) => (
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

                  {/* Zero-size tutorial anchor for return — no layout impact */}
                  {filteredIdx === 0 && (
                    <span data-tutorial="tutorial-return" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true" />
                  )}
                  <div className="card-actions">
                    <button
                      className="btn btn-blue"
                      data-tutorial={filteredIdx === 0 ? 'tutorial-loan' : undefined}
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
            <h2>➕ הוספת פריט</h2>
            <input placeholder="שם פריט" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required />
            <input type="number" placeholder='סה"כ כמות' value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: e.target.value })} required />
            <input type="file" accept="image/*" onChange={e => setNewItem({ ...newItem, image: e.target.files[0] })} required />
            <div className="modal-buttons">
              <button type="submit" className="btn btn-solid" disabled={loadingAction}>{loadingAction ? 'שומר...' : 'הוספה'}</button>
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
              placeholder="שם הלווה"
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
              placeholder="סכום (ריק = חינם)"
              value={formInfo[item.id]?.payment || ''}
              onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], payment: e.target.value } })}
            />
            <div className="modal-buttons">
              <button type="submit" className="btn btn-solid" disabled={loadingAction}>{loadingAction ? 'שומר...' : '📤 השאלה'}</button>
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
                <p className="checklist-label">בחרו לווה לבחירה מהירה:</p>
                {openBorrowers.map((b, i) => (
                  <button key={i} type="button" className="borrower-btn" onClick={() => selectOpenBorrower(b.name, b.qty)}>
                    {b.name} — {b.qty} יח׳ בהשאלה
                  </button>
                ))}
              </div>
            )}

            <input
              placeholder="שם המחזיר/ה"
              value={formInfo[item.id]?.returner || ''}
              onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], returner: e.target.value } })}
              required
            />
            <input
              type="number"
              placeholder="כמות"
              min="1"
              value={formInfo[item.id]?.returnQty || ''}
              onChange={e => setFormInfo({ ...formInfo, [item.id]: { ...formInfo[item.id], returnQty: e.target.value } })}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="סכום ששולם (ריק = חינם)"
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
              <button type="submit" className="btn btn-success" disabled={loadingAction}>{loadingAction ? 'שומר...' : '📥 החזרה'}</button>
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
              <button type="submit" className="btn btn-solid" disabled={loadingAction}>{loadingAction ? 'שומר...' : 'שמירה'}</button>
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

              {!stats ? <p>אין רשומות השאלה עדיין</p> : (
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

              {!stats ? <p>אין נתונים להצגה עדיין</p> : (
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
                        <p className="stats-section-title">פריטים בהשאלה כרגע</p>
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
                      <p className="stats-section-title">ניצולת מלאי לפי פריט</p>
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

              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                {!testMode
                  ? <button className="test-mode-link" data-tutorial="tutorial-test" onClick={() => { closeAllModals(); enterTestMode() }}>🧪 כניסה למצב בדיקה</button>
                  : <button className="test-mode-link test-mode-link-exit" onClick={() => { closeAllModals(); exitTestMode() }}>🔴 יציאה ממצב בדיקה</button>
                }
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── MASS MODE PICKER ── */}
      {showMassMode && !massMode && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <div className="modal-form" onMouseDown={e => e.stopPropagation()}>
            <h2>✅ מצב רשימה</h2>
            <p>בחרו פעולה לביצוע על מספר פריטים בבת אחת</p>
            <div className="mode-picker">
              <button type="button" className="mode-btn" onClick={() => { setMassMode('take'); const l = getLastBorrowerInfo(); setMassBorrower(l.borrower); setMassAdmin(l.admin) }}>
                <span className="mode-icon">📤</span>
                <div><div>השאלה ברשימה</div><div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontWeight: 400 }}>השאלת מספר פריטים בבת אחת</div></div>
              </button>
              <button type="button" className="mode-btn" onClick={openMassReturnMode}>
                <span className="mode-icon">📥</span>
                <div><div>החזרה ברשימה</div><div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontWeight: 400 }}>החזרת מספר פריטים בבת אחת</div></div>
              </button>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => closeAllModals()} style={{ width: '100%' }}>ביטול</button>
          </div>
        </div>
      )}

      {/* ── MASS TAKE ── */}
      {showMassMode && massMode === 'take' && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <div className="modal-form mass-modal-form" onMouseDown={e => e.stopPropagation()}>
            <div className="mass-modal-scroll">
              <h2>📤 השאלה ברשימה</h2>
              <input placeholder="שם הלווה" value={massBorrower} onChange={e => setMassBorrower(e.target.value)} required />
              <select value={massAdmin} onChange={e => setMassAdmin(e.target.value)} required>
                <option value="">בחר מאשר</option>
                {admins.map((a, i) => <option key={i} value={a}>{a}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="סכום תשלום (ריק = חינם)" value={massPayment.amount || ''} onChange={e => setMassPayment({ ...massPayment, amount: e.target.value })} />
              <p className="section-label" style={{ marginTop: '1rem' }}>בחרו פריטים וכמויות</p>
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
            </div>
            <div className="mass-modal-footer">
              <button type="button" className="btn btn-solid" onClick={processMassLoans} disabled={loadingAction || !massBorrower || !massAdmin}>
                {loadingAction ? 'שומר...' : '✅ ביצוע השאלה'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setMassMode(null); setMassSelection({}) }}>חזור</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MASS RETURN ── */}
      {showMassMode && massMode === 'return' && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <div className="modal-form mass-modal-form" onMouseDown={e => e.stopPropagation()}>
            <div className="mass-modal-scroll">
              <h2>📥 החזרה ברשימה</h2>
              <select value={massReturnBorrower} onChange={e => setMassReturnBorrower(e.target.value)} required>
                <option value="">בחר לווה</option>
                {allLoans
                  .filter(l => (l.quantity - (l.returned_qty || 0)) > 0)
                  .map(l => l.borrower)
                  .filter((v, i, a) => a.indexOf(v) === i).sort()
                  .map((b, i) => <option key={i} value={b}>{b}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="סכום ששולם (ריק = חינם)" value={massPayment.paid || ''} onChange={e => setMassPayment({ ...massPayment, paid: e.target.value })} />
              {massReturnBorrower && (
                <>
                  <p className="section-label" style={{ marginTop: '1rem' }}>בחרו פריטים וכמויות</p>
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
            </div>
            <div className="mass-modal-footer">
              <button type="button" className="btn btn-success" onClick={processMassReturns} disabled={loadingAction || !massReturnBorrower}>
                {loadingAction ? 'שומר...' : '✅ ביצוע החזרה'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setMassMode(null); setMassReturnQty({}) }}>חזור</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE - PICK BORROWER ── */}
      {showShareModal && (
        <div className="modal" onMouseDown={() => closeAllModals()}>
          <div className="modal-form" style={{ maxHeight: '85vh', overflowY: 'auto', maxWidth: '440px' }} onMouseDown={e => e.stopPropagation()}>
            <h2>💬 שליחה בוואטסאפ</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', margin: '0 0 1rem' }}>בחרו לווה — תיפתח הודעה מוכנה בוואטסאפ</p>
            {(() => {
              const unique = allLoans
                .filter(l => (l.quantity - (l.returned_qty || 0)) > 0)
                .map(l => l.borrower)
                .filter((v, i, a) => a.indexOf(v) === i).sort()
              return unique.length === 0 ? <p style={{ color: 'var(--text-3)' }}>אין לווים פעילים כרגע</p> : (
                <div className="share-list">
                  {unique.map((borrower, i) => (
                    <button key={i} type="button" className="share-borrower-btn" onClick={() => handleShare(borrower)}>
                      <span>{borrower}</span>
                      <span style={{ fontSize: '1.1rem' }}>💬</span>
                    </button>
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

      {/* ── TUTORIAL OVERLAY ── */}
      {tutorialActive && (() => {
        const step = TUTORIAL_STEPS[tutorialStep]
        const hasSpot = !!spotlightRect
        const vw = vpSize.w || (typeof window !== 'undefined' ? window.innerWidth : 390)
        const vh = vpSize.h || (typeof window !== 'undefined' ? window.innerHeight : 844)
        const { x = 0, y = 0, w = 0, h = 0 } = spotlightRect || {}
        const r = 12
        // SVG path: full viewport minus rounded-rect cutout
        const cutout = hasSpot
          ? `M${x+r},${y} H${x+w-r} Q${x+w},${y} ${x+w},${y+r} V${y+h-r} Q${x+w},${y+h} ${x+w-r},${y+h} H${x+r} Q${x},${y+h} ${x},${y+h-r} V${y+r} Q${x},${y} ${x+r},${y} Z`
          : ''

        return (
          <div className="tutorial-overlay" style={{ direction: 'rtl' }}>
            {/* Backdrop: SVG with cutout when we have a target, plain dim otherwise */}
            <svg
              className="tutorial-svg"
              width={vw} height={vh}
              viewBox={`0 0 ${vw} ${vh}`}
              style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998 }}
            >
              <path
                d={`M0,0 H${vw} V${vh} H0 Z ${cutout}`}
                fill="rgba(0,0,0,0.75)"
                fillRule="evenodd"
              />
              {hasSpot && (
                <rect x={x} y={y} width={w} height={h} rx={r} ry={r}
                  fill="none" stroke="#63b3ed" strokeWidth="2.5"
                  opacity="0.8"
                  style={{ animation: 'tut-ring-pulse 1.8s ease-in-out infinite' }}
                />
              )}
            </svg>

            {/* Centered tooltip card — always on screen, no positioning math */}
            <div
              className={'tutorial-card' + (tutorialVisible ? ' tutorial-card-in' : ' tutorial-card-out')}
              style={{
                position: 'fixed',
                bottom: 'calc(var(--tab-bar-h, 0px) + 1rem)',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10000,
                width: 'min(340px, calc(100vw - 2rem))',
              }}
            >
              <div className="tutorial-card-header">
                <span className="tutorial-step-icon">{step.icon}</span>
                <span className="tutorial-step-counter">{tutorialStep + 1} / {TUTORIAL_STEPS.length}</span>
                <button className="tutorial-btn-x" onClick={endTutorial} title="סגור">✕</button>
              </div>

              <h3 className="tutorial-card-title">{step.title}</h3>
              <p className="tutorial-card-body">{step.body}</p>

              <div className="tutorial-dots">
                {TUTORIAL_STEPS.map((_, i) => (
                  <span key={i} className={'tutorial-dot' + (i === tutorialStep ? ' active' : '')} onClick={() => tutorialGoTo(i)} />
                ))}
              </div>

              <div className="tutorial-card-actions">
                <button
                  className="tutorial-btn-back"
                  onClick={tutorialPrev}
                  disabled={tutorialStep === 0}
                  style={{ opacity: tutorialStep === 0 ? 0.3 : 1 }}
                >
                  → חזור
                </button>
                <button className="tutorial-btn-next" onClick={tutorialNext}>
                  {tutorialStep === TUTORIAL_STEPS.length - 1 ? '✓ סיום' : 'הבא ←'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <nav className="mobile-tab-bar">
        <button className="tab-btn" data-tutorial="tutorial-stats" onClick={fetchAllLoans} disabled={loadingHistory}>
          <span className="tab-icon">📊</span>
          <span className="tab-label">סטטיסטיקה</span>
        </button>
        <button className="tab-btn" data-tutorial="tutorial-send" onClick={() => { setShowShareModal(true); fetchAllLoans() }}>
          <span className="tab-icon">💬</span>
          <span className="tab-label">שלח</span>
        </button>
        <button className="tab-btn tab-add" data-tutorial="tutorial-add" onClick={() => setShowAddModal(true)} disabled={loadingAction || loadingItems}>
          <span className="tab-icon-wrap">＋</span>
          <span className="tab-label">הוסף</span>
        </button>
        <button className="tab-btn" data-tutorial="tutorial-list" onClick={() => setShowMassMode(true)}>
          <span className="tab-icon">✅</span>
          <span className="tab-label">רשימה</span>
        </button>
        <button className="tab-btn" onClick={startTutorial}>
          <span className="tab-icon">🎓</span>
          <span className="tab-label">הדרכה</span>
        </button>
      </nav>

    </main>
  )
}