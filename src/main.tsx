import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence benign Firestore internal idle stream cleanup notices
if (typeof window !== 'undefined') {
  const origConsoleError = console.error;
  console.error = function (...args: any[]) {
    const text = args
      .map((a) => (typeof a === 'string' ? a : (a?.message || '')))
      .join(' ');
    if (
      text.includes('Disconnecting idle stream') ||
      text.includes('Timed out waiting for new targets') ||
      (text.includes('GrpcConnection') && text.includes('CANCELLED'))
    ) {
      // Normal Firestore SDK stream cleanup when stream is idle
      return;
    }
    origConsoleError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
