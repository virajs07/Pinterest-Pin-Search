import { useAppDispatch, useAppSelector } from '@/store';
import { fetchPage, setQuery } from '@/store/feedSlice';
import { clearSuggestions } from '@/store/suggestionsSlice';
import { useDebouncedSearch } from './useDebouncedSearch';
import container from '@/ui/appContainer.module.css';
import { SearchBar } from './SearchBar';
import { Feed } from './Feed';

export function SearchPage() {
  const dispatch = useAppDispatch();
  const query = useAppSelector((s) => s.feed.query);

  // Auto-trigger search after debounce
  useDebouncedSearch(query);

  function commit(newQuery: string) {
    dispatch(setQuery(newQuery.trim()));
    dispatch(clearSuggestions());
    void dispatch(fetchPage());
  }

  return (
    <section data-testid="search-page" className={container.appContainer}>
      <SearchBar onCommit={commit} />
      <Feed />
    </section>
  );
}
