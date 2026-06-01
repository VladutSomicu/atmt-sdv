import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Ne asigurăm că sursele originale NU sunt livrate în producție
    sourcemap: false,
    
    // Obfuscăm și minificăm agresiv codul
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Elimină toate console.log-urile
        drop_debugger: false, // Lăsăm debugger-ul nostru activ pentru capcană!
        passes: 2 // O compresie mai profundă
      },
      format: {
        comments: false // Elimină comentariile
      }
    }
  }
})
