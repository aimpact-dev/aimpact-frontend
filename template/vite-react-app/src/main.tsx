import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { SolanaProvider } from './components/SolanaProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolanaProvider>
      <App />
    </SolanaProvider>
  </StrictMode>,
);
