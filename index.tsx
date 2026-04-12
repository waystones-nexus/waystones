
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AmbientProvider } from './contexts/AmbientContext';
import { AmbientWhisper } from './components/shared/AmbientWhisper';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AmbientProvider>
      <App />
      <AmbientWhisper />
    </AmbientProvider>
  </React.StrictMode>
);
