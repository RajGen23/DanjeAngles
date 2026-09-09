import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { PrefsProvider } from '@/i18n';
import { TopBar } from '@/components/TopBar';
import { AuthModal } from '@/components/AuthModal';
import Home from '@/pages/Home';
import Results from '@/pages/Results';
import Handoff from '@/pages/Handoff';
import Trips from '@/pages/Trips';
import Terms from '@/pages/Terms';
import Hotels from '@/pages/Hotels';
import Cars from '@/pages/Cars';

function App() {
  return (
    <BrowserRouter>
      <PrefsProvider>
      <AuthProvider>
        <TopBar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/results" element={<Results />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/cars" element={<Cars />} />
            <Route path="/handoff" element={<Handoff />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </main>
        <AuthModal />
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
      </PrefsProvider>
    </BrowserRouter>
  );
}

export default App;
