# KI-Gesten-Quiz

Webbasierte SPA: Die Webcam wird (mit Erlaubnis) aktiviert, MediaPipe erkennt die
Zeigefingerspitze und der Benutzer wählt Quiz-Antworten zu KI-Lernkonzepten aus,
indem er mit dem Finger ca. 1,5 Sekunden über einer Antwortkarte verweilt
(Dwell-Auswahl mit Fortschrittsring). Frage und Antworten liegen als gut lesbares
Overlay über dem gespiegelten Kamerabild.

**Live:** https://clcoder9.github.io/breathe/gesture-quiz/dist/

## Starten

```bash
npm install        # lädt via postinstall auch Modell + WASM nach public/
npm run dev        # http://localhost:5173
```

Produktions-Build:

```bash
npm run build      # Ausgabe in dist/, muss über HTTP(S) serviert werden
npm run preview
```

> `getUserMedia` (Kamerazugriff) funktioniert nur über **HTTPS oder localhost**.

## Deployment (GitHub Pages)

Das Repo `clcoder9/breathe` wird via GitHub Pages direkt vom `main`-Branch
serviert. Deployment = gebautes `dist/` committen:

```bash
npm run build
git add -f dist        # dist ist in .gitignore, im Repo aber gewollt
git commit -m "Deploy gesture-quiz"
git push
```

Nach ~1 Minute ist die neue Version unter der Live-URL oben verfügbar.

## Bedienung

1. „Kamera starten“ klicken und Kamerazugriff erlauben.
2. Mit dem Zeigefinger auf eine der vier Antwortkarten zeigen.
3. Finger ~1,5 s dort halten, bis sich der gelbe Ring schließt → Antwort gewählt.
4. Nach dem Feedback (richtig/falsch + Erklärung) kommt die nächste Frage.
5. Am Ende: Punktestand und „Nochmal spielen“ (ebenfalls per Geste wählbar).

Fallback: Alle Antworten sind auch per Maus/Touch klickbar.

## Debug-Modus ohne Kamera

`http://localhost:5173/?mouse` — die Maus ersetzt den Finger-Cursor
(praktisch zum Testen der Dwell-Logik ohne Webcam).

## Technik

- **Vite + TypeScript**, kein Framework
- **@mediapipe/tasks-vision** `HandLandmarker` (Landmark 8 = Zeigefingerspitze),
  läuft komplett lokal: Modell in `public/models/`, WASM in `public/wasm/`
- Exponentielle Glättung des Cursors gegen Zittern
- Dwell-Auswahl: 1,5 s Verweilen, Trefferzone ±28 px um die Karte,
  nach einer Auswahl muss der Finger die Karte einmal verlassen (Re-Arm-Sperre)
- Fragen in `src/questions.json` (Format: `question`, `answers[4]`,
  `correctIndex`, `explanation`) — einfach erweiterbar

## Projektstruktur

```
src/
├─ main.ts          Bootstrap, Screens, Quiz-Rendering
├─ camera.ts        getUserMedia + Video-Setup
├─ handTracking.ts  MediaPipe HandLandmarker + Cursor-Glättung
├─ overlay.ts       DwellController (Cursor, Fortschrittsring, Hit-Test)
├─ quiz.ts          Quiz-Zustand (Fragen, Punkte, Shuffle)
├─ questions.json   Fragenkatalog (deutsch)
└─ style.css        Overlay-Styling
```
