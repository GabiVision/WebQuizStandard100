import React, { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import axios from 'axios'
import Quiz from './Quiz'

/**
 * Dashboard “somma di caratteristiche”:
 * - Upload Excel come in origine (XLSX -> array domande)
 * - Opzione alternativa: carica via API dal backend Flask
 * - Configurazione timer (cronometro crescente / conto alla rovescia + minuti)
 * - Visualizzazione storico tentativi salvati in localStorage
 */

function Dashboard({ userEmail, onLogout }) {
  const [domande, setDomande] = useState(null)
  const [inQuiz, setInQuiz] = useState(false)

  // Timer config
  const [timerMode, setTimerMode] = useState('up') // 'up' | 'down'
  const [countdownMinutes, setCountdownMinutes] = useState(10)

  // Storico
  const [history, setHistory] = useState([])

  // Nome quiz
  const [quizName, setQuizName] = useState("")

  // Opzioni random
  const [randomDomande, setRandomDomande] = useState(false)
  const [randomRisposte, setRandomRisposte] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('quizHistory')
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch {}
    }
  }, [])

  const appendHistory = (record) => {
    const newList = [record, ...history]
    setHistory(newList)
    localStorage.setItem('quizHistory', JSON.stringify(newList))
  }

  // --------- Caricamento domande da Excel ----------
  const handleExcel = async (file) => {
    if (!file) return
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

    /**
     * Assunzione struttura Excel (come versione originale):
     * Colonne: "Domanda", "Risposta1", "Risposta2", "Risposta3", "Risposta4", "Corretta"
     * Dove "Corretta" è un numero 1..4
     */
    const parsed = rows
      .map((r, idx) => {
        const domanda = r.Domanda?.toString().trim()
        const r1 = r.Risposta1?.toString().trim()
        const r2 = r.Risposta2?.toString().trim()
        const r3 = r.Risposta3?.toString().trim()
        const r4 = r.Risposta4?.toString().trim()
        const correttaNum = Number(r.Corretta)

        

        if (!domanda || !r1 || !r2 || !r3 || !r4 || ![1,2,3,4].includes(correttaNum)) {
          return null
        }

        return {
          id: idx + 1,
          domanda,
          risposte: [r1, r2, r3, r4],
          corretta: correttaNum
        }
      })
      .filter(Boolean)

    console.log("Parsed domande:", parsed)  

    if (!parsed.length) {
      alert('Excel non valido o vuoto. Assicurati delle intestazioni: Domanda, Risposta1..4, Corretta (1-4).')
      return
    }

    // 👇 chiedi nome quiz
    let name = prompt("Inserisci un nome per il quiz:")
    if (!name) {
      alert("Nome quiz obbligatorio.")
      return
    }
    if (history.some(h => h.quizName === name)) {
      alert("Questo nome esiste già, scegline un altro.")
      return
    }

    // Salva su localStorage il contenuto del quiz in JSON separato
    const fileKey = `quizFile_${name}`
    localStorage.setItem(fileKey, JSON.stringify(parsed))


    setQuizName(name)
    setDomande(parsed)
    setInQuiz(true)
  }

