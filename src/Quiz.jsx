import React, { useEffect, useMemo, useRef, useState } from 'react'
import Confetti from 'react-confetti'


/**
 * Quiz avanzato:
 * - Round, statistiche, soglia “3 corrette di fila”
 * - Salvataggio progressi (localStorage: quizProgress)
 * - Timer (cronometro o conto alla rovescia) passato da props
 * - Salvataggio storico a completamento (tramite onFinish)
 * - Pulsanti finali: Ricomincia / Esci
 */

function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function nowParts() {
  const d = new Date()
  const data = d.toISOString().slice(0,10) // YYYY-MM-DD
  const hh = String(d.getHours()).padStart(2,'0')
  const mm = String(d.getMinutes()).padStart(2,'0')
  const ss = String(d.getSeconds()).padStart(2,'0')
  const ora = `${hh}:${mm}:${ss}`
  return { data, ora, dateObj: d }
}


// Normalizza una stringa: lowercase, senza accenti/punteggiatura, spazi unificati
function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // rimuove accentate
    .replace(/[^\p{L}\p{N}\s]/gu, '')                // toglie punteggiatura
    .replace(/\s+/g, ' ')
    .trim()
}

// Similarità Dice coefficient (basata su bigrammi), utile per confrontare risposte brevi
const stopwords = ["il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "dei", "degli", "delle", "di", "a", "da", "in", "su", "per", "con", "che"]

const synonyms = {
  "bambino": ["ragazzo", "fanciullo", "piccolo"],
  "acqua": ["h2o"],
  "co2": ["anidride", "carbonica"],
  "correre": ["corro", "corse", "corriamo", "corsa"]
}

function normalizePlus(str) {
  let text = normalize(str) // usa già lowercase, senza accenti, punteggiatura

  // Rimuovi articoli e stopwords
  text = text.split(" ")
    .filter(w => !stopwords.includes(w))
    .join(" ")

  // Lemmatizzazione semplice tramite sinonimi
  Object.entries(synonyms).forEach(([base, lista]) => {
    lista.forEach(s => {
      const regex = new RegExp(`\\b${s}\\b`, "g")
      text = text.replace(regex, base)
    })
  })

  return text.trim()
}




function diceCoefficient(a, b) {
  a = normalize(a); b = normalize(b)
  if (!a || !b) return 0
  if (a === b) return 1
  const bigrams = s => {
    const res = []
    for (let i = 0; i < s.length - 1; i++) res.push(s.slice(i, i+2))
    return res
  }
  const A = bigrams(a), B = bigrams(b)
  const map = new Map()
  A.forEach(bg => map.set(bg, (map.get(bg)||0)+1))
  let intersect = 0
  B.forEach(bg => {
    const c = map.get(bg)
    if (c) { intersect++; map.set(bg, c-1) }
  })
  return (2 * intersect) / (A.length + B.length)
}



function Quiz({
  domande,
  timerMode = 'up',           // 'up' | 'down'
  countdownMinutes = 10,      // intero, se 'down'
  onFinish,                   // (summary) => void
  onQuit,                      // () => void
  randomDomande = false,
  randomRisposte = false,
  freeAnswerMode = false,      //modif 10/09/25
  freeAnswerThreshold = 0.55   //modif 10/09/25
}) {
  const [round, setRound] = useState(1)
  const [domandeAttive, setDomandeAttive] = useState([])
  const [indiceDomanda, setIndiceDomanda] = useState(0)
  const [completato, setCompletato] = useState(false)
  const [domandeConcluse, setDomandeConcluse] = useState([])
  const [statisticheDomande, setStatisticheDomande] = useState(() =>
    domande.map(() => ({ mostrata: 0, corrette: 0, errate: 0, nulle: 0, consecutiveCorrette: 0 }))
  )
  // Stato per la modalità risposta aperta
  const [freeAnswer, setFreeAnswer] = useState('')

  // Timer
  const [elapsedSec, setElapsedSec] = useState(0)                           // per 'up'
  const [remainingSec, setRemainingSec] = useState(countdownMinutes * 60)   // per 'down'
  const timerRef = useRef(null)
  const startInfoRef = useRef(null) // {data, ora, dateObj}

  const lastCountedIndex = useRef(null)

  // ---- Inizializza domande + ripristino progressi (se presenti sulla stessa batteria di domande) ----
  useEffect(() => {
    let inizializzate = domande.map((d, i) => ({ ...d, indiceOriginale: i }))
    
    // randomizza ordine domande se attivo
    if (randomDomande) {
      inizializzate = inizializzate.sort(() => Math.random() - 0.5)
    }

    // randomizza risposte se attivo
    if (randomRisposte) {
      inizializzate = inizializzate.map(d => {
        // accoppia testo + indice originale (1..4)
        const paired = d.risposte.map((text, idx) => ({ text, idx: idx + 1 }))
        const shuffled = [...paired].sort(() => Math.random() - 0.5)

        // trova nuovo indice della risposta corretta
        const newCorretta = shuffled.findIndex(item => item.idx === d.corretta) + 1

        return {
          ...d,
          risposte: shuffled.map(x => x.text),
          corretta: newCorretta, // 👆 (NUOVO) aggiorniamo l’indice corretto
        }
      })
    }
    
    
    setDomandeAttive(inizializzate)
  


    const saved = localStorage.getItem('quizProgress')
    if (saved) {
      try {
        const p = JSON.parse(saved)
        if (Array.isArray(p.statisticheDomande) && p.statisticheDomande.length === domande.length) {
          setDomandeConcluse(p.domandeConcluse || [])
          setStatisticheDomande(p.statisticheDomande)
          setRound(p.round || 1)
          setIndiceDomanda(p.indiceDomanda ?? 0)
        }
      } catch {}
    }
  }, [domande, randomDomande, randomRisposte])

  // ---- Contatore “mostrata” (una sola volta per domanda) ----
  useEffect(() => {
    if (!completato && domandeAttive[indiceDomanda] && lastCountedIndex.current !== indiceDomanda) {
      const id = domandeAttive[indiceDomanda].indiceOriginale
      setStatisticheDomande(prev => {
        const nuovo = [...prev]
        nuovo[id] = { ...nuovo[id], mostrata: nuovo[id].mostrata + 1 }
        return nuovo
      })
      lastCountedIndex.current = indiceDomanda
    }
  }, [indiceDomanda, domandeAttive, completato])

  // ---- Avvio timer alla prima render utile ----
  useEffect(() => {
    // Memorizza istante di inizio (solo una volta)
    if (!startInfoRef.current) {
      startInfoRef.current = nowParts()
    }

    if (timerRef.current) return
    timerRef.current = setInterval(() => {
      setElapsedSec(prev => prev + 1)
      setRemainingSec(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  // ---- Salvataggio progressi automatico ----
  useEffect(() => {
    const datiDaSalvare = {
      domandeConcluse,
      statisticheDomande,
      round,
      indiceDomanda,
    }
    localStorage.setItem('quizProgress', JSON.stringify(datiDaSalvare))
  }, [domandeConcluse, statisticheDomande, round, indiceDomanda])

    // ---- Calcolo testo timer ----
  const timerText = useMemo(() => {
    if (timerMode === 'down') return formatHMS(remainingSec)
    return formatHMS(elapsedSec)
  }, [timerMode, elapsedSec, remainingSec])

  const timerDescrizione = useMemo(() => {
    return timerMode === 'down'
      ? `Conto alla rovescia da ${countdownMinutes} min`
      : 'Cronometro crescente'
  }, [timerMode, countdownMinutes])

  // ---- Blocco UI in attesa di setup ----
  if (!domandeAttive.length || !domandeAttive[indiceDomanda]) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner-wrapper">
          <div className="spinner-inner"></div>
          <div className="spinner-outer"></div>
        </div>
        


        <p style={{ marginTop: '1rem', fontWeight: 'bold', color: '#4caf50' }}>
          Caricamento domande...
        </p>
        <style>{`
          .spinner-wrapper {
            position: relative;
            width: 50px;
            height: 50px;
            margin: 2rem auto;
          }
          .spinner-inner, .spinner-outer {
            position: absolute;
            top: 0;
            left: 0;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 4px solid transparent;
            border-top-color: #4caf50;
          }
          .spinner-inner {
            border-top-color: #ff9800;
            animation: spin 0.8s linear infinite;
          }
          .spinner-outer {
            animation: spin 1.2s linear reverse infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  const domandaCorrente = domandeAttive[indiceDomanda]


  // ---- Funzione comune per applicare esito risposta ----
  const applyAnswerResult = (isCorrect) => {
    const id = domandaCorrente.indiceOriginale
    setStatisticheDomande(prev => {
      const nuovo = [...prev]
      const cur = { ...nuovo[id] }

      if (isCorrect) {
        cur.corrette += 1
        cur.consecutiveCorrette += 1
      } else {
        cur.errate += 1
        cur.consecutiveCorrette = 0
      }

      nuovo[id] = cur

      if (isCorrect && cur.consecutiveCorrette >= 3) {
        setDomandeConcluse(prevList =>
          prevList.includes(id) ? prevList : [...prevList, id]
        )
      }

      return nuovo
    })

    if (indiceDomanda < domandeAttive.length - 1) {
      setIndiceDomanda(indiceDomanda + 1)
    } else {
      setCompletato(true)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    lastCountedIndex.current = null
  }


  // ---- Gestione risposta ----
  const selezionaRisposta = (indiceRisposta) => {
    const id = domandaCorrente.indiceOriginale
    const corretta = indiceRisposta === domandaCorrente.corretta

    setStatisticheDomande(prev => {
      const nuovo = [...prev]
      const cur = { ...nuovo[id] }

      if (indiceRisposta == null) {
        cur.nulle += 1
        cur.consecutiveCorrette = 0
      } else if (corretta) {
        cur.corrette += 1
        cur.consecutiveCorrette += 1
      } else {
        cur.errate += 1
        cur.consecutiveCorrette = 0
      }

      nuovo[id] = cur

      // Se con l'aggiornamento si raggiunge soglia 3, marca come “appresa”
      if (corretta && cur.consecutiveCorrette >= 3) {
        setDomandeConcluse(prevList => (
          prevList.includes(id) ? prevList : [...prevList, id]
        ))
      }

      return nuovo
    })

    // Avanza o termina round
    if (indiceDomanda < domandeAttive.length - 1) {
      setIndiceDomanda(indiceDomanda + 1)
    } else {
      setCompletato(true)
      // ferma timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    lastCountedIndex.current = null
  }

  // ---- Gestione risposta aperta ----
  const confermaRispostaAperta = () => {
    const correctText = domandaCorrente.risposte[domandaCorrente.corretta - 1]
    const user = freeAnswer

    const exact = normalizePlus(user) === normalizePlus(correctText)
    const fuzzy = diceCoefficient(normalizePlus(user), normalizePlus(correctText)) >= freeAnswerThreshold
    const isCorrect = exact || fuzzy

    applyAnswerResult(isCorrect)
    setFreeAnswer('')
  }

  // ---- Schermata finale / risultati per round ----
  if (completato) {
    const daRipetere = domandeAttive.filter(d => !domandeConcluse.includes(d.indiceOriginale))
    const concluseCount = domandeConcluse.length
    const percentuale = ((concluseCount / domande.length) * 100).toFixed(1)

    // Se TUTTE apprese → registriamo tentativo in storico + azioni
    const tutteApprese = concluseCount === domande.length
    let fineInfo = nowParts()
    let durataSec = Math.floor((fineInfo.dateObj - startInfoRef.current.dateObj) / 1000)

      
    // Prepara summary per onFinish se tutte apprese
    const summary = {
      data: startInfoRef.current?.data,
      oraInizio: startInfoRef.current?.ora,
      oraFine: fineInfo.ora,
      durata: formatHMS(durataSec),
      domandeTotali: domande.length,
      domandeConcluse: concluseCount,
      roundUsati: round,
      timerDescrizione
    }

    // 🔹 Salva nello storico se quiz completato
    const handleEsciFinale = () => {
      if (tutteApprese && onFinish) {
        onFinish(summary)
      }
      onQuit && onQuit()
    }

    const handleRicomincia = () => {
      // reset completo
      setRound(1)
      setIndiceDomanda(0)
      setDomandeConcluse([])
      setStatisticheDomande(domande.map(() => ({ mostrata: 0, corrette: 0, errate: 0, nulle: 0, consecutiveCorrette: 0 })))
      setCompletato(false)
      lastCountedIndex.current = null
      // reset timer
      setElapsedSec(0)
      setRemainingSec(countdownMinutes * 60)
      startInfoRef.current = nowParts()
      // riavvia timer
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setElapsedSec(prev => prev + 1)
          setRemainingSec(prev => Math.max(0, prev - 1))
        }, 1000)
      }
    }

    const handleEsci = () => {
      onQuit && onQuit()
    }


    const handleFase2 = () => {
      // reset come Ricomincia
      setRound(1)
      setIndiceDomanda(0)
      setDomandeConcluse([])
      setStatisticheDomande(domande.map(() => ({
        mostrata: 0, corrette: 0, errate: 0, nulle: 0, consecutiveCorrette: 0
      })))
      setCompletato(false)
      lastCountedIndex.current = null
      setElapsedSec(0)
      setRemainingSec(countdownMinutes * 60)
      startInfoRef.current = nowParts()
      
      // differenza: forza la modalità risposta aperta
      if (typeof onQuit === 'function') {
        // torniamo alla Dashboard per riaprire Quiz con freeAnswerMode = true
        onQuit({ fase2: true })
      }
    }

    return (
      <div style={{ padding: '2rem' }}>
        <h2>Round {round} - Risultati</h2>
        <p>✅ Domande apprese: {concluseCount} di {domande.length} ({percentuale}%)</p>

        <div style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>
          ⏱️ {timerDescrizione} — {timerText}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 360px', rowGap: '0.5rem', alignItems: 'center' }}>
          {domande.map((d, i) => {
            const stat = statisticheDomande[i]
            let simbolo = null
            if (stat.errate > 0) simbolo = <span style={{ color: 'red' }}>❌</span>
            else if (stat.corrette > 0) simbolo = <span style={{ color: 'green' }}>✔️</span>
            else simbolo = <span style={{ color: 'gray' }}>○</span>

            return (
              <React.Fragment key={i}>
                <div style={{ fontWeight: 'bold' }}>{i + 1})</div>
                <div>{simbolo} {d.domanda}</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  👁️ {stat.mostrata} &nbsp;
                  <span style={{ color: 'green' }}>✔️ {stat.corrette}</span> &nbsp;
                  <span style={{ color: 'red' }}>❌ {stat.errate}</span> &nbsp;
                  <span style={{ color: 'gray' }}>⚪ {stat.nulle}</span> &nbsp;
                  <span style={{ color: '#333' }}>({Math.min(stat.consecutiveCorrette, 3)} su 3)</span>
                </div>
              </React.Fragment>
            )
          })}
        </div>

        {daRipetere.length > 0 ? (
          <>
            <button
              style={{ marginTop: '1rem' }}
              onClick={() => {
                setDomandeAttive(daRipetere)
                setIndiceDomanda(0)
                setCompletato(false)
                lastCountedIndex.current = null
                setRound(prev => prev + 1)
                // timer continua
              }}
            >
              Ripeti domande non ancora apprese
            </button>
            <div style={{ marginTop:'1rem' }}>
              <button onClick={() => {
                // 👇 salviamo nello storico PRIMA di uscire
                onFinish && onFinish(summary)
                handleEsci()
              }} style={{ marginRight:'0.5rem' }}>🚪 Esci</button>
              <button onClick={handleRicomincia}>🔄 Ricomincia da capo</button>

            </div>
          </>
        ) : (
          <>
          {tutteApprese && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}           // coriandoli una volta sola
            numberOfPieces={600}      // quantità di coriandoli
            gravity={0.2}             // caduta più lenta
          />
        )}
            <p style={{ marginTop: '1rem' }}>🎉 Hai appreso tutte le domande!</p>
            <div style={{ marginTop:'1rem' }}>
              <button onClick={handleEsciFinale} style={{ marginRight:'0.5rem' }}>🚪 Esci</button>
              <button onClick={handleRicomincia}>🔄 Ricomincia da capo</button>

              {tutteApprese && (
                <button
                  onClick={handleFase2}
                  style={{
                    marginLeft: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    background: '#ff9800',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  📝 Passa alla Fase 2 con risposta aperta
                </button>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  // ---- UI in corso DOMANDE RISPOSTE???----
  return (
    <div style={{ padding: '2rem' }}>
      {/* Barra superiore */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems:'center' }}>
        
        
        <button onClick={() => {
          if (indiceDomanda > 0) {
            setIndiceDomanda(indiceDomanda - 1)
            lastCountedIndex.current = indiceDomanda - 1
          }
        }} disabled={indiceDomanda === 0}>Indietro</button>


        <div style={{ fontWeight:'bold' }}>Round {round}</div>

        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <div style={{ fontWeight:'bold' }}>Domanda {indiceDomanda + 1} di {domandeAttive.length}</div>
          <div style={{ padding:'0.25rem 0.5rem', border:'1px solid #ccc', borderRadius:6 }}>
            ⏱️ {timerText}
          </div>
        </div>
      </div>

      {/* Testo domanda + stats sintetiche */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <p style={{ flex: 1, margin: 0 }}><strong>{domandaCorrente.domanda}</strong></p>
        <div style={{ fontSize: '0.85rem', color: '#666', textAlign: 'right', whiteSpace: 'nowrap' }}>
          👁️ {statisticheDomande[domandaCorrente.indiceOriginale].mostrata} &nbsp;
          <span style={{ color: 'green' }}>✔️ {statisticheDomande[domandaCorrente.indiceOriginale].corrette}</span> &nbsp;
          <span style={{ color: 'red' }}>❌ {statisticheDomande[domandaCorrente.indiceOriginale].errate}</span> &nbsp;
          <span style={{ color: 'gray' }}>⚪ {statisticheDomande[domandaCorrente.indiceOriginale].nulle}</span>
        </div>
      </div>

      {/* Risposte */}
      {/* Risposte */}
      {freeAnswerMode ? (
        <div style={{ marginTop:'1rem' }}>
          <input
            type="text"
            value={freeAnswer}
            onChange={(e) => setFreeAnswer(e.target.value)}
            placeholder="Scrivi qui la tua risposta…"
            style={{ width:'100%', padding:'0.5rem', border:'1px solid #ccc', borderRadius:6 }}
          />
          <div style={{ marginTop:'0.5rem' }}>
            <button onClick={confermaRispostaAperta} disabled={!freeAnswer.trim()}>
              Conferma
            </button>
          </div>
        </div>
      ) : (
        <ul style={{ listStyle:'none', padding:0 }}>
          {domandaCorrente.risposte.map((r, i) => (
            <li key={i} style={{ marginBottom:'0.5rem' }}>
              <button onClick={() => selezionaRisposta(i + 1)}>
                {i + 1}) {r}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={() => {
          onQuit && onQuit()
        }}
        style={{
          marginTop: '2.0rem',
          marginLeft: '0.0rem',
          padding: '0.3rem 0.3rem',
          borderRadius: '1px',
          background: '#2196f3',
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        🏠 Torna alla Home
      </button>
    </div>
  )
}


export default Quiz