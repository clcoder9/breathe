import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  // Relativer Base-Pfad, damit der Build auch aus Unterverzeichnissen servierbar ist
  base: './',
  // HTTPS (selbstsigniert) im Dev-Server: getUserMedia (Kamera) funktioniert nur
  // über HTTPS oder localhost – nötig für Tests von anderen Geräten über die IP.
  // VITE_HTTP=1 erzwingt HTTP (z. B. für automatisierte Tests).
  plugins: process.env.VITE_HTTP ? [] : [basicSsl()],
})
