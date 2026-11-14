import { createRoot } from 'react-dom/client';
import { YijingApp } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <div className="yijing-module">
    <YijingApp />
  </div>
);
