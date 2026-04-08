import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as JotaiProvider } from 'jotai';
import { TooltipProvider } from '@/components/common/ui/tooltip';
import './app.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JotaiProvider>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </JotaiProvider>
  </StrictMode>
);
