import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import './index.css';

// 通过 ?admin=1 进入后台管理界面（无需 AuthProvider 上下文）
const isAdmin = new URLSearchParams(window.location.search).has('admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? (
      <AdminPanel />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </StrictMode>,
);
