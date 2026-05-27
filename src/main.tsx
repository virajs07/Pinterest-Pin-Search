import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { IndexedDbPinRepository } from '@/data/IndexedDbPinRepository';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { makeStore } from '@/store';
import { hydrate } from '@/store/feedSlice';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

const repo = new IndexedDbPinRepository();
const store = makeStore(repo);
void store.dispatch(hydrate());

createRoot(rootEl).render(
  <StrictMode>
    <Provider store={store}>
      <RepositoryProvider repo={repo}>
        <App />
      </RepositoryProvider>
    </Provider>
  </StrictMode>,
);
