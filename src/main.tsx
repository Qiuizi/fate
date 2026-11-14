import React from 'react';
import { createRoot } from 'react-dom/client';
import Shell from './Shell';
import ErrorBoundary from './components/ErrorBoundary';
import './styles.css';
import './atelier.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Shell />
    </ErrorBoundary>
  </React.StrictMode>
);
