import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from '@/components/ui';
import './index.css';

// Note: StrictMode is disabled because it causes WebGL context loss issues
// with Pixi.js. In development, StrictMode runs effects twice, which creates
// two WebGL contexts in rapid succession, causing the browser to lose context.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
