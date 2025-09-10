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

  // Anteprima quiz
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewQuiz, setPreviewQuiz] = useState({ name: "", questions: [] })
  

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



// Carica la Libreria (quiz_files) al mount della Dashboard 09/09/2025
useEffect(() => {
  // se hai già definito reloadLibraryFromSupabase in alto, lo riusiamo
  reloadLibraryFromSupabase()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])





// aggiungi record di test
//const addTestRecord = async () => {
//  const { error } = await supabase.from('quiz_history').insert([
//    {
//      quizName: "Test Supabase",
//      data: new Date().toISOString().split("T")[0], // solo data
//      oraInizio: "15:00",
//      oraFine: "15:20",
//      durata: "00:20:00",
//      domandeTotali: 10,
//      domandeConcluse: 10,
//      roundUsati: 1,
//      timerDescrizione: "Cronometro",
//      utente: "PC"
//    }
//  ])
//
//  if (error) {
//    console.error("Errore inserimento Supabase:", error)
//  } else {
//    console.log("Record inserito con successo!")
//  }
//}
 
  // Nome quiz
  const [quizName, setQuizName] = useState("")

  // Opzioni random
  const [randomDomande, setRandomDomande] = useState(false)
  const [randomRisposte, setRandomRisposte] = useState(false)


  // Libreria quiz (quiz_files) 09/09/2025
  const [library, setLibrary] = useState([])
  const [libraryLoading, setLibraryLoading] = useState(false)

  //useEffect(() => {
  //  const saved = localStorage.getItem('quizHistory')
  //  if (saved) {
  //    try {
  //      setHistory(JSON.parse(saved))
  //    } catch {}
  //  }
  //}, [])

  //const appendHistory = (record) => {
  //  const newList = [record, ...history]
  //  setHistory(newList)
  //  localStorage.setItem('quizHistory', JSON.stringify(newList))
  //}

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

    // Manteniamo anche il localStorage come backup locale (Modif il 09/09/2025)
    //const fileKey = `quizFile_${name}`
    //localStorage.setItem(fileKey, JSON.stringify(parsed))

    //setQuizName(name)
    //setDomande(parsed)
    //setInQuiz(true)
    // script modificato con questo sotto

// === NOME QUIZ con scelta su conflitto ===
let rawName = prompt("Inserisci un nome per il quiz:")
if (!rawName) {
  alert("Nome quiz obbligatorio.")
  return
}
let cleanedName = rawName.trim()
if (!cleanedName) {
  alert("Nome quiz non valido.")
  return
}

// ciclo: se esiste già, chiedi se sovrascrivere o rinominare
while (true) {
  const { data: existing, error: checkErr } = await supabase
    .from("quiz_files")
    .select("id")
    .eq("quizName", cleanedName)
    .maybeSingle()

  if (checkErr) {
    console.error("Errore controllo esistenza quiz:", checkErr)
    alert("Errore durante il controllo nome quiz.")
    return
  }

  if (existing) {
    const overwrite = window.confirm(
      `Esiste già un quiz chiamato "${cleanedName}".\n\n` +
      `👉 Premi OK per SOVRASCRIVERE il contenuto del quiz esistente.\n` +
      `👉 Premi ANNULLA per inserire un NOME DIVERSO.`
    )
    if (overwrite) {
      break // usiamo questo nome e sovrascriviamo
    } else {
      const nuovo = window.prompt("Inserisci un nome diverso:")
      if (!nuovo) {
        alert("Operazione annullata.")
        return
      }
      cleanedName = nuovo.trim()
      if (!cleanedName) {
        alert("Nome non valido.")
        return
      }
      // ripete il while con il nuovo nome
      continue
    }
  } else {
    // nome libero
    break
  }
}

