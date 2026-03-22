import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import ResultsPage from './pages/ResultsPage';
import Sandbox from './pages/Sandbox';
import ToastContainer from './components/ui/ToastContainer';
import { useToastStore } from './stores/toastStore';

function App() {
  useEffect(() => {
    const handleOffline = () => useToastStore.getState().addToast('You are offline. Reconnecting when network returns...', 'error');
    const handleOnline = () => useToastStore.getState().addToast('Back online!', 'info');
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:roomCode" element={<LobbyPage />} />
        <Route path="/game/:roomCode" element={<GamePage />} />
        <Route path="/results/:roomCode" element={<ResultsPage />} />
        <Route path="/sandbox" element={<Sandbox />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
