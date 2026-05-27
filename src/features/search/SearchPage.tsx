import { useState } from 'react';
import { useAppDispatch } from '@/store';
import { fetchPage, setQuery } from '@/store/feedSlice';
import { clearSuggestions } from '@/store/suggestionsSlice';
import { useDebouncedSearch } from './useDebouncedSearch';
import container from '@/ui/appContainer.module.css';
import { SearchBar } from './SearchBar';
import { Feed } from './Feed';

export function SearchPage() {
  const dispatch = useAppDispatch();
  const [searchInputValue, setSearchInputValue] = useState('');

  // Auto-trigger search after debounce on input value change
  useDebouncedSearch(searchInputValue, (newValue) => {
    dispatch(setQuery(newValue.trim()));
  });

  function commit(newQuery: string) {
    const trimmed = newQuery.trim();
    setSearchInputValue(trimmed);
    dispatch(setQuery(trimmed));
    dispatch(clearSuggestions());
    void dispatch(fetchPage());
  }

  return (
    <section data-testid="search-page" className={container.appContainer}>
      <SearchBar onCommit={commit} searchValue={searchInputValue} onSearchChange={setSearchInputValue} />
      <Feed />
    </section>
  );
}
