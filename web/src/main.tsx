import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { NuiProvider } from './context/NuiContext'
import { I18nProvider } from './context/I18n'
import { AppStateProvider } from './context/AppState'

import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NuiProvider debugMode={import.meta.env.DEV} debugResourceName="mri_Qadmin">
      <I18nProvider>
        <ThemeProvider>
          <AppStateProvider>
            <App />
          </AppStateProvider>
        </ThemeProvider>
      </I18nProvider>
    </NuiProvider>
  </React.StrictMode>
)
