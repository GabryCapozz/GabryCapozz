# Test QI Adattivo

Sito statico (HTML, CSS e JavaScript, senza dipendenze né build) che stima il QI con un test adattivo in 8 prove.

## Come usarlo

- In locale: apri `iq-test/index.html` nel browser.
- Online: attiva GitHub Pages sul repository; la pagina sarà raggiungibile al percorso `/iq-test/`.

## Le prove

| Prova | Abilità | Item |
| --- | --- | --- |
| Matrici | Ragionamento fluido | generati al momento (161 configurazioni di regole) |
| Comprensione verbale | Lessico e ragionamento verbale | 100 in banca |
| Serie numeriche | Ragionamento induttivo | generate al momento (23 tipi di regola) |
| Rotazione mentale | Abilità visuo-spaziale | poliomini chirali generati al momento |
| Memoria di cifre | Memoria di lavoro | span diretto e inverso, adattivo |
| Ragionamento logico | Ragionamento deduttivo | 32 in banca + ordinamenti generati |
| Ragionamento quantitativo | Ragionamento numerico | 47 in banca |
| Velocità di elaborazione | Velocità percettiva | 90 secondi, confronto di codici |

Tre durate: Rapido (circa 30 min), Standard (circa 50 min), Completo (circa 85 min).

## Metodo

- Ogni item ha i parametri del modello IRT a tre parametri: discriminazione `a`, difficoltà `b`, probabilità di indovinare `c`.
- Dopo ogni risposta l'abilità viene stimata con EAP (prior normale standard) e l'item successivo è scelto per massimizzare l'informazione di Fisher al livello stimato.
- QI = 100 + 15 × theta. L'intervallo al 95% somma l'errore di misura a un'incertezza fissa di 3 punti dovuta alla taratura.
- Velocità e memoria entrano nella stima con un peso minore (carico fattoriale più basso).

## Limiti

I parametri degli item sono stimati da chi ha costruito il test e non sono tarati su un campione normativo. Il punteggio è quindi indicativo e non ha valore clinico: per una valutazione vera serve uno psicologo con un test standardizzato (per esempio WAIS-IV).

## File

- `js/irt.js`: modello 3PL, stima EAP, funzioni di scala.
- `js/generators.js`: generatori di matrici, serie, rotazioni, ordinamenti, coppie per la velocità, cifre.
- `js/bank.js`: domande scritte a mano (verbale, logica, quantitativo).
- `js/app.js`: interfaccia, selezione adattiva, memoria, velocità, risultati.
- `css/style.css`: stile, tema chiaro e scuro.

Lo storico dei risultati resta nel `localStorage` del browser; nessun dato viene inviato.
