# KI-Gesten-Quiz

Webbasierte SPA: Die Webcam wird (mit Erlaubnis) aktiviert, MediaPipe erkennt
Zeigefingerspitze **und Mimik**. Der Benutzer beantwortet Quiz-Fragen zu
**System Prompts & Prompt Injection**, indem er mit dem Finger ca. 1,5 Sekunden
über einer Antwortkarte verweilt (Dwell-Auswahl mit Fortschrittsring) – oder die
anvisierte Antwort per **Lächeln** sofort bestätigt. Wahr/Falsch-Fragen lassen
sich per **Nicken/Kopfschütteln** beantworten. Frage und Antworten liegen als
gut lesbares Overlay über dem gespiegelten Kamerabild.

Die Mimik-Erkennung läuft komplett lokal im Browser (MediaPipe Blendshapes):
Es werden nur flüchtige Scores pro Frame ausgewertet („Lächeln: 0.8“) – nichts
wird gespeichert oder übertragen, es findet keine Identifikation statt.

Oben rechts sitzt ein **3D-Roboter** (Three.js) als Maskottchen: Er dreht den
Kopf des Spielers mit und reagiert auf Antworten mit Animationen (Daumen hoch,
Kopfschütteln, Tanz, …) – siehe [3D-Maskottchen](#3d-maskottchen). Fehlt die
Modelldatei oder WebGL, übernimmt automatisch ein Emoji-Spiegel.

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
3. Finger ~1,5 s dort halten, bis sich der gelbe Ring schließt – **oder
   lächeln**, um die anvisierte Antwort sofort zu bestätigen.
4. Wahr/Falsch-Fragen: **Nicken = Wahr, Kopfschütteln = Falsch**
   (die beiden Karten sind zusätzlich per Finger/Dwell wählbar).
5. Nach dem Feedback (richtig/falsch + Erklärung) kommt die nächste Frage.
   Wer sich über eine richtige Antwort sichtbar freut, bekommt Konfetti
   (Smile-Bonus, wird am Ende mitgezählt).
6. Am Ende: Punktestand und „Nochmal spielen“ (ebenfalls per Geste wählbar).

Ein Emoji oben rechts spiegelt live die erkannte Mimik. Fällt die
Mimik-Erkennung aus, läuft das Quiz normal mit Finger/Dwell weiter.
Fallback: Alle Antworten sind auch per Maus/Touch klickbar.

## 3D-Maskottchen

Der Avatar liegt als `public/models/avatar.glb` bei: der **„Animated Robot
Pack“-Roboter von [Quaternius](https://quaternius.com)** (Lizenz **CC0** /
Public Domain), aus dem Original-FBX konvertiert mit `FBX2glTF` (npm-Paket
`fbx2gltf`). Er nutzt den `Head`-Bone für die Kopfdrehung und die
mitgelieferten Clips für Reaktionen: richtig → zufällig ThumbsUp/Yes/Dance/
Wave/Jump, falsch → No (Kopfschütteln)/Death/Sitting, dazwischen Idle.

**Modell austauschen:** einfach eine andere GLB-Datei als
`public/models/avatar.glb` ablegen. Die Zuordnung (Mimik → Shapekeys wie
`Eyes_Happy`/ARKit-Blendshapes, Reaktionen → Clips per Namensmuster) matcht
tolerant in `src/avatar3d.ts`; die Browser-Konsole listet beim Start alle
gefundenen Morphs/Clips (`3D-Avatar geladen – …`). Modelle mit
Gesichts-Blendshapes spiegeln zusätzlich Lächeln/Blinzeln des Spielers.
Zum Pipeline-Test ohne Modell: `node scripts/make-test-avatar.mjs` erzeugt
einen Platzhalter (danach löschen, nicht deployen).

Hinweis Netzwerk/Beschaffung: Sketchfab & Co. sind im Firmennetz teils
geblockt; erreichbar sind u. a. quaternius.com (CC0-Packs, Downloads via
Google Drive) und raw.githubusercontent.com (z. B. `facecap.glb` aus dem
three.js-Repo mit vollen ARKit-Morphs).

## Debug-Modus ohne Kamera

`http://localhost:5173/?mouse` — die Maus ersetzt den Finger-Cursor
(praktisch zum Testen der Dwell-Logik ohne Webcam); gedrückte Maustaste =
Pinch-Geste (Drag & Drop). Tasten simulieren Mimik: **L** = Lächeln (Impuls),
**K** = Lächeln halten (Avatar-Mund), **J** = Nicken (Wahr),
**N** = Kopfschütteln (Falsch).

`?facedebug` blendet die Live-Messwerte der Mimik-Erkennung ein
(Lächeln/Blinzeln/Kopfwinkel) — zum Kalibrieren der Schwellwerte in
`src/expressions.ts`.

## Technik

- **Vite + TypeScript**, kein Framework
- **@mediapipe/tasks-vision** `HandLandmarker` (Landmark 8 = Zeigefingerspitze)
  und `FaceLandmarker` mit Blendshapes (Lächeln, Mund, Brauen) + Nasenspitze
  für Nick-/Schüttelerkennung; läuft komplett lokal:
  Modelle in `public/models/`, WASM in `public/wasm/`
- Exponentielle Glättung des Cursors gegen Zittern
- Dwell-Auswahl: 1,5 s Verweilen, Trefferzone ±28 px um die Karte,
  nach einer Auswahl muss der Finger die Karte einmal verlassen (Re-Arm-Sperre)
- Nicken/Kopfschütteln: Pendelbewegung der Nasenspitze (≥3 Richtungswechsel
  in 1 s auf der dominanten Achse), Schwellwerte in `src/expressions.ts`
- Fragen in `src/questions.json` (Format: `question`, `answers`, `correctIndex`,
  `explanation`, optional `type: "truefalse"` für Nicken/Schütteln-Fragen);
  Antwortpositionen werden pro Durchlauf gemischt

## Projektstruktur

```
src/
├─ main.ts          Bootstrap, Screens, Quiz-Rendering, Mimik-Verdrahtung
├─ camera.ts        getUserMedia + Video-Setup
├─ handTracking.ts  MediaPipe HandLandmarker + Cursor-Glättung
├─ faceTracking.ts  MediaPipe FaceLandmarker (Blendshapes, Nase, Kopfmatrix)
├─ expressions.ts   SmileTrigger + HeadGestureDetector (Nicken/Schütteln)
├─ avatar3d.ts      Optionales 3D-Maskottchen (Three.js, lazy geladen)
├─ overlay.ts       DwellController (Cursor, Fortschrittsring, Hit-Test)
├─ quiz.ts          Quiz-Zustand (Fragen, Punkte, Shuffle inkl. Antworten)
├─ questions.json   Fragenkatalog (deutsch): System Prompt & Prompt Injection
└─ style.css        Overlay-Styling
```

**Credits:** 3D-Roboter: „Animated Robot Pack“ von
[Quaternius](https://quaternius.com), Lizenz
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (Public Domain).
