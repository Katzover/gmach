'use client'
import { useState, useEffect, useRef } from 'react'

const CATEGORIES = [
  { label: 'הכל', emoji: '✨' },
  { label: 'מפות', emoji: '🪡', keywords: ['מפות'] },
  { label: 'מרכזי שולחן', emoji: '🌿', keywords: ['מרכז שולחן', 'פלייסמנט', 'ראנר', 'ספסל עץ למרכז', 'קוביות עץ', 'אגרטל', 'אגרטלי', 'קנקן', 'רימוני'] },
  { label: 'פרחים', emoji: '🌸', keywords: ['פרחי ', 'ורדים', 'זר פרחים', 'פרחים לבנים'] },
  { label: 'עציצים', emoji: '🪴', keywords: ['עציץ', 'אדנית'] },
  { label: 'מגשים', emoji: '🫙', keywords: ['מגש', 'מגשי'] },
  { label: 'שבת קודש', emoji: '🕯️', keywords: ['פמוט', 'פמות', 'נרוני', 'מלחי', 'נטלה', 'עששית', 'סט פמוטים', 'קפה תה', 'פעמונים', 'קערת נירוסטה'] },
]

function getItemCategory(name) {
  for (const cat of CATEGORIES) {
    if (!cat.keywords) continue
    if (cat.keywords.some(kw => name.includes(kw))) return cat.label
  }
  return null
}

function seededRand(str, offset = 0) {
  let h = offset * 2654435761
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 2654435761)
  return ((h >>> 0) / 0xffffffff)
}

const CARD_TINTS = [
  { bg: '#fff8f0', border: '#f4c89a', badge: '#e8824a' },
  { bg: '#f0faf4', border: '#9dd4b0', badge: '#2e9e5b' },
  { bg: '#fdf0f8', border: '#e8a8d8', badge: '#c045a0' },
  { bg: '#f0f6ff', border: '#9ec4f0', badge: '#2a6fd4' },
  { bg: '#fffbf0', border: '#f0d888', badge: '#b8860b' },
  { bg: '#f4f0ff', border: '#c0a8f0', badge: '#6040c0' },
]

