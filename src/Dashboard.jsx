import React, { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import axios from 'axios'
import Quiz from './Quiz'
import { supabase } from './supabaseClient'

function formatHMS(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return '-'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}


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

  //states per checkbox mostra/nascondi libreria e storico
  const [showLibrary, setShowLibrary] = useState(true)
  const [showHistory, setShowHistory] = useState(true)

  // Timer config
  const [timerMode, setTimerMode] = useState('up') // 'up' | 'down'
  const [countdownMinutes, setCountdownMinutes] = useState(10)

  // Storico
  const [history, setHistory] = useState([])
  //const [historyLoading, setHistoryLoading] = useState(false)

  // Selezione multipla — Storico
  const [selectedHist, setSelectedHist] = useState([])
  const [histAllSelected, setHistAllSelected] = useState(false)

  const toggleRowHist = (id) => {
    setSelectedHist(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAllHist = () => {
    if (histAllSelected) {
      setSelectedHist([])
      setHistAllSelected(false)
    } else {
      const allIds = (history || []).map(h => h.id)
      setSelectedHist(allIds)
      setHistAllSelected(true)
    }
  }


  // Stato per la modale Statistiche singolo quiz
  const [statsModalOpen, setStatsModalOpen] = useState(false)
  const [statsModalRows, setStatsModalRows] = useState([])
  //const [statsModalTitle, setStatsModalTitle] = useState('')

// Stati separati per ordinamento e filtri della MODALE statistiche
  const [modalSort, setModalSort] = useState({ key: 'data', dir: 'desc' })
  const [modalFilters, setModalFilters] = useState({
    data: '', quizName: '', oraInizio: '', oraFine: '', durata: '',
    domandeTotali: '', domandeConcluse: '', roundUsati: '', timerDescrizione: '', utente: ''
  })


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

  // Selezione multipla — Libreria
  const [selectedLib, setSelectedLib] = useState([])
  const [libAllSelected, setLibAllSelected] = useState(false)

  const toggleRowLib = (id) => {
    setSelectedLib(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAllLib = () => {
    if (libAllSelected) {
      setSelectedLib([])
      setLibAllSelected(false)
    } else {
      const allIds = (library || []).map(q => q.id)
      setSelectedLib(allIds)
      setLibAllSelected(true)
    }
  }


  const [statsMap, setStatsMap] = useState({})


  // Stato per ordinamento e filtri Libreria  10/09/2025 e 15/09/25
  const [libSort, setLibSort] = useState({ key: 'created_at', dir: 'desc' })
  const [libFilters, setLibFilters] = useState({ 
    quizName: '', 
    created_at: '', 
    domandeCount: '',
    attempts: '',
    correct_pct: '',
    best_time_sec: '', 
  })


  // Stato per ordinamento e filtri Storico  10/09/2025 e 15/09/25
  const [histSort, setHistSort] = useState({ key: 'data', dir: 'desc' })
  const [histFilters, setHistFilters] = useState({
    data: '',
    quizName: '',
    oraInizio: '',
    oraFine: '',
    durata: '',
    domandeTotali: '',
    domandeConcluse: '',
    roundUsati: '',
    timerDescrizione: '',
    utente: ''
  })




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



  //caricamento file excel multipli e senza estensione  // 👈 10/09/25
  // Estrae il nome base senza estensione
  const getBaseName = (filename) => {
    if (!filename) return ''
    const lastDot = filename.lastIndexOf('.')
    return lastDot > 0 ? filename.slice(0, lastDot) : filename
  }

  // Nuovo handler multi-file
  const handleExcelFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return

    // se 1 solo file → flusso come prima ma con nome di default = nome file
    if (fileList.length === 1) {
      await handleSingleExcel(fileList[0])
      return
    }

    // multi-upload: processiamo in sequenza, ogni file prende il nome file (default)
    let ok = 0, fail = 0
    for (const file of fileList) {
      const res = await handleSingleExcel(file, { forceDefaultName:true })
      if (res) ok++; else fail++;
    }
    alert(`Import completato.\nCaricati: ${ok}\nErrori: ${fail}`)
    await reloadLibraryFromSupabase()
  }

  // Elabora un singolo file Excel → salva in quiz_files con nome (default o modificabile)
  const handleSingleExcel = async (file, opts = {}) => {
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const parsed = rows
        .map((r, idx) => {
          const domanda = r.Domanda?.toString().trim()
          const r1 = r.Risposta1?.toString().trim()
          const r2 = r.Risposta2?.toString().trim()
          const r3 = r.Risposta3?.toString().trim()
          const r4 = r.Risposta4?.toString().trim()
          const correttaNum = Number(r.Corretta)
          if (!domanda || !r1 || !r2 || !r3 || !r4 || ![1,2,3,4].includes(correttaNum)) return null
          return { id: idx + 1, domanda, risposte: [r1, r2, r3, r4], corretta: correttaNum }
        })
        .filter(Boolean)

      if (!parsed.length) {
        alert(`"${file.name}": Excel non valido o vuoto.`)
        return false
      }

      // Nome default = nome file senza estensione
      let cleanedName = getBaseName(file.name).trim()

      if (!opts.forceDefaultName) {
        // Chiedi se mantenere il nome file o inserire manualmente
        const useDefault = window.confirm(
          `Usare il nome del file come nome quiz?\n\nProposto: "${cleanedName}"\n\nOK = usa questo nome\nAnnulla = inserisci manualmente`
        )
        if (!useDefault) {
          const manual = window.prompt("Inserisci il nome del quiz:", cleanedName)
          if (!manual) { alert("Operazione annullata."); return false }
          cleanedName = manual.trim()
          if (!cleanedName) { alert("Nome non valido."); return false }
        }
      }

      // Controllo conflitti + upsert
      while (true) {
        const { data: existing, error: checkErr } = await supabase
          .from("quiz_files")
          .select("id")
          .eq("quizName", cleanedName)
          .maybeSingle()
        if (checkErr) { alert("Errore controllo nome quiz."); return false }

        if (existing) {
          const overwrite = window.confirm(
            `Esiste già "${cleanedName}".\n\nOK = SOVRASCRIVI\nAnnulla = scegli un altro nome`
          )
          if (overwrite) break
          const nuovo = window.prompt("Nuovo nome quiz:", cleanedName + " (2)")
          if (!nuovo) { alert("Operazione annullata."); return false }
          cleanedName = nuovo.trim()
          if (!cleanedName) { alert("Nome non valido."); return false }
          continue
        } else break
      }

      const { error } = await supabase
        .from("quiz_files")
        .upsert([{ quizName: cleanedName, questions: parsed }], { onConflict: "quizName" })

      if (error) {
        console.error("Errore salvataggio quiz:", error)
        alert(`Errore salvataggio "${cleanedName}": ` + (error.message || ""))
        return false
      }

      localStorage.setItem(`quizFile_${cleanedName}`, JSON.stringify(parsed))
      console.log(`Quiz "${cleanedName}" caricato/aggiornato.`)
      return true
    } catch (e) {
      console.error(e)
      alert(`Errore import di "${file?.name || 'file'}"`)
      return false
    }
  }


  



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

      // Recupera l'id del quiz da quiz_files
    let quiz_id = null
    try {
      const { data: qrow } = await supabase
        .from("quiz_files")
        .select("id")
        .eq("quizName", quizName)
        .maybeSingle()
      quiz_id = qrow?.id || null
    } catch (e) {
      console.error("Errore recupero quiz_id:", e)
    }



    // Prepara il record da salvare
    const record = {
      quiz_id,
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
      const { data: files, error } = await supabase
        .from('quiz_files')
        .select('id, quizName, created_at, questions')   // 👈 aggiunto id 09/09/25
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Errore caricamento quiz_files:', error)
        window.alert('Errore libreria: ' + (error.message || ''))
        return
      }

      // 👇 nuova query per leggere le statistiche
      const { data: stats, error: e2 } = await supabase
        .from('quiz_stats')
        .select('*')
      if (e2) {
        console.error('Errore caricamento quiz_stats:', e2)
        window.alert('Errore statistiche: ' + (e2.message || ''))
      }

      const map = {}
      ;(stats || []).forEach(s => { map[s.quiz_id] = s })
      setStatsMap(map)




      // normalizza: domandeCount per colonna
  const rows = (files || []).map(r => {
    const st = map[r.id] || {}
    return {
      id: r.id,
      quizName: r.quizName,
      created_at: r.created_at,
      questions: r.questions,
      domandeCount: Array.isArray(r.questions) ? r.questions.length : 0,
      attempts: Number(st.attempts ?? 0),              // 👈 forza numero
      correct_pct: Number(st.correct_pct ?? 0),        // 👈 forza numero
      best_time_sec: Number(st.best_time_sec ?? 0),    // 👈 forza numero
    }
  })
      
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


  const [freeAnswerMode, setFreeAnswerMode] = useState(false)
  const [freeAnswerThreshold, setFreeAnswerThreshold] = useState(0.85) // soglia similitudine 0..1

  // --------- UI ----------
  // --------- UI ----------
  // --------- UI ----------
  // renderizza il quiz
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
          freeAnswerMode={freeAnswerMode}             // 👈 nuovo prop
          freeAnswerThreshold={freeAnswerThreshold}   // 👈 nuovo prop
        />
      </div>
    )
  }



 // Applica filtri colonne e ordinamento alla Libreria 10/09/2025
// Libreria filtrata e ordinata 12/09/2025
// Libreria filtrata e ordinata 12/09/2025 - FIX per statistiche
  const libraryFilteredSorted = library
    .filter(r => {
      const st = statsMap[r.id] || {} // 👈 aggiungi le statistiche qui nel filtro
      const f1 = libFilters.quizName ? (r.quizName||'').toLowerCase().includes(libFilters.quizName.toLowerCase()) : true
      const f2 = libFilters.created_at ? (r.created_at||'').slice(0,10).includes(libFilters.created_at) : true
      const f3 = libFilters.domandeCount ? String(r.domandeCount).includes(libFilters.domandeCount) : true
      const f4 = libFilters.attempts ? String(st.attempts || 0).includes(libFilters.attempts) : true // 👈 FIX: usa st.attempts
      const f5 = libFilters.correct_pct ? String(st.correct_pct || 0).includes(libFilters.correct_pct) : true // 👈 FIX: usa st.correct_pct
      const f6 = libFilters.best_time_sec ? String(st.best_time_sec || 0).includes(libFilters.best_time_sec) : true // 👈 FIX: usa st.best_time_sec
      return f1 && f2 && f3 && f4 && f5 && f6
    })
    .sort((a,b) => {
      const { key, dir } = libSort
      if (!key) return 0
      
      // 👈 FIX: per le colonne delle statistiche, prendi i dati da statsMap
      let va, vb
      if (key === 'attempts') {
        va = (statsMap[a.id] || {}).attempts || 0
        vb = (statsMap[b.id] || {}).attempts || 0
      } else if (key === 'correct_pct') {
        va = (statsMap[a.id] || {}).correct_pct || 0
        vb = (statsMap[b.id] || {}).correct_pct || 0
      } else if (key === 'best_time_sec') {
        va = (statsMap[a.id] || {}).best_time_sec || 0
        vb = (statsMap[b.id] || {}).best_time_sec || 0
      } else {
        // per le altre colonne usa il comportamento originale
        va = a[key]
        vb = b[key]
      }
      
      if (va == null && vb != null) return dir==='asc' ? -1 : 1
      if (va != null && vb == null) return dir==='asc' ? 1 : -1
      if (va == null && vb == null) return 0
      if (typeof va === 'number' && typeof vb === 'number') {
        return dir==='asc' ? va - vb : vb - va
      }
      return dir==='asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
    })

    // Helper per header con click ordinamento libreria 10/09/2025
    const headerCell = (label, key, width) => (
      <th
        style={{ ...th, width: width || 'auto' }}   // 👈 aggiunto come in headerCellHistory
        onClick={() => {
          setLibSort(s => {
            if (s.key !== key) return { key, dir: 'asc' }
            return { key, dir: s.dir === 'asc' ? 'desc' : (s.dir === 'desc' ? null : 'asc') }
          })
        }}
      >
        {label}{' '}
        {libSort.key === key ? (libSort.dir === 'asc' ? '↑' : (libSort.dir === 'desc' ? '↓' : '')) : ''}
      </th>
    )


  // Applica filtri e ordinamento allo Storico  10/09/2025
  const historyFilteredSorted = history
    .filter(r => {
      const f = histFilters
      const match = (val, filter) =>
        !filter || (val || '').toString().toLowerCase().includes(filter.toLowerCase())
      return (
        match(r.data, f.data) &&
        match(r.quizName, f.quizName) &&
        match(r.oraInizio, f.oraInizio) &&
        match(r.oraFine, f.oraFine) &&
        match(r.durata, f.durata) &&
        match(r.domandeTotali, f.domandeTotali) &&
        match(r.domandeConcluse, f.domandeConcluse) &&
        match(r.roundUsati, f.roundUsati) &&
        match(r.timerDescrizione, f.timerDescrizione) &&
        match(r.utente || r.userEmail, f.utente)
      )
    })
    .sort((a, b) => {
      const { key, dir } = histSort
      if (!key) return 0
      const va = a[key], vb = b[key]
      if (va == null && vb != null) return dir === 'asc' ? -1 : 1
      if (va != null && vb == null) return dir === 'asc' ? 1 : -1
      if (va == null && vb == null) return 0
      if (va < vb) return dir === 'asc' ? -1 : 1
      if (va > vb) return dir === 'asc' ? 1 : -1
      return 0
    })

  // Helper per header della tabella Storico  10/09/2025
  const headerCellHistory = (label, key, width) => (
    <th
      style={{ ...th, width: width || 'auto' }}
      onClick={()=>{
        setHistSort(s => {
          if (s.key !== key) return { key, dir:'asc' }
          return { key, dir: s.dir==='asc' ? 'desc' : (s.dir==='desc' ? null : 'asc') }
        })
      }}
    >
      {label} {histSort.key===key ? (histSort.dir==='asc'?'↑':(histSort.dir==='desc'?'↓':'')) : ''}
    </th>
  )

      // Converte "HH:MM:SS" in secondi
      function parseDuration(durata) {
        if (!durata) return null
        const parts = durata.split(':').map(Number)
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
        if (parts.length === 2) return parts[0] * 60 + parts[1]
        return parts[0] || 0
      }



  // nella LIbreria
  // Colore graduale per % Esecuzioni corrette (0 = rosso, 100 = verde)
  function getPercentColor(pct) {
    if (pct == null) return 'transparent'
    const val = Math.max(0, Math.min(100, pct)) / 100 // normalizza 0..1
    const r = Math.round(255 * (1 - val))   // da rosso a verde
    const g = Math.round(255 * val)
    return `rgb(${r},${g},0)`
  }

  function getPercentTextColor(pct) {
    if (pct == null) return 'inherit'
    return pct < 50 ? 'white' : 'black'
  }



  // nella modale    
  // Calcola colore graduale rosso ↔ verde solo per esecuzioni complete
  function getDurationColor(durata, rows) {
    const values = rows
      .filter(r => r.domandeTotali === r.domandeConcluse)
      .map(r => parseDuration(r.durata))
      .filter(v => v != null)

    if (values.length === 0) return 'transparent'

    const min = Math.min(...values)
    const max = Math.max(...values)
    const val = parseDuration(durata)

    if (val == null) return 'transparent'
    if (max === min) return 'lightgreen'

    const ratio = (val - min) / (max - min) // 0 = verde, 1 = rosso
    const r = Math.round(255 * ratio)
    const g = Math.round(255 * (1 - ratio))
    return `rgb(${r},${g},0)`
  }

  function getDurationTextColor(durata, rows) {
    const values = rows
      .filter(r => r.domandeTotali === r.domandeConcluse)
      .map(r => parseDuration(r.durata))
      .filter(v => v != null)

    if (values.length === 0) return 'inherit'

    const min = Math.min(...values)
    const max = Math.max(...values)
    const val = parseDuration(durata)

    if (val == null) return 'inherit'
    if (max === min) return 'black'

    const ratio = (val - min) / (max - min) // 0 = verde, 1 = rosso
    return ratio > 0.5 ? 'white' : 'black'
  }

// Helper per header della tabella MODALE (separato dallo storico)
  const headerCellModal = (label, key, width) => (
    <th
      style={{ ...th, width: width || 'auto' }}
      onClick={()=>{
        setModalSort(s => {
          if (s.key !== key) return { key, dir:'asc' }
          return { key, dir: s.dir==='asc' ? 'desc' : (s.dir==='desc' ? null : 'asc') }
        })
      }}
    >
      {label} {modalSort.key===key ? (modalSort.dir==='asc'?'↑':(modalSort.dir==='desc'?'↓':'')) : ''}
    </th>
  )




  //return principale o secondo (BOH?) della dashboard
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
              accept=".xlsx,.xls, xlsm" // 👈 modifica del 10/09/25
              multiple                  // 👈 modifica del 10/09/25
              style={{ display:'none' }}
              //onChange={(e) => handleExcelFiles(e.target.files?.[0])} // 👈 modifica del 10/09/25
              onChange={(e) => handleExcelFiles(e.target.files)} // 👈 2a modifica del 10/09/25
            />
          </label>

          <button onClick={handleLoadFromApi}>🌐 Usa API backend</button>
      


        {/* Pulsanti ON OFF random */}
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
          
          {/* Pulsante ON OFF nascondi risposte */}
          <button
            onClick={() => setFreeAnswerMode(prev => !prev)}
            style={{ background: freeAnswerMode ? '#4caf50' : '#ccc', padding:'0.5rem 1rem', borderRadius:'6px' }}
            title="Modalità risposta aperta (nasconde opzioni)"
          >
            Risposta aperta {freeAnswerMode ? '📝 ON' : '✖ OFF'}
          </button>

          {freeAnswerMode && (
            <label title="Soglia di similitudine per considerare una risposta corretta">
              Soglia:{' '}
              <input
                type="number"
                step="0.01"
                min="0.5" max="1"
                value={freeAnswerThreshold}
                onChange={(e) => setFreeAnswerThreshold(Math.min(1, Math.max(0.5, Number(e.target.value)||0.85)))}
                style={{ width: '80px' }}
              />
            </label>
          )}
        </div>


        <p style={{ color:'#666', marginTop:'0.5rem' }}>
          Struttura attesa Excel: <code>Domanda</code>, <code>Risposta1..4</code>, <code>Corretta</code> (1..4).
        </p>
      </section>


      {/* PULSANTI migrazione e diagnostica */}

      <button onClick={migrateLocalHistory} style={{ marginBottom: '1rem' }}>
        ⬆️ Migra storico locale su Supabase
      </button>

      <button onClick={migrateFromJsonText} style={{ marginBottom: '1rem', background:'#ffa' }}>
        📥 Importa storico da JSON copiato
      </button>

      <button onClick={migrateQuizFiles} style={{ marginBottom: '1rem', background:'#aaf' }}>
        📤 Migra quizFile locali su Supabase
      </button>

      <button onClick={diagnoseSupabase} style={{ marginBottom:'0.75rem' }}>
        🧪 Diagnostica Supabase
      </button>

      <button onClick={diagnoseLibrary} style={{ marginBottom:'0.75rem' }}>
        🧪 Diagnostica Libreria
      </button>





      {/* PULSANTI BUTTONS */}
      {/* Libreria Quiz (fonte: quiz_files) */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3>
            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showLibrary}
                onChange={() => setShowLibrary(prev => !prev)}
                style={{ marginRight: '0.5rem' }}
              />
              Libreria Quiz
            </label>
          </h3>
        </div>


        {/* TABELLA LIBRERIA */}
    {showLibrary && (
      <>
        {library.length === 0 ? (
          <p style={{ color:'#666' }}>
            Nessun quiz in libreria. Carica un file Excel per aggiungerne, poi premi “🔄 Aggiorna Libreria”.
          </p>
        ) : (
          <div style={{ overflowX:'auto' }}>
          <button onClick={reloadLibraryFromSupabase}
            style={{ marginTop: '0.2rem', marginBottom: '0.5rem' }}
            >     
            {libraryLoading ? 'Carico…' : '🔄 Aggiorna Libreria'}
          </button>
            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: '50px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={libAllSelected}             // ✅ stato globale “tutti selezionati”
                      onChange={toggleSelectAllLib}        // ✅ funzione globale
                      title="Seleziona/Deseleziona tutto"
                    />
                    <div style={{ fontSize:'0.8rem', marginTop:'0.25rem' }}>Sel.</div>
                  </th>
                  {headerCell('Data', 'created_at', '90px')}
                  {headerCell('Quiz', 'quizName')}
                  {headerCell('Domande', 'domandeCount', '80px')}
                  {headerCell('Esecuzioni', 'attempts', '80px')}
                  {headerCell('% Esecuzioni corrette', 'correct_pct', '80px')}
                  {headerCell('Best time', 'best_time_sec', '80px')}
                  <th style={{ ...th, width: '210px' }}>Azioni</th>
                </tr>

                {/* FILTRI TABELLA LIBRERIA */}
                <tr>
                  <td style={td}></td> {/* Sel. */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={libFilters.created_at} onChange={e=>setLibFilters({...libFilters, created_at:e.target.value})} placeholder="aaaa-mm-gg" /></td> {/* Data */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'left', boxSizing: 'border-box' }} value={libFilters.quizName} onChange={e=>setLibFilters({...libFilters, quizName:e.target.value})} placeholder="nome quiz" /></td> {/* Quiz */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={libFilters.domandeCount} onChange={e=>setLibFilters({...libFilters, domandeCount:e.target.value})} placeholder="n°" /></td> {/* domande */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={libFilters.attempts} onChange={e=>setLibFilters({...libFilters, attempts:e.target.value})} placeholder="n°" /></td> {/* Esecuzioni */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={libFilters.correct_pct} onChange={e=>setLibFilters({...libFilters, correct_pct:e.target.value})} placeholder="%" /></td> {/* % Esecuzioni corrette */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={libFilters.best_time_sec} onChange={e=>setLibFilters({...libFilters, best_time_sec:e.target.value})} placeholder="best" /></td> {/* Best time */}
                  <td style={td}></td> {/* Azioni */}
                </tr>
              </thead>

              {/* CONTENUTO TABELLA LIBRERIA */}
              <tbody>
                {libraryFilteredSorted.map((q, i) => {
                  const st = statsMap[q.id]   // 👈 recupera le statistiche
                  return (
                    <tr key={q.id}>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedLib.includes(q.id)}      // ✅ stato libreria
                          onChange={() => toggleRowLib(q.id)}      // ✅ funzione libreria
                        />
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>{q.created_at?.slice(0,10)}</td>
                      <td style={{ ...td, textAlign: 'left' }}>{q.quizName}</td>  {/* 👈 quiz allineato a sinistra */}
                      <td style={{ ...td, textAlign: 'center' }}>{q.domandeCount}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{st?.attempts ?? 0}</td>
                      <td
                        style={{
                          ...td,
                          textAlign: 'center',
                          backgroundColor: st?.correct_pct != null ? getPercentColor(st.correct_pct) : 'transparent',
                          color: st?.correct_pct != null ? getPercentTextColor(st.correct_pct) : 'inherit',
                        }}
                      >
                        {st?.correct_pct != null ? `${st.correct_pct}%` : '-'}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>{st?.best_time_sec != null ? formatHMS(st.best_time_sec) : '-'}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        

                        {/* bottoni azioni */}
                        {/* Statistiche 📊 */}
                        <button
                          onClick={async () => {
                            try {
                              const { data, error } = await supabase
                                .from('quiz_history')
                                .select('*')
                                .eq('quiz_id', q.id)   // usa id
                                .order('created_at', { ascending: false })
                              if (error) throw error
                              // Apri una modale semplice con la tabella history filtrata (puoi riusare la UI dello Storico o un overlay simile all’Anteprima)
                              setPreviewQuiz({ name: `Statistiche — ${q.quizName}`, questions: [] })
                              // Qui puoi salvare in uno stato dedicato (es. statsModalRows) e mostrare
                              setStatsModalRows(data || [])
                              setStatsModalOpen(true)
                            } catch (e) {
                              console.error(e); alert("Errore apertura statistiche.")
                            }
                          }}
                          title="Statistiche"
                          style={{ marginRight:'0.5rem' }}
                        >
                          📊
                        </button>
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


                        {/* Elimina 🗑️ sia per 1 quiz che per più quiz selezionati 12/09/2025*/}
                        <button
                          onClick={async () => {
                            if (selectedLib.length === 0) {
                              alert("Seleziona almeno un quiz da eliminare.");
                              return;
                            }
                            if (!window.confirm(`Vuoi eliminare ${selectedLib.length} quiz selezionati?`)) return;

                            try {
                              const { error } = await supabase
                                .from("quiz_files")
                                .delete()
                                .in("id", selectedLib);

                              if (error) throw error;
                              alert("Eliminazione completata.");
                              setSelectedLib([]);
                              setLibAllSelected(false);
                              await reloadLibraryFromSupabase();
                            } catch (e) {
                              console.error(e);
                              alert("Errore durante l'eliminazione.");
                            }
                          }}
                          title="Elimina quiz selezionati"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
      )}  
      </section>




      {/* Storico //modif 10/09/25*/}
      
      <section>
        <h3>
          <label style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showHistory}
              onChange={() => setShowHistory(prev => !prev)}
              style={{ marginRight: '0.5rem' }}
            />
            Storico Quiz
          </label>
        </h3>
        
    {showHistory && (
      <>
        {history.length === 0 ? (
          <p style={{ color:'#666' }}>Nessun tentativo ancora registrato.</p>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
              <thead>   
                <tr>
                  <th style={{ ...th, width: '50px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={histAllSelected}
                      onChange={toggleSelectAllHist}
                      title="Seleziona/Deseleziona tutto"
                    />
                    <div style={{ fontSize:'0.8rem', marginTop:'0.25rem' }}>Sel.</div>
                  </th>
                    {headerCellHistory('Data', 'data', '90px')}
                    {headerCellHistory('Quiz', 'quizName')}   {/* 👈 senza width → variabile */}
                    {headerCellHistory('Ora Inizio', 'oraInizio', '70px')}
                    {headerCellHistory('Ora Fine', 'oraFine', '70px')}
                    {headerCellHistory('Durata', 'durata', '70px')}
                    {headerCellHistory('Domande', 'domandeTotali', '60px')}
                    {headerCellHistory('Apprese', 'domandeConcluse', '60px')}
                    {headerCellHistory('Round', 'roundUsati', '60px')}
                    {headerCellHistory('Timer', 'timerDescrizione', '200px')}
                    {headerCellHistory('Utente', 'utente', '120px')}
                  <th style={{ ...th, width: '210px' }}>Azioni</th>
                </tr>

                {/* FILTRI TABELLA STORICO */}
                <tr>
                  <td style={td}></td> {/* sel */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={histFilters.data} onChange={e=>setHistFilters({...histFilters, data:e.target.value})} placeholder="aaaa-mm-gg" /></td> {/* Data */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'left', boxSizing: 'border-box' }} value={histFilters.quizName} onChange={e=>setHistFilters({...histFilters, quizName:e.target.value})} placeholder="nome quiz" /></td> {/* Quiz */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={histFilters.oraInizio} onChange={e=>setHistFilters({...histFilters, oraInizio:e.target.value})} placeholder="hh:mm" /></td> {/* Ora Inizio */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={histFilters.oraFine} onChange={e=>setHistFilters({...histFilters, oraFine:e.target.value})} placeholder="hh:mm" /></td> {/* Ora Fine */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={histFilters.durata} onChange={e=>setHistFilters({...histFilters, durata:e.target.value})} placeholder="00:mm:ss" /></td> {/* Durata */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={histFilters.domandeTotali} onChange={e=>setHistFilters({...histFilters, domandeTotali:e.target.value})} placeholder="n°" /></td> {/* Domande */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={histFilters.domandeConcluse} onChange={e=>setHistFilters({...histFilters, domandeConcluse:e.target.value})} placeholder="n°" /></td> {/* Apprese  */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={histFilters.roundUsati} onChange={e=>setHistFilters({...histFilters, roundUsati:e.target.value})} placeholder="n°" /></td> {/* Round */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={histFilters.timerDescrizione} onChange={e=>setHistFilters({...histFilters, timerDescrizione:e.target.value})} placeholder="timer" /></td> {/* Timer */}
                  <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={histFilters.utente} onChange={e=>setHistFilters({...histFilters, utente:e.target.value})} placeholder="utente" /></td> {/* Utente */}
                  <td style={td}></td> {/* azioni */}
                </tr>
              </thead>
              <tbody>
                {historyFilteredSorted.map((h, i) => (
                  <tr key={h.id}>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedHist.includes(h.id)}      // ✅ stato storico
                        onChange={() => toggleRowHist(h.id)}      // ✅ funzione storico
                      />
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>{h.data}</td>
                    <td style={{ ...td, textAlign: 'left' }}>{h.quizName || '-'}</td> {/* 👈 quiz allineato a sinistra */}
                    <td style={{ ...td, textAlign: 'center' }}>{h.oraInizio}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{h.oraFine}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{h.durata}</td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'center',
                        backgroundColor: h.domandeTotali === h.domandeConcluse ? 'lightgreen' : 'red',
                        color: h.domandeTotali === h.domandeConcluse ? 'black' : 'white',
                      }}
                    >
                      {h.domandeTotali}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'center',
                        backgroundColor: h.domandeTotali === h.domandeConcluse ? 'lightgreen' : 'red',
                        color: h.domandeTotali === h.domandeConcluse ? 'black' : 'white',
                      }}
                    >
                      {h.domandeConcluse}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>{h.roundUsati}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{h.timerDescrizione}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{h.utente}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button
                        onClick={async () => {
                          try {
                            let data, error
                            
                            if (h.quiz_id) {
                              const result = await supabase
                                .from("quiz_files")
                                .select("questions")
                                .eq("id", h.quiz_id)
                                .maybeSingle()
                              data = result.data
                              error = result.error
                            } else {
                              const result = await supabase
                                .from("quiz_files")
                                .select("questions")
                                .eq("quizName", h.quizName)
                                .maybeSingle()
                              data = result.data
                              error = result.error
                            }

                            if (error || !data || !data.questions?.length) {
                              alert("Nessuna domanda trovata per questo quiz.")
                              return
                            }

                            setPreviewQuiz({ name: h.quizName, questions: data.questions })
                            setPreviewOpen(true)
                          } catch (e) {
                            console.error("Errore anteprima:", e)
                            alert("Errore durante l'anteprima.")
                          }
                        }}
                        title="Anteprima"
                        style={{ marginRight: '0.5rem' }}
                      >
                        👁️
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            let data, error
                            
                            if (h.quiz_id) {
                              const result = await supabase
                                .from("quiz_files")
                                .select("questions")
                                .eq("id", h.quiz_id)
                                .maybeSingle()
                              data = result.data
                              error = result.error
                            } else {
                              const result = await supabase
                                .from("quiz_files")
                                .select("questions")
                                .eq("quizName", h.quizName)
                                .maybeSingle()
                              data = result.data
                              error = result.error
                            }

                            if (data && data.questions) {
                              setQuizName(h.quizName)
                              setDomande(data.questions)
                              setInQuiz(true)
                              return
                            }

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
                        style={{ marginRight: '0.5rem' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={async () => {
                          if (selectedHist.length === 0) {
                            alert("Seleziona almeno un record da eliminare.");
                            return;
                          }
                          if (!window.confirm(`Vuoi eliminare ${selectedHist.length} record selezionati dallo storico?`)) return;

                          try {
                            const { error } = await supabase
                              .from("quiz_history")
                              .delete()
                              .in("id", selectedHist);

                            if (error) throw error;
                            alert("Eliminazione completata.");
                            setSelectedHist([]);
                            setHistAllSelected(false);
                            await reloadHistoryFromSupabase();
                          } catch (e) {
                            console.error(e);
                            alert("Errore durante l'eliminazione.");
                          }
                        }}
                        title="Elimina record selezionati"
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
      </>
      )}  
      </section>

      {/* Aggiungi record di test 
      <button onClick={addTestRecord} style={{ marginBottom: '1rem' }}>
         ➕ Aggiungi record di test
      </button> */}






      {/* INIZIO MODALE */}
      {statsModalOpen && (
          <div style={{
            position:'fixed', top:0, left:0, right:0, bottom:0,
            background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000
          }}>
            <div style={{ background:'#fff', padding:'1rem', borderRadius:8, width:'98%', maxWidth:'1600px', maxHeight:'95%', overflow:'auto' }}>
              {/*   h2>{statsModalTitle}</h2>  */}
              <h2>Statistiche — {previewQuiz.name}</h2>
              
              {(() => {
                // Applica filtri e ordinamento ai dati della MODALE
                const modalFilteredSorted = statsModalRows
                  .filter(r => {
                    const f = modalFilters
                    const match = (val, filter) =>
                      !filter || (val || '').toString().toLowerCase().includes(filter.toLowerCase())
                    return (
                      match(r.data, f.data) &&
                      match(r.quizName, f.quizName) &&
                      match(r.oraInizio, f.oraInizio) &&
                      match(r.oraFine, f.oraFine) &&
                      match(r.durata, f.durata) &&
                      match(r.domandeTotali, f.domandeTotali) &&
                      match(r.domandeConcluse, f.domandeConcluse) &&
                      match(r.roundUsati, f.roundUsati) &&
                      match(r.timerDescrizione, f.timerDescrizione) &&
                      match(r.utente || r.userEmail, f.utente)
                    )
                  })
                  .sort((a, b) => {
                    const { key, dir } = modalSort
                    if (!key) return 0
                    const va = a[key], vb = b[key]
                    if (va == null && vb != null) return dir === 'asc' ? -1 : 1
                    if (va != null && vb == null) return dir === 'asc' ? 1 : -1
                    if (va == null && vb == null) return 0
                    if (va < vb) return dir === 'asc' ? -1 : 1
                    if (va > vb) return dir === 'asc' ? 1 : -1
                    return 0
                  })

                return (

                  <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        {headerCellModal('Data', 'data', '90px')}
                        {headerCellModal('Quiz', 'quizName')}   {/* 👈 senza width → variabile */}
                        {headerCellModal('Ora Inizio', 'oraInizio', '70px')}
                        {headerCellModal('Ora Fine', 'oraFine', '70px')}
                        {headerCellModal('Durata', 'durata', '70px')}
                        {headerCellModal('Domande', 'domandeTotali', '60px')}
                        {headerCellModal('Apprese', 'domandeConcluse', '60px')}
                        {headerCellModal('Round', 'roundUsati', '60px')}
                        {headerCellModal('Timer', 'timerDescrizione', '200px')}
                        {headerCellModal('Utente', 'utente', '120px')}
                      </tr>
                      {/* FILTRI */}
                      <tr>
                        <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={modalFilters.data} onChange={e=>setModalFilters({...modalFilters, data:e.target.value})} placeholder="aaaa-mm-gg" /></td>
                        <td style={td}><input style={{ width: '100%', textAlign: 'left', boxSizing: 'border-box' }} value={modalFilters.quizName} onChange={e=>setModalFilters({...modalFilters, quizName:e.target.value})} placeholder="nome quiz" /></td>
                        <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={modalFilters.oraInizio} onChange={e=>setModalFilters({...modalFilters, oraInizio:e.target.value})} placeholder="hh:mm" /></td>
                        <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={modalFilters.oraFine} onChange={e=>setModalFilters({...modalFilters, oraFine:e.target.value})} placeholder="hh:mm" /></td>
                        <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={modalFilters.durata} onChange={e=>setModalFilters({...modalFilters, durata:e.target.value})} placeholder="00:mm:ss" /></td>
                        <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={modalFilters.domandeTotali} onChange={e=>setModalFilters({...modalFilters, domandeTotali:e.target.value})} placeholder="n°" /></td>
                        <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={modalFilters.domandeConcluse} onChange={e=>setModalFilters({...modalFilters, domandeConcluse:e.target.value})} placeholder="n°" /></td>
                        <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={modalFilters.roundUsati} onChange={e=>setModalFilters({...modalFilters, roundUsati:e.target.value})} placeholder="n°" /></td>
                        <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={modalFilters.timerDescrizione} onChange={e=>setModalFilters({...modalFilters, timerDescrizione:e.target.value})} placeholder="timer" /></td>
                        <td style={td}><input style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }} value={modalFilters.utente} onChange={e=>setModalFilters({...modalFilters, utente:e.target.value})} placeholder="utente" /></td>
                      </tr>
                    </thead>
                    <tbody>
                      {modalFilteredSorted.map((h, i) => (
                        <tr key={i}>
                          <td style={{ ...td, textAlign: 'center' }}>{h.data}</td>
                          <td style={{ ...td, textAlign: 'left' }}>{h.quizName || '-'}</td> {/* 👈 quiz allineato a sinistra */}
                          <td style={{ ...td, textAlign: 'center' }}>{h.oraInizio}</td>
                          <td style={{ ...td, textAlign: 'center' }}>{h.oraFine}</td>
                          <td
                            style={{
                              ...td,
                              textAlign: 'center',
                              backgroundColor:
                                h.domandeTotali === h.domandeConcluse
                                  ? getDurationColor(h.durata, modalFilteredSorted)
                                  : 'transparent',
                              color:
                                h.domandeTotali === h.domandeConcluse
                                  ? getDurationTextColor(h.durata, modalFilteredSorted)
                                  : 'inherit',
                            }}
                          >
                            {h.durata}
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: 'center',
                              backgroundColor: h.domandeTotali === h.domandeConcluse ? 'lightgreen' : 'red',
                              color: h.domandeTotali === h.domandeConcluse ? 'black' : 'white',
                            }}
                          >
                            {h.domandeTotali}
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: 'center',
                              backgroundColor: h.domandeTotali === h.domandeConcluse ? 'lightgreen' : 'red',
                              color: h.domandeTotali === h.domandeConcluse ? 'black' : 'white',
                            }}
                          >
                            {h.domandeConcluse}
                          </td>
                          <td style={{ ...td, textAlign: 'center' }}>{h.roundUsati}</td>
                          <td style={{ ...td, textAlign: 'center' }}>{h.timerDescrizione}</td>
                          <td style={{ ...td, textAlign: 'center' }}>{h.utente}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}

              <div style={{ marginTop:'1rem', textAlign:'right' }}>
                <button onClick={() => {
                  setStatsModalOpen(false)
                  setModalSort({ key: 'data', dir: 'desc' })
                  setModalFilters({ data: '', quizName: '', oraInizio: '', oraFine: '', durata: '', domandeTotali: '', domandeConcluse: '', roundUsati: '', timerDescrizione: '', utente: '' })
                }}>
                  Chiudi
                </button>


              </div>
            </div>


          </div>
        )}

      {/* overlay dell’anteprima (modale semplice ) */}
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
                        {/* torna all'home page button */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setPreviewOpen(false)
                  setInQuiz(false)
                }}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  background: '#2196f3',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ⬅️ Torna alla Home
              </button>
            </div>
          </div>


        </div>
      )}


    </div>
  )
}

const th = {
  border: '1px solid #ccc',
  padding: '6px',
  textAlign: 'center',   // 👈 aggiungi questa riga
  backgroundColor: '#f0f0f0'
}
const td = {
  padding: '4px 6px',   // prima era tipo '8px 12px'
  border: '1px solid #ddd',
  textAlign: 'center',
  lineHeight: '1.1'     // compatta le righe
}

export default Dashboard