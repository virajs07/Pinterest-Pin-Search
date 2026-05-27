import { useAppDispatch } from '@/store';
import { fetchPage, setQuery } from '@/store/feedSlice';
import { clearSuggestions } from '@/store/suggestionsSlice';
import container from '@/ui/appContainer.module.css';
import { SearchBar } from './SearchBar';
import { Feed } from './Feed';

export function SearchPage() {
  const dispatch = useAppDispatch();

  function commit(query: string) {
    dispatch(setQuery(query.trim()));
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