export default function Catalogue() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('הכל')
  const [visible, setVisible] = useState(false)
  const [titleWords, setTitleWords] = useState([false, false, false, false]) // קטלוג גמ״ח עיר דוד
  const [modalItem, setModalItem] = useState(null)   // { image_url, name } | null
  const [modalOpen, setModalOpen] = useState(false)
  const [visibleCards, setVisibleCards] = useState([]) // array of booleans
  const gridRef = useRef(null)

  function openModal(item) {
    setModalItem(item)
    // Next frame so CSS transition fires
    requestAnimationFrame(() => requestAnimationFrame(() => setModalOpen(true)))
  }
  function closeModal() {
    setModalOpen(false)
    setTimeout(() => setModalItem(null), 350)
  }
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])


  useEffect(() => {
    fetch('/api/items')
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setVisible(true)
      // Stagger each word in the title
      ;[0, 1, 2, 3].forEach(i => {
        setTimeout(() => setTitleWords(prev => { const n = [...prev]; n[i] = true; return n }), i * 140)
      })
    }))
  }, [])

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'הכל' || getItemCategory(item.name) === activeCategory
    return matchSearch && matchCat
  })

  // Whenever the filtered list changes, stagger all cards in together
  useEffect(() => {
    setVisibleCards([]) // reset
    if (filtered.length === 0) return
    // Small base delay so the grid has painted before animating
    const base = 80
    const timers = filtered.map((_, i) => {
      return setTimeout(() => {
        setVisibleCards(prev => {
          const next = [...prev]
          next[i] = true
          return next
        })
      }, base + i * 45)
    })
    return () => timers.forEach(clearTimeout)
  }, [filtered.length, activeCategory, search])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Rubik:wght@400;500;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .cat-page {
          min-height: 100vh;
          background: #fef9f0;
          direction: rtl;
          font-family: 'Rubik', sans-serif;
          overflow-x: hidden;
          position: relative;
        }

        .blob {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
          pointer-events: none;
          z-index: 0;
          animation: blob-drift 18s ease-in-out infinite alternate;
        }
        .blob-1 { width: 520px; height: 520px; background: #ffd6a0; top: -120px; right: -120px; animation-delay: 0s; }
        .blob-2 { width: 400px; height: 400px; background: #b8f0c8; bottom: 10%; left: -80px; animation-delay: -6s; }
        .blob-3 { width: 300px; height: 300px; background: #f8c0e8; top: 40%; left: 30%; animation-delay: -12s; }
        @keyframes blob-drift {
          0%   { transform: translate(0,0) scale(1); }
          50%  { transform: translate(30px,-20px) scale(1.06); }
          100% { transform: translate(-20px,30px) scale(0.96); }
        }

        .cat-header {
          position: relative;
          z-index: 2;
          padding: 3rem 2rem 1.5rem;
          text-align: center;
        }
        .cat-title {
          font-family: 'Fredoka', sans-serif;
          font-size: clamp(2rem, 6vw, 3.8rem);
          font-weight: 700;
          line-height: 1.2;
          color: #2a1a0a;
        }
        /* Each word bounces in individually */
        .title-word {
          display: inline-block;
          opacity: 0;
          transform: translateY(28px) rotate(-4deg) scale(0.85);
          transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1),
                      transform 0.6s cubic-bezier(0.22,1,0.36,1);
        }
        .title-word.in {
          opacity: 1;
          transform: translateY(0) rotate(0deg) scale(1);
        }
        /* Highlight word with underline reveal */
        .title-word.highlight {
          color: #e87030;
          position: relative;
        }
        .title-word.highlight::after {
          content: '';
          position: absolute;
          bottom: 0px; left: 0; right: 0;
          height: 7px;
          background: linear-gradient(90deg, #ffd080, #ffb040);
          border-radius: 4px;
          z-index: -1;
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.7s 0.1s cubic-bezier(0.22,1,0.36,1);
        }
        .title-word.highlight.in::after { transform: scaleX(1); }
        /* Wiggle on hover for fun */
        .title-word:hover {
          animation: word-wiggle 0.4s cubic-bezier(0.22,1,0.36,1);
          cursor: default;
        }
        @keyframes word-wiggle {
          0%   { transform: rotate(0deg) scale(1); }
          25%  { transform: rotate(-5deg) scale(1.08); }
          50%  { transform: rotate(4deg) scale(1.1); }
          75%  { transform: rotate(-2deg) scale(1.05); }
          100% { transform: rotate(0deg) scale(1); }
        }
        .cat-subtitle {
          font-size: 1rem;
          color: #8a6a4a;
          margin-top: 0.5rem;
          opacity: 0;
          transition: opacity 0.6s 0.3s;
        }
        .cat-subtitle.in { opacity: 1; }

        .cat-search-wrap {
          position: relative;
          z-index: 2;
          max-width: 480px;
          margin: 1.5rem auto 0;
          padding: 0 1.5rem;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.6s 0.4s cubic-bezier(0.22,1,0.36,1), transform 0.6s 0.4s cubic-bezier(0.22,1,0.36,1);
        }
        .cat-search-wrap.in { opacity: 1; transform: translateY(0); }
        .cat-search {
          width: 100%;
          padding: 0.9rem 1.1rem 0.9rem 3rem;
          border-radius: 999px;
          border: 2.5px solid #f0c890;
          background: #fffdf8;
          font-size: 1rem;
          font-family: 'Rubik', sans-serif;
          color: #2a1a0a;
          outline: none;
          box-shadow: 0 4px 16px rgba(232,120,48,0.12);
          transition: border-color 0.2s, box-shadow 0.2s;
          direction: rtl;
        }
        .cat-search:focus { border-color: #e87030; box-shadow: 0 4px 24px rgba(232,120,48,0.22); }
        .cat-search::placeholder { color: #c8a870; }
        .cat-search-icon { position: absolute; left: 2.5rem; top: 50%; transform: translateY(-50%); font-size: 1.1rem; pointer-events: none; }

        .cat-pills {
          position: relative;
          z-index: 2;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem;
          padding: 1.5rem 1.5rem 0;
          max-width: 900px;
          margin: 0 auto;
          opacity: 0;
          transition: opacity 0.6s 0.55s;
        }
        .cat-pills.in { opacity: 1; }
        .cat-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 1.1rem;
          border-radius: 999px;
          border: 2px solid #f0c890;
          background: #fffdf8;
          font-family: 'Fredoka', sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          color: #8a6a4a;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .cat-pill:hover { border-color: #e87030; color: #e87030; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(232,120,48,0.15); }
        .cat-pill.active { background: #e87030; border-color: #e87030; color: #fff; box-shadow: 0 4px 16px rgba(232,120,48,0.35); transform: translateY(-2px) scale(1.04); }

        .cat-count {
          text-align: center;
          font-family: 'Fredoka', sans-serif;
          font-size: 1rem;
          color: #b89060;
          margin: 1.5rem 0 0.5rem;
          position: relative;
          z-index: 2;
          opacity: 0;
          transition: opacity 0.4s 0.65s;
        }
        .cat-count.in { opacity: 1; }

        .cat-grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1.25rem;
          padding: 0.5rem 1.5rem 4rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .cat-card {
          border-radius: 20px;
          border: 2.5px solid var(--card-border);
          background: var(--card-bg);
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
          opacity: 0;
          transform: translateY(32px) rotate(var(--card-tilt));
          transition: opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s ease;
          will-change: transform, opacity;
        }
        .cat-card.in { opacity: 1; transform: translateY(0) rotate(var(--card-tilt)); }
        .cat-card:hover { transform: translateY(-6px) rotate(0deg) scale(1.02) !important; box-shadow: 0 16px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08); }

        .cat-card-img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; background: #f8efe0; transition: transform 0.4s cubic-bezier(0.22,1,0.36,1); }
        .cat-card:hover .cat-card-img { transform: scale(1.04); }
        .cat-card-img-placeholder { width: 100%; aspect-ratio: 4/3; background: linear-gradient(135deg, #ffecd6, #ffe0b8); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }

        .cat-card-body { padding: 0.85rem 1rem 1rem; }
        .cat-card-name { font-family: 'Fredoka', sans-serif; font-size: 1.05rem; font-weight: 600; color: #2a1a0a; line-height: 1.3; margin-bottom: 0.6rem; }
        .cat-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .cat-card-stock { display: flex; align-items: center; gap: 0.3rem; font-size: 0.82rem; color: #8a6a4a; }
        .cat-card-stock strong { color: #2a1a0a; font-size: 0.9rem; }
        .cat-avail-badge { font-family: 'Fredoka', sans-serif; font-size: 0.82rem; font-weight: 600; padding: 0.2rem 0.7rem; border-radius: 999px; white-space: nowrap; }
        .cat-avail-badge.available { background: var(--card-badge); color: #fff; }
        .cat-avail-badge.out { background: #fde8e8; color: #d04040; }

        /* ── IMAGE MODAL ── */
        .img-modal-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(40,20,5,0);
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem;
          transition: background 0.3s ease;
          cursor: zoom-out;
        }
        .img-modal-backdrop.open { background: rgba(40,20,5,0.65); backdrop-filter: blur(6px); }
        .img-modal-box {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.4), 0 0 0 3px #fff;
          max-width: min(720px, 90vw);
          max-height: 80vh;
          opacity: 0;
          transform: scale(0.6) rotate(-4deg);
          transition: opacity 0.35s cubic-bezier(0.22,1,0.36,1),
                      transform 0.35s cubic-bezier(0.22,1,0.36,1);
          cursor: default;
        }
        .img-modal-backdrop.open .img-modal-box {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }
        .img-modal-img {
          display: block;
          width: 100%;
          height: 100%;
          max-height: 80vh;
          object-fit: contain;
          background: #fff8f0;
        }
        .img-modal-close {
          position: absolute;
          top: 12px; left: 12px;
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.92);
          border: none;
          font-size: 1rem;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          transition: transform 0.2s, background 0.2s;
          z-index: 2;
        }
        .img-modal-close:hover { transform: scale(1.15) rotate(90deg); background: #fff; }
        .img-modal-name {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 0.85rem 1rem 0.75rem;
          background: linear-gradient(transparent, rgba(40,20,5,0.7));
          color: #fff;
          font-family: 'Fredoka', sans-serif;
          font-size: 1.1rem;
          font-weight: 600;
          text-align: center;
        }
        /* Card image cursor hint */
        .cat-card-img-wrap { position: relative; overflow: hidden; cursor: zoom-in; }
        .cat-card-img-wrap::after {
          content: '🔍';
          position: absolute;
          bottom: 8px; left: 8px;
          font-size: 1rem;
          background: rgba(255,255,255,0.85);
          border-radius: 50%;
          width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          transform: scale(0.7);
          transition: opacity 0.2s, transform 0.2s;
          pointer-events: none;
        }
        .cat-card:hover .cat-card-img-wrap::after { opacity: 1; transform: scale(1); }

        .cat-loading { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; padding: 6rem 2rem; gap: 1rem; }
        .cat-loading-dots { display: flex; gap: 0.5rem; }
        .cat-loading-dot { width: 12px; height: 12px; border-radius: 50%; background: #e87030; animation: dot-bounce 1.2s ease-in-out infinite; }
        .cat-loading-dot:nth-child(2) { animation-delay: 0.2s; background: #f0a840; }
        .cat-loading-dot:nth-child(3) { animation-delay: 0.4s; background: #e87030; }
        @keyframes dot-bounce { 0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }
        .cat-loading-text { font-family: 'Fredoka', sans-serif; font-size: 1.2rem; color: #c08040; }

        .cat-empty { position: relative; z-index: 2; text-align: center; padding: 4rem 2rem; }
        .cat-empty-emoji { font-size: 3rem; display: block; margin-bottom: 0.75rem; }
        .cat-empty-text { font-family: 'Fredoka', sans-serif; font-size: 1.3rem; color: #c08040; }

        @media (max-width: 600px) {
          .cat-grid { grid-template-columns: repeat(2, 1fr); gap: 0.85rem; padding: 0.5rem 0.85rem 4rem; }
          .cat-header { padding: 2rem 1rem 1rem; }
        }
      `}</style>

      <div className="cat-page">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        <header className="cat-header">
          <h1 className="cat-title">
            {[['קטלוג', false], ['גמ״ח', false], ['עיר', false], ['דוד', true]].map(([word, isHighlight], i) => (
              <span key={i}>
                <span className={`title-word${isHighlight ? ' highlight' : ''}${titleWords[i] ? ' in' : ''}`}>
                  {word}
                </span>
                {i < 3 && ' '}
              </span>
            ))}
          </h1>
          <p className={`cat-subtitle${visible ? ' in' : ''}`}>
            כל הפריטים שלנו — במקום אחד
          </p>
        </header>

        <div className={`cat-search-wrap${visible ? ' in' : ''}`}>
          <span className="cat-search-icon">🔍</span>
          <input
            className="cat-search"
            type="text"
            placeholder="חיפוש פריט..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={`cat-pills${visible ? ' in' : ''}`}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.label}
              className={`cat-pill${activeCategory === cat.label ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.label)}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {!loading && (
          <p className={`cat-count${visible ? ' in' : ''}`}>{filtered.length} פריטים</p>
        )}

        {loading ? (
          <div className="cat-loading">
            <div className="cat-loading-dots">
              <div className="cat-loading-dot" />
              <div className="cat-loading-dot" />
              <div className="cat-loading-dot" />
            </div>
            <p className="cat-loading-text">טוען פריטים...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="cat-empty">
            <span className="cat-empty-emoji">🔍</span>
            <p className="cat-empty-text">לא נמצאו פריטים</p>
          </div>
        ) : (
          <div className="cat-grid" ref={gridRef}>
            {filtered.map((item, idx) => (
              <CatalogueCard key={item.id} item={item} idx={idx} onImageClick={openModal} visible={!!visibleCards[idx]} />
            ))}
          </div>
        )}
        {/* ── IMAGE MODAL ── */}
        {modalItem && (
          <div
            className={`img-modal-backdrop${modalOpen ? ' open' : ''}`}
            onMouseDown={closeModal}
          >
            <div className="img-modal-box" onMouseDown={e => e.stopPropagation()}>
              <img className="img-modal-img" src={modalItem.image_url} alt={modalItem.name} />
              <div className="img-modal-name">{modalItem.name}</div>
              <button className="img-modal-close" onClick={closeModal} aria-label="סגור">✕</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function CatalogueCard({ item, idx, onImageClick, visible }) {
  const tintIdx = Math.floor(seededRand(item.id, 0) * CARD_TINTS.length)
  const tint = CARD_TINTS[tintIdx]
  const tilt = (seededRand(item.id, 1) - 0.5) * 2.4

  const isOut = item.available_qty === 0
  const catEmoji = CATEGORIES.find(c => c.keywords && c.keywords.some(kw => item.name.includes(kw)))?.emoji || '📦'

  return (
    <div
      className={`cat-card${visible ? ' in' : ''}`}
      style={{
        '--card-bg': tint.bg,
        '--card-border': tint.border,
        '--card-badge': tint.badge,
        '--card-tilt': `${tilt}deg`,
      }}
    >
      {item.image_url ? (
        <div className="cat-card-img-wrap" onClick={() => onImageClick && onImageClick(item)}>
          <img className="cat-card-img" src={item.image_url} alt={item.name} loading="lazy" />
        </div>
      ) : (
        <div className="cat-card-img-placeholder">{catEmoji}</div>
      )}
      <div className="cat-card-body">
        <p className="cat-card-name">{item.name}</p>
        <div className="cat-card-footer">
          <span className="cat-card-stock">
            <strong>{item.available_qty}</strong> / {item.total_qty} זמין
          </span>
          <span className={`cat-avail-badge ${isOut ? 'out' : 'available'}`}>
            {isOut ? 'אזל' : 'זמין'}
          </span>
        </div>
      </div>
    </div>
  )
}