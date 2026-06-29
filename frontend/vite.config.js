import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Schimbăm directorul unde Vite își pune scripturile de sistem din 'assets' în 'static' 
    // pentru a nu se bate cap în cap cu pagina de React care are ruta '/assets' (Asset Library)
    assetsDir: 'static',
    // Ne asigurăm că sursele originale NU sunt livrate în producție
    sourcemap: false,
    
    // Obfuscăm și minificăm agresiv codul
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Elimină toate console.log-urile
        drop_debugger: true, // Acum eliminăm automat eventualele debuggere rămase
        passes: 2 // O compresie mai profundă
      },
      format: {
        comments: false // Elimină comentariile
      }
    }
  }
})
