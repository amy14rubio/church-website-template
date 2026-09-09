import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { listenForForegroundMessages } from '@/lib/pushNotifications'
import { initSmoothScroll } from '@/lib/smoothScroll'
import { AuthProvider } from '@/contexts/AuthContext'
import { SiteEditModeProvider } from '@/contexts/SiteEditModeContext'
import { SiteTextProvider } from '@/contexts/SiteTextContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { StaffRoute } from '@/components/layout/StaffRoute'
import { MinistryAccessPromptModal } from '@/components/site/MinistryAccessPromptModal'
import { AboutPage } from '@/pages/AboutPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { ContactPage } from '@/pages/ContactPage'
import { DiscipleshipPage } from '@/pages/DiscipleshipPage'
import { EscuelaDominicalPage } from '@/pages/EscuelaDominicalPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { MinisterioAlabanzaPage } from '@/pages/MinisterioAlabanzaPage'
import { MinisterioAyudaPage } from '@/pages/MinisterioAyudaPage'
import { MinisterioJovenesPage } from '@/pages/MinisterioJovenesPage'
import { MinisterioTeatroPage } from '@/pages/MinisterioTeatroPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RoleManagementPage } from '@/pages/RoleManagementPage'
import { SiteMediaPage } from '@/pages/SiteMediaPage'

function App() {
  useEffect(() => initSmoothScroll(), [])
  useEffect(() => {
    void listenForForegroundMessages()
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <SiteEditModeProvider>
          <SiteTextProvider>
            <MinistryAccessPromptModal />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route path="/calendario" element={<CalendarPage />} />
                <Route path="/" element={<HomePage />} />
                <Route path="/quienes-somos" element={<AboutPage />} />
                <Route path="/contactenos" element={<ContactPage />} />
                <Route path="/ministerio-de-ayuda" element={<MinisterioAyudaPage />} />
                <Route path="/ministerio-de-alabanza" element={<MinisterioAlabanzaPage />} />
                <Route path="/escuela-dominical" element={<EscuelaDominicalPage />} />
                <Route path="/ministerio-de-jovenes" element={<MinisterioJovenesPage />} />
                <Route path="/ministerio-de-teatro" element={<MinisterioTeatroPage />} />
                <Route path="/escuela-discipulado" element={<DiscipleshipPage />} />
                <Route element={<Layout />}>
                  <Route path="/iniciar-sesion" element={<LoginPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/perfil" element={<ProfilePage />} />
                  </Route>
                  <Route element={<StaffRoute />}>
                    <Route path="/administracion" element={<RoleManagementPage />} />
                    <Route path="/medios" element={<SiteMediaPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </SiteTextProvider>
        </SiteEditModeProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