//

  // --------- Caricamento domande via API (backend Flask) ----------
  const handleLoadFromApi = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:5000/domande')
      if (Array.isArray(res.data) && res.data.length) {
          // 👇 chiedi nome quiz
        let name = prompt("Inserisci un nome per il quiz:")
        if (!name) {
          alert("Nome quiz obbligatorio.")
          return
        }
        if (history.some(h => h.quizName === name)) {
          alert("Questo nome esiste già, scegline un altro.")
          return
        }

        setQuizName(name)
        setDomande(res.data)
        setInQuiz(true)
      } else {
        alert('API vuota o in formato inatteso.')
      }
    } catch (e) {
      console.error(e)
      alert('Errore nel caricamento da API. Assicurati che il backend sia acceso.')
    }
  }



  // --------- Fine quiz / uscita quiz ----------
  const handleQuizFinish = (summary) => {
    // salviamo nello storico
    appendHistory({
      ...summary,
      quizName,              // 👈 nuovo campo
      fileKey: `quizFile_${quizName}`,  // 👈 riferimento al JSON
      userEmail: userEmail || null,
      createdAt: new Date().toISOString()
    })
    setInQuiz(false)
  }

  const handleQuitToHome = () => {
    setInQuiz(false)
  }

  // --------- Elimina riga storico ----------
  const deleteHistoryEntry = (index) => {
    const newHistory = history.filter((_, i) => i !== index)
    setHistory(newHistory)
    localStorage.setItem('quizHistory', JSON.stringify(newHistory))
  }




  // --------- UI ----------
  if (inQuiz && domande) {
    return (
      <div style={{ padding: '1rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <h2>Quiz</h2>
          <button onClick={onLogout}>Logout</button>
        </div>

        <Quiz
          domande={domande}
          timerMode={timerMode}                 // 'up' o 'down'
          countdownMinutes={countdownMinutes}   // minuti per conto alla rovescia
          onFinish={handleQuizFinish}           // chiamato a quiz completato (tutte apprese)
          onQuit={handleQuitToHome}             // uscita alla dashboard
          randomDomande={randomDomande}
          randomRisposte={randomRisposte}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2>Dashboard</h2>
        <div>
          {userEmail && <span style={{ marginRight:'1rem' }}>👤 {userEmail}</span>}
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      <hr style={{ margin: '1rem 0' }} />

      {/* Config timer */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h3>Impostazioni Timer</h3>
        <div style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
          <label>
            <input
              type="radio"
              name="timerMode"
              value="up"
              checked={timerMode === 'up'}
              onChange={() => setTimerMode('up')}
            />{' '}
            Cronometro crescente
          </label>
          <label>
            <input
              type="radio"
              name="timerMode"
              value="down"
              checked={timerMode === 'down'}
              onChange={() => setTimerMode('down')}
            />{' '}
            Conto alla rovescia
          </label>

          {timerMode === 'down' && (
            <label>
              Minuti:{' '}
              <input
                type="number"
                min={1}
                value={countdownMinutes}
                onChange={(e) => setCountdownMinutes(Number(e.target.value) || 1)}
                style={{ width: '80px' }}
              />
            </label>
          )}
        </div>
      </section>

      {/* Sorgente domande */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h3>Carica domande</h3>
        <div style={{ display:'flex', gap:'1rem', alignItems:'center', flexWrap:'wrap' }}>
          <label style={{ border:'1px dashed #888', padding:'0.5rem 1rem', cursor:'pointer' }}>
            📄 Carica Excel (.xlsx)
            <input
              type="file"
              accept=".xlsx,.xls"
              style={{ display:'none' }}
              onChange={(e) => handleExcel(e.target.files?.[0])}
            />
          </label>

          <button onClick={handleLoadFromApi}>🌐 Usa API backend</button>
      

        {/* Pulsanti random */}
          <button
            onClick={() => setRandomDomande(prev => !prev)}
            style={{ background: randomDomande ? '#4caf50' : '#ccc', padding:'0.5rem 1rem', borderRadius:'6px' }}
          >
            Domande {randomDomande ? '🔀 ON' : '➡️ OFF'}
          </button>

          <button
            onClick={() => setRandomRisposte(prev => !prev)}
            style={{ background: randomRisposte ? '#4caf50' : '#ccc', padding:'0.5rem 1rem', borderRadius:'6px' }}
          >
            Risposte {randomRisposte ? '🔀 ON' : '➡️ OFF'}
          </button>
        </div>


        <p style={{ color:'#666', marginTop:'0.5rem' }}>
          Struttura attesa Excel: <code>Domanda</code>, <code>Risposta1..4</code>, <code>Corretta</code> (1..4).
        </p>
      </section>

      {/* Storico */}
      <section>
        <h3>Storico Quiz</h3>
        {history.length === 0 ? (
          <p style={{ color:'#666' }}>Nessun tentativo ancora registrato.</p>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ borderCollapse:'collapse', width:'100%' }}>
              <thead>
                <tr>
                  <th style={th}>Data</th>
                  <th style={th}>Quiz</th>
                  <th style={th}>Ora Inizio</th>
                  <th style={th}>Ora Fine</th>
                  <th style={th}>Durata</th>
                  <th style={th}>Domande</th>
                  <th style={th}>Apprese</th>
                  <th style={th}>Round</th>
                  <th style={th}>Timer</th>
                  <th style={th}>Utente</th>
                  <th style={th}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td style={td}>{h.data}</td>
                    <td style={td}>{h.quizName || '-'}</td>
                    <td style={td}>{h.oraInizio}</td>
                    <td style={td}>{h.oraFine}</td>
                    <td style={td}>{h.durata}</td>
                    <td style={td}>{h.domandeTotali}</td>
                    <td style={td}>{h.domandeConcluse}</td>
                    <td style={td}>{h.roundUsati}</td>
                    <td style={td}>{h.timerDescrizione}</td>
                    <td style={td}>{h.userEmail || '-'}</td>
                    <td style={td}>
                      <button
                        onClick={() => {
                          const quizData = localStorage.getItem(h.fileKey)
                          if (quizData) {
                            setQuizName(h.quizName)
                            setDomande(JSON.parse(quizData))
                            setInQuiz(true)
                          } else {
                            alert("Quiz non trovato in archivio locale.")
                          }
                        }}
                        style={{ marginRight: '0.5rem' }}
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => {
                          let nuovo = prompt("Modifica nome quiz:", h.quizName || "")
                          if (!nuovo) return
                          if (history.some((x, j) => j !== i && x.quizName === nuovo)) {
                            alert("Nome già usato. Scegli un altro.")
                            return
                          }
                          const newHistory = [...history]
                          newHistory[i] = { ...newHistory[i], quizName: nuovo }
                          setHistory(newHistory)
                          localStorage.setItem("quizHistory", JSON.stringify(newHistory))
                        }}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteHistoryEntry(i)}
                        style={{ color: 'red', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

const th = {
  textAlign: 'left',
  borderBottom: '1px solid #ddd',
  padding: '0.5rem'
}
const td = {
  borderBottom: '1px solid #eee',
  padding: '0.5rem'
}

export default Dashboard