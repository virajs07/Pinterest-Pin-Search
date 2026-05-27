import { useId, useState, type KeyboardEvent } from 'react';
import { useAppSelector } from '@/store';
import { useDebouncedSuggestions } from './useDebouncedSuggestions';
import { SuggestionsList } from './SuggestionsList';
import styles from './SearchBar.module.css';

export type SearchBarProps = {
  onCommit: (query: string) => void;
  initialValue?: string;
};

export function SearchBar({ onCommit, initialValue = '' }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();

  useDebouncedSuggestions(value);
  const items = useAppSelector((s) => s.suggestions.items);
  const suggestionsQuery = useAppSelector((s) => s.suggestions.query);

  // Only show suggestions that belong to the current input value.
  const matchedItems =
    open && value.trim().length >= 3 && suggestionsQuery === value ? items : [];

  const clampedActive = matchedItems.length === 0
    ? 0
    : Math.min(activeIndex, matchedItems.length - 1);

  function commit(text: string) {
    setOpen(false);
    onCommit(text);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && matchedItems.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => Math.min(matchedItems.length - 1, i + 1));
    } else if (e.key === 'ArrowUp' && matchedItems.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = matchedItems[clampedActive];
      commit(picked ?? value.trim());
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div
      className={styles.wrapper}
      role="combobox"
      aria-expanded={matchedItems.length > 0}
      aria-haspopup="listbox"
      aria-owns={listboxId}
    >
      <input
        type="search"
        className={styles.input}
        placeholder="Search pins…"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={
          matchedItems.length > 0 ? `${listboxId}-opt-${clampedActive}` : undefined
        }
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        data-testid="search-input"
      />
      <SuggestionsList
        items={matchedItems}
        listboxId={listboxId}
        activeIndex={clampedActive}
        onPick={commit}
      />
    </div>
  );
}