// === SALVA/AGGIORNA IN SUPABASE, SENZA AVVIARE IL QUIZ ===
try {
  const { error } = await supabase
    .from("quiz_files")
    .upsert(
      [{ quizName: cleanedName, questions: parsed }],
      { onConflict: "quizName" } // se esiste già, aggiorna
    )

  if (error) {
    console.error("Errore salvataggio quiz in Supabase:", error)
    alert("Errore salvataggio quiz in Supabase: " + (error.message || ""))
    return
  }

      // opzionale: mantieni una copia locale come backup + su supabase
      const fileKey = `quizFile_${cleanedName}`
      localStorage.setItem(fileKey, JSON.stringify(parsed))

      alert(`Quiz "${cleanedName}" caricato/aggiornato in Libreria (Supabase).`)

      // ⚠️ NON avviamo il quiz: niente setDomande / setInQuiz(true)
    } catch (e) {
      console.error(e)
      alert("Errore imprevisto nel salvataggio del quiz.")
    }


  }

//

  // --------- Caricamento domande via API (backend Flask) ----------
  const handleLoadFromApi = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:5000/domande')
      if (Array.isArray(res.data) && res.data.length) {
          // 👇 chiedi nome quiz
        let name = window.prompt("Inserisci un nome per il quiz:")
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
  // --------- Elimina riga dallo STORICO (quiz_history su Supabase) ----------
  const deleteHistoryEntry = async (index) => {
    const row = history[index]
    if (!row) return

    const ok = window.confirm("Vuoi eliminare questo record dallo storico condiviso?")
    if (!ok) return

    try {
      // elimina riga storico su Supabase (preferisci per id, altrimenti fallback per campi chiave)
      let query = supabase.from('quiz_history').delete()

      if (row.id) {
        query = query.eq('id', row.id)                   // percorso standard
      } else {
        // fallback nel raro caso non avessi l'id nel record già in memoria
        query = query
          .eq('quizName', row.quizName || row.quizname || '')
          .eq('data', row.data || '')
          .eq('oraInizio', row.oraInizio || '')
      }

      const { error } = await query

      if (error) {
        console.error("Errore cancellazione Supabase:", error)
        window.alert("Errore durante la cancellazione su Supabase: " + (error.message || ""))
        return
      }

      // aggiorna subito la UI locale
      setHistory(prev => prev.filter((_, i) => i !== index))

      // se hai la funzione di reload, puoi richiamarla per essere 100% allineato
      if (typeof reloadHistoryFromSupabase === 'function') {
        await reloadHistoryFromSupabase()
      }

      // (opzionale) se avevi vecchio localStorage, evitiamo di ri-sincronizzarlo:
      // window.localStorage.setItem('quizHistory', JSON.stringify(history.filter((_, i) => i !== index)))
    } catch (e) {
      console.error("Errore imprevisto cancellazione:", e)
      window.alert("Errore imprevisto durante la cancellazione.")
    }
  }


  // Rinomina un record dello STORICO (quiz_history) su Supabase 09/09/25
  const renameHistoryEntry = async (index) => {
    const row = history[index]
    if (!row) return

    let nuovo = window.prompt("Modifica nome quiz:", row.quizName || "")
    if (nuovo == null) return // annullato
    nuovo = nuovo.trim()
    if (!nuovo) { window.alert("Nome non valido."); return }

    // Se uguale non fare nulla
    if (nuovo === (row.quizName || "")) return

    // ✅ Mantengo la tua regola: nome non deve essere già usato in altre righe dello storico
    if (history.some((x, j) => j !== index && (x.quizName || "") === nuovo)) {
      window.alert("Nome già usato. Scegli un altro.")
      return
    }

    try {
      // 1) 🔄 Aggiorna su Supabase (fonte condivisa)
      const { error } = await supabase
        .from("quiz_history")
        .update({ quizName: nuovo })
        .eq("id", row.id)

      if (error) {
        console.error("Errore rename storico Supabase:", error)
        window.alert("Errore durante la rinomina su Supabase: " + (error.message || ""))
        return
      }

      // ✅ Aggiorna subito la UI locale (come facevi tu)
      const newHistory = history.map((r, i) => i === index ? { ...r, quizName: nuovo } : r)
    setHistory(newHistory)

      // 3) 🔁 Backup locale (come vuoi tu)
      window.localStorage.setItem("quizHistory", JSON.stringify(newHistory))

    } catch (e) {
      console.error("Errore imprevisto rename storico:", e)
      window.alert("Errore imprevisto durante la rinomina.")
    }
  }





// Rileggi lo storico da Supabase on-demand
  const reloadHistoryFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_history')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Errore reload storico:", error)
        window.alert("Errore reload storico: " + (error.message || ""))
        return
      }
      setHistory(data)
    } catch (e) {
      console.error("Errore imprevisto reload storico:", e)
      window.alert("Errore imprevisto durante reload storico.")
    }
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

  // --------- Anteprima: carica domande da Supabase e mostra overlay ----------
  const openPreview = async (h) => {
    try {
      const { data, error } = await supabase
        .from("quiz_files")
        .select("questions")
        .eq("quizName", h.quizName)
        .maybeSingle()

      if (error) {
        console.error("Errore Supabase (anteprima):", error)
        alert("Impossibile aprire l’anteprima.")
        return
      }
      if (!data || !data.questions?.length) {
        alert("Nessuna domanda trovata per questo quiz.")
        return
      }

      setPreviewQuiz({ name: h.quizName, questions: data.questions })
      setPreviewOpen(true)
    } catch (e) {
      console.error("Errore anteprima:", e)
      alert("Errore durante l’anteprima.")
    }
  }


  // Rileggi libreria quiz da Supabase 09/09/25
  const reloadLibraryFromSupabase = async () => {
    try {
      setLibraryLoading(true)
      const { data, error } = await supabase
        .from('quiz_files')
        .select('id, quizName, created_at, questions')   // 👈 aggiunto id 09/09/25
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Errore caricamento quiz_files:', error)
        window.alert('Errore libreria: ' + (error.message || ''))
        return
      }
      // normalizza: domandeCount per colonna
      const rows = (data || []).map(r => ({
        id: r.id,                                          // 👈 aggiunto 09/09/25
        quizName: r.quizName,
        created_at: r.created_at,
        questions: r.questions,
        domandeCount: Array.isArray(r.questions) ? r.questions.length : 0
      }))
      setLibrary(rows)
    } catch (e) {
      console.error('Errore libreria:', e)
      window.alert('Errore imprevisto durante la lettura della libreria.')
    } finally {
      setLibraryLoading(false)
    }
  }

  // Elimina un quiz dalla Libreria (quiz_files) – 09/09/25 robusto: per id o per quizName
  const deleteLibraryQuiz = async (index) => {
    const row = library[index]
    if (!row) return

    const ok = window.confirm(
      `Vuoi eliminare definitivamente il quiz "${row.quizName}" dalla Libreria condivisa?`
    )
    if (!ok) return

    try {
      let query = supabase.from('quiz_files').delete()

      if (row.id) {
        // percorso standard: elimina per UUID
        query = query.eq('id', row.id)
      } else {
        // fallback sicuro se l'id non è presente nello stato
        query = query.eq('quizName', row.quizName)
      }

      const { error } = await query

      if (error) {
        console.error('Errore cancellazione quiz_files:', error)
        window.alert('Errore durante la cancellazione: ' + (error.message || ''))
        return
      }

      // Aggiorna UI locale
      setLibrary(prev => prev.filter((_, i) => i !== index))
      window.alert(`Quiz "${row.quizName}" eliminato.`)
    } catch (e) {
      console.error('Errore imprevisto cancellazione libreria:', e)
      window.alert('Errore imprevisto durante la cancellazione.')
    }
  }




  // Rinomina un quiz nella Libreria (quiz_files) con gestione conflitto
  const renameLibraryQuiz = async (index) => {
    const row = library[index]
    if (!row) return

    let nuovo = window.prompt("Nuovo nome per il quiz:", row.quizName)
    if (nuovo == null) return // annullato
    nuovo = nuovo.trim()
    if (!nuovo) { window.alert("Nome non valido."); return }

    // Se non cambia, niente da fare
    if (nuovo === row.quizName) return

    try {
      // Controllo se esiste già un quiz con quel nome
      const { data: existing, error: checkErr } = await supabase
        .from("quiz_files")
        .select("id")
        .eq("quizName", nuovo)
        .maybeSingle()

      if (checkErr) {
        console.error("Errore controllo nome:", checkErr)
        window.alert("Errore durante il controllo del nome.")
        return
      }

      if (existing && existing.id !== row.id) {
        // Conflitto: esiste un altro quiz con quel nome
        const overwrite = window.confirm(
          `Esiste già un quiz chiamato "${nuovo}".\n\n` +
          `👉 OK: SOVRASCRIVI quel quiz con le domande di "${row.quizName}"\n` +
          `👉 Annulla: scegli un NOME DIVERSO`
        )
        if (!overwrite) return

        // 1) Upsert: scrive le domande correnti con il nuovo nome (aggiorna il record esistente)
        const { error: upErr } = await supabase
          .from("quiz_files")
          .upsert(
            [{ quizName: nuovo, questions: row.questions }],
            { onConflict: "quizName" }
          )

        if (upErr) {
          console.error("Errore upsert su quiz esistente:", upErr)
          window.alert("Errore durante la sovrascrittura: " + (upErr.message || ""))
          return
        }

        // 2) Elimina il record attuale (vecchio nome)
        const { error: delErr } = await supabase
          .from("quiz_files")
          .delete()
          .eq("id", row.id)

        if (delErr) {
          console.error("Errore eliminazione vecchio record:", delErr)
          window.alert("Errore durante la pulizia del vecchio quiz: " + (delErr.message || ""))
          return
        }

        // Aggiorna UI
        await reloadLibraryFromSupabase()
        window.alert(`Quiz rinominato in "${nuovo}" sovrascrivendo quello esistente.`)
        return
      }

      // Nessun conflitto: basta aggiornare il nome del record corrente
      const { error: updErr } = await supabase
        .from("quiz_files")
        .update({ quizName: nuovo })
        .eq("id", row.id)

      if (updErr) {
        console.error("Errore rename:", updErr)
        window.alert("Errore durante la rinomina: " + (updErr.message || ""))
        return
      }

      // Aggiorna UI locale velocemente senza refetch completo
      setLibrary(prev => prev.map((r, i) => i === index ? { ...r, quizName: nuovo } : r))
      window.alert(`Quiz rinominato in "${nuovo}".`)
    } catch (e) {
      console.error("Errore imprevisto rename:", e)
      window.alert("Errore imprevisto durante la rinomina.")
    }
  }





  // Diagnostica: verifica connessione/permessi su entrambe le tabelle
  const diagnoseSupabase = async () => {
    try {
      console.log("Diagnostica: inizio…")

      const ping1 = await supabase.from('quiz_history').select('id').limit(1)
      console.log("quiz_history:", ping1)

      const ping2 = await supabase.from('quiz_files').select('id').limit(1)
      console.log("quiz_files:", ping2)

      const mk = (res) => res.error ? `❌ ${res.error.message}` : `✅ ok (${(res.data||[]).length} righe lette)`

      window.alert(
        "Diagnostica Supabase\n\n" +
        `quiz_history: ${mk(ping1)}\n` +
        `quiz_files:  ${mk(ping2)}\n`
      )
    } catch (e) {
      console.error("Diagnostica: exception", e)
      window.alert("Diagnostica: eccezione JS: " + e.message)
    }
  }



  // Diagnostica solo per quiz_files
  const diagnoseLibrary = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_files')
        .select('*')
        .limit(5)

      if (error) {
        console.error("Errore quiz_files:", error)
        window.alert("Errore quiz_files: " + (error.message || ""))
        return
      }

      console.log("quiz_files (prime 5 righe):", data)
      window.alert(
        data && data.length
          ? `quiz_files contiene ${data.length} record (vedi console per dettagli)`
          : "quiz_files è vuota"
      )
    } catch (e) {
      console.error("Diagnostica quiz_files exception:", e)
      window.alert("Diagnostica quiz_files exception: " + e.message)
    }
  }


  // --------- UI ----------
  // --------- UI ----------
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

      {/* PULSANTI BUTTONS */}
      {/* Libreria Quiz (fonte: quiz_files) */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3>Libreria Quiz</h3>
          <button onClick={diagnoseSupabase} style={{ marginBottom:'0.75rem' }}>
            🧪 Diagnostica Supabase
          </button>
          <button onClick={reloadLibraryFromSupabase}>
            {libraryLoading ? 'Carico…' : '🔄 Aggiorna Libreria'}
          </button>
        </div>

          <button onClick={diagnoseLibrary} style={{ marginBottom:'0.75rem' }}>
            🧪 Diagnostica Libreria
          </button>

        {library.length === 0 ? (
          <p style={{ color:'#666' }}>
            Nessun quiz in libreria. Carica un file Excel per aggiungerne, poi premi “🔄 Aggiorna Libreria”.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse:'collapse', width:'100%' }}>
              <thead>
                <tr>
                  <th style={th}>Data</th>
                  <th style={th}>Quiz</th>
                  <th style={th}>Domande</th>
                  <th style={th}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {library.map((q, i) => (
                  <tr key={i}>
                    <td style={td}>{q.created_at?.slice(0,10) || '-'}</td>
                    <td style={td}>{q.quizName}</td>
                    <td style={td}>{q.domandeCount}</td>
                    <td style={td}>
                      {/* Anteprima 👁️ */}
                      <button
                        onClick={() => {
                          if (!q.questions?.length) { window.alert('Nessuna domanda.'); return }
                          setPreviewQuiz({ name: q.quizName, questions: q.questions })
                          setPreviewOpen(true)
                        }}
                        title="Anteprima"
                        style={{ marginRight: '0.5rem' }}
                      >
                        👁️
                      </button>

                      {/* Start ▶️ */}
                      <button
                        onClick={() => {
                          if (!q.questions?.length) { window.alert('Nessuna domanda.'); return }
                          setQuizName(q.quizName)
                          setDomande(q.questions)
                          setInQuiz(true)
                        }}
                        title="Avvia quiz"
                        style={{ marginRight: '0.5rem' }}
                      >
                        ▶️
                      </button>

                      {/* Rinomina ✏️ */}
                      <button
                        onClick={() => renameLibraryQuiz(i)}
                        title="Rinomina quiz"
                        style={{ marginRight: '0.5rem' }}
                      >
                        ✏️
                      </button>


                      {/* Elimina 🗑️ */}
                      <button
                        onClick={() => deleteLibraryQuiz(i)}
                        title="Elimina quiz dalla Libreria"
                        style={{ color:'red' }}
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
                        onClick={() => openPreview(h)}
                        title="Anteprima"
                        style={{ marginRight: '0.5rem' }}
                      >
                        👁️
                      </button>

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
                        onClick={() => renameHistoryEntry(i)}
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


      {/* Aggiungi record di test 
      <button onClick={addTestRecord} style={{ marginBottom: '1rem' }}>
         ➕ Aggiungi record di test
      </button> */}


      {/* overlay dell’anteprima (modale semplice) */}
      {previewOpen && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999
        }}>
          <div style={{
            width:'min(900px, 95vw)', maxHeight:'85vh', overflow:'auto',
            background:'#fff', borderRadius:'12px', padding:'1rem 1.25rem', boxShadow:'0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
              <h3 style={{ margin:0 }}>Anteprima — {previewQuiz.name}</h3>
              <button onClick={() => setPreviewOpen(false)} style={{ fontSize:'1.1rem' }}>✖</button>
            </div>
            <hr/>

            <div style={{ display:'grid', gap:'0.75rem', marginTop:'0.75rem' }}>
              {previewQuiz.questions.map((q, idx) => (
                <div key={q.id ?? idx} style={{ border:'1px solid #eee', borderRadius:'10px', padding:'0.75rem' }}>
                  <div style={{ fontWeight:600, marginBottom:'0.5rem' }}>
                    {idx + 1}. {q.domanda}
                  </div>
                  <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:'0.35rem' }}>
                    {q.risposte.map((r, i) => {
                      const isCorrect = (i + 1) === q.corretta
                      return (
                        <li key={i} style={{
                          padding:'0.4rem 0.6rem',
                          border:'1px solid #eee',
                          borderRadius:'8px',
                          background: isCorrect ? '#eafaea' : '#fafafa',
                          display:'flex', alignItems:'center', gap:'0.5rem'
                        }}>
                          <span style={{ width:20, textAlign:'center' }}>
                            {isCorrect ? '✅' : '•'}
                          </span>
                          <span>{r}</span>
                          {isCorrect && <span style={{ marginLeft:'auto', fontSize:'0.85rem', color:'#2e7d32' }}>Corretta</span>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


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