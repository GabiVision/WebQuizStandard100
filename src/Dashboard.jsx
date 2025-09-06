import React, { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import axios from 'axios'
import Quiz from './Quiz'
import { supabase } from './supabaseClient'


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

  //per leggere i dati da Supabase:
  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('quiz_history')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Errore caricamento Supabase:", error)
        alert("Errore Supabase: " + error.message)   // 👈 qui
      } else {
        console.log("Dati Supabase:", data)
        alert("Record trovati: " + data.length)     // 👈 qui
        setHistory(data)
      }
    }

    fetchHistory()
  }, [])

const addTestRecord = async () => {
  const { error } = await supabase.from('quiz_history').insert([
    {
      quizName: "Test Supabase",
      data: new Date().toISOString().split("T")[0], // solo data
      oraInizio: "15:00",
      oraFine: "15:20",
      durata: "00:20:00",
      domandeTotali: 10,
      domandeConcluse: 10,
      roundUsati: 1,
      timerDescrizione: "Cronometro",
      utente: "PC"
    }
  ])

  if (error) {
    console.error("Errore inserimento Supabase:", error)
  } else {
    console.log("Record inserito con successo!")
  }
}
 

  // Nome quiz
  const [quizName, setQuizName] = useState("")

  // Opzioni random
  const [randomDomande, setRandomDomande] = useState(false)
  const [randomRisposte, setRandomRisposte] = useState(false)

  //useEffect(() => {
  //  const saved = localStorage.getItem('quizHistory')
  //  if (saved) {
  //    try {
  //      setHistory(JSON.parse(saved))
  //    } catch {}
  //  }
  //}, [])

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
    // Salva anche su Supabase
    const { error } = await supabase.from("quiz_files").insert([
      {
        quizName: name,
        questions: parsed
      }
    ])

    if (error) {
      console.error("Errore salvataggio quiz in Supabase:", error)
      alert("Errore salvataggio quiz in Supabase: " + error.message)
    }

    // Manteniamo anche il localStorage come backup locale
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
  //const handleQuizFinish = (summary) => {
  //  // salviamo nello storico
  //  appendHistory({
  //    ...summary,
  //    quizName,              // 👈 nuovo campo
  //    fileKey: `quizFile_${quizName}`,  // 👈 riferimento al JSON
  //    userEmail: userEmail || null,
  //    createdAt: new Date().toISOString()
  //  })
  //  setInQuiz(false)
  //}

  const handleQuizFinish = async (summary) => {
    // Prepara il record da salvare
    const record = {
      quizName,
      data: new Date().toISOString().split("T")[0],
      oraInizio: summary.oraInizio || "",
      oraFine: summary.oraFine || "",
      durata: summary.durata || "",
      domandeTotali: summary.domandeTotali || 0,
      domandeConcluse: summary.domandeConcluse || 0,
      roundUsati: summary.roundUsati || 0,
      timerDescrizione: summary.timerDescrizione || "",
      utente: userEmail || "Anonimo"
    }

    // Inserisci in Supabase
    const { data, error } = await supabase.from("quiz_history").insert([record]).select()

    if (error) {
      console.error("Errore inserimento Supabase:", error)
      alert("Errore salvataggio quiz: " + error.message)
    } else {
      console.log("Quiz salvato in Supabase:", data)
      // Aggiorna lo stato locale per vederlo subito in tabella
      setHistory(prev => [data[0], ...prev])
    }

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

// --------- Migrazione storico locale ---------- 
  const migrateLocalHistory = async () => {
    const saved = localStorage.getItem("quizHistory")
    if (!saved) {
      alert("Nessuno storico locale trovato.")
      return
    }

    let records
    try {
      records = JSON.parse(saved)
    } catch (e) {
      console.error("Errore parsing storico locale:", e)
      alert("Errore lettura storico locale")
      return
    }

    if (!Array.isArray(records) || records.length === 0) {
      alert("Storico locale vuoto.")
      return
    }

    const formatted = records.map(r => ({
      quizName: r.quizName,
      data: r.data,
      oraInizio: r.oraInizio,
      oraFine: r.oraFine,
      durata: r.durata,
      domandeTotali: r.domandeTotali,
      domandeConcluse: r.domandeConcluse,
      roundUsati: r.roundUsati,
      timerDescrizione: r.timerDescrizione,
      utente: r.userEmail || "Anonimo"
    }))

    const { data, error } = await supabase.from("quiz_history").insert(formatted).select()

    if (error) {
      console.error("Errore migrazione Supabase:", error)
      alert("Errore durante la migrazione: " + error.message)
    } else {
      console.log("Migrazione completata:", data)
      alert("Storico locale migrato con successo!")
      setHistory(prev => [...data, ...prev])
    }
  }

  // --------- Migrazione manuale da JSON copiato ---------- 
  const migrateFromJsonText = async () => {
    const jsonText = '[{"data":"2025-09-05","oraInizio":"18:03:40","oraFine":"18:07:22","durata":"00:03:41","domandeTotali":10,"domandeConcluse":10,"roundUsati":3,"timerDescrizione":"Cronometro crescente","quizName":"Metabolismo p.0003","fileKey":"quizFile_Metabolismo p.0003","userEmail":"1","createdAt":"2025-09-05T16:07:26.317Z"},{"data":"2025-09-05","oraInizio":"17:26:46","oraFine":"17:29:49","durata":"00:03:02","domandeTotali":8,"domandeConcluse":8,"roundUsati":4,"timerDescrizione":"Cronometro crescente","quizName":"Metabolismo p.0002","fileKey":"quizFile_Metabolismo p.0002","userEmail":"1","createdAt":"2025-09-05T15:30:06.240Z"},{"data":"2025-09-05","oraInizio":"17:22:44","oraFine":"17:25:19","durata":"00:02:35","domandeTotali":8,"domandeConcluse":8,"roundUsati":3,"timerDescrizione":"Cronometro crescente","quizName":"Metabolismo p.0002","fileKey":"quizFile_Metabolismo p.0002","userEmail":"1","createdAt":"2025-09-05T15:25:22.793Z"},{"data":"2025-09-05","oraInizio":"17:05:14","oraFine":"17:05:42","durata":"00:00:28","domandeTotali":8,"domandeConcluse":0,"roundUsati":1,"timerDescrizione":"Cronometro crescente","quizName":"Metabolismo p.0002","fileKey":"quizFile_Metabolismo p.0002","userEmail":"1","createdAt":"2025-09-05T15:05:50.559Z"},{"data":"2025-09-05","oraInizio":"17:02:52","oraFine":"17:04:49","durata":"00:01:57","domandeTotali":8,"domandeConcluse":8,"roundUsati":3,"timerDescrizione":"Cronometro crescente","quizName":"Metabolismo p.0002","fileKey":"quizFile_Metabolismo p.0002","userEmail":"1","createdAt":"2025-09-05T15:04:55.623Z"},{"data":"2025-09-05","oraInizio":"15:07:20","oraFine":"15:10:36","durata":"00:03:16","domandeTotali":8,"domandeConcluse":8,"roundUsati":3,"timerDescrizione":"Cronometro crescente","quizName":"Metabolismo p0002","userEmail":"1","createdAt":"2025-09-05T13:10:41.673Z"}]' // 👈 QUI il JSON che mi hai dato (tutto intero)

    let records
    try {
      records = JSON.parse(jsonText)
    } catch (e) {
      console.error("Errore parsing JSON:", e)
      alert("Errore nel testo JSON")
      return
    }

    const formatted = records.map(r => ({
      quizName: r.quizName,
      data: r.data,
      oraInizio: r.oraInizio,
      oraFine: r.oraFine,
      durata: r.durata,
      domandeTotali: r.domandeTotali,
      domandeConcluse: r.domandeConcluse,
      roundUsati: r.roundUsati,
      timerDescrizione: r.timerDescrizione,
      utente: r.userEmail || "Anonimo"
    }))

    const { data, error } = await supabase.from("quiz_history").insert(formatted).select()

    if (error) {
      console.error("Errore import JSON:", error)
      alert("Errore durante import: " + error.message)
    } else {
      console.log("Import da JSON completato:", data)
      alert("Import da JSON completato con successo!")
      setHistory(prev => [...data, ...prev])
    }
  }


// --------- Migrazione quizFile_* dal localStorage a Supabase ----------
  const migrateQuizFiles = async () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith("quizFile_"))

    if (keys.length === 0) {
      alert("Nessun quizFile_ trovato in localStorage.")
      return
    }

    let insertedCount = 0
    for (let k of keys) {
      try {
        const quizName = k.replace("quizFile_", "")
        const questions = JSON.parse(localStorage.getItem(k))

        // controlla se già presente su Supabase
        const { data: existing, error: checkError } = await supabase
          .from("quiz_files")
          .select("id")
          .eq("quizName", quizName)
          .maybeSingle()

        if (checkError) {
          console.error("Errore controllo esistenza:", checkError)
          continue
        }

        if (existing) {
          console.log(`Quiz ${quizName} già presente, salto inserimento.`)
          continue
        }

        const { error } = await supabase.from("quiz_files").insert([
          {
            quizName,
            questions
          }
        ])

        if (error) {
          console.error("Errore inserimento quiz:", error)
        } else {
          insertedCount++
          console.log(`Quiz ${quizName} inserito con successo.`)
        }

      } catch (e) {
        console.error("Errore parsing quizFile:", k, e)
      }
    }

    alert(`Migrazione completata! Quiz inseriti: ${insertedCount}`)
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


      <button onClick={migrateLocalHistory} style={{ marginBottom: '1rem' }}>
        ⬆️ Migra storico locale su Supabase
      </button>

      <button onClick={migrateFromJsonText} style={{ marginBottom: '1rem', background:'#ffa' }}>
        📥 Importa storico da JSON copiato
      </button>

      <button onClick={migrateQuizFiles} style={{ marginBottom: '1rem', background:'#aaf' }}>
        📤 Migra quizFile locali su Supabase
      </button>


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
                        onClick={async () => {
                          try {
                            // 1. tenta di caricare da Supabase
                            const { data, error } = await supabase
                              .from("quiz_files")
                              .select("questions")
                              .eq("quizName", h.quizName)
                              .maybeSingle()

                            if (error) {
                              console.error("Errore Supabase:", error)
                            }

                            if (data && data.questions) {
                              // trovato su Supabase
                              setQuizName(h.quizName)
                              setDomande(data.questions)
                              setInQuiz(true)
                              return
                            }

                            // 2. fallback: prova da localStorage
                            const quizData = localStorage.getItem(h.fileKey)
                            if (quizData) {
                              setQuizName(h.quizName)
                              setDomande(JSON.parse(quizData))
                              setInQuiz(true)
                            } else {
                              alert("Quiz non trovato né in Supabase né in locale.")
                            }
                          } catch (e) {
                            console.error("Errore apertura quiz:", e)
                            alert("Errore durante il caricamento del quiz.")
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
      <button onClick={addTestRecord} style={{ marginBottom: '1rem' }}>
        ➕ Aggiungi record di test
      </button>



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