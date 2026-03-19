import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sandbox from './pages/Sandbox';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sandbox" element={<Sandbox />} />
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-primary">
            <h1 className="text-4xl font-bold text-white font-heading">Guess Who?</h1>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
