import { useState } from 'react';
import { useAppDispatch } from '@/store';
import { clearSuggestions } from '@/store/suggestionsSlice';
import { useDebouncedSearch } from './useDebouncedSearch';
import container from '@/ui/appContainer.module.css';
import { SearchBar } from './SearchBar';
import { Feed } from './Feed';

export function SearchPage() {
  const dispatch = useAppDispatch();
  const [inputValue, setInputValue] = useState('');

  // Single trigger: the debounced search hook owns dispatching setQuery +
  // fetchPage whenever the input pauses. SearchBar.commit (Enter / suggestion
  // pick) flushes the debounce immediately so the user sees no latency.
  const flush = useDebouncedSearch(inputValue);

  function commit(newQuery: string) {
    const trimmed = newQuery.trim();
    setInputValue(trimmed);
    dispatch(clearSuggestions());
    flush(trimmed);
  }

  return (
    <section data-testid="search-page" className={container.appContainer} aria-labelledby="search-page-heading">
      <h1 id="search-page-heading" className={container.visuallyHidden}>
        Pin feed
      </h1>
      <div role="search">
        <SearchBar value={inputValue} onChange={setInputValue} onCommit={commit} />
      </div>
      <Feed />
    </section>
  );
}
