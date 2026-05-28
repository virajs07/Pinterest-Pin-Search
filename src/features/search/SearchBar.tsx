import { useId, useState, type KeyboardEvent } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setQuery } from '@/store/feedSlice';
import { useDebouncedSuggestions } from './useDebouncedSuggestions';
import { SuggestionsList } from './SuggestionsList';
import styles from './SearchBar.module.css';

export type SearchBarProps = {
  onCommit: (query: string) => void;
  initialValue?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export function SearchBar({ 
  onCommit, 
  initialValue = '',
  searchValue: externalValue,
  onSearchChange,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  // -1 means "no suggestion is highlighted". Highlight only appears when the
  // user explicitly arrows into the list — typing alone should never select.
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const inputId = useId();
  const dispatch = useAppDispatch();

  // Use external value if provided, otherwise use local state
  const value = externalValue !== undefined ? externalValue : localValue;

  useDebouncedSuggestions(value);
  const items = useAppSelector((s) => s.suggestions.items);
  const suggestionsQuery = useAppSelector((s) => s.suggestions.query);

  // Only show suggestions that belong to the current input value.
  const matchedItems =
    open && value.trim().length >= 3 && suggestionsQuery === value ? items : [];

  // Clamp without forcing a selection — keep -1 if that's where we are.
  const clampedActive =
    activeIndex < 0 || matchedItems.length === 0
      ? -1
      : Math.min(activeIndex, matchedItems.length - 1);

  function commit(text: string) {
    setOpen(false);
    if (!externalValue) setLocalValue(text);
    dispatch(setQuery(text.trim()));
    onCommit(text);
  }

  function handleInputChange(newValue: string) {
    if (externalValue === undefined) {
      setLocalValue(newValue);
    }
    onSearchChange?.(newValue);
    setActiveIndex(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && matchedItems.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i < 0 ? 0 : Math.min(matchedItems.length - 1, i + 1)));
    } else if (e.key === 'ArrowUp' && matchedItems.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? matchedItems.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = clampedActive >= 0 ? matchedItems[clampedActive] : undefined;
      commit(picked ?? value.trim());
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // ARIA 1.2 combobox pattern: the role lives on the input itself, not a
  // wrapper. The input owns the popup via aria-controls and exposes the
  // currently-active option via aria-activedescendant.
  return (
    <div className={styles.wrapper}>
      <label htmlFor={inputId} className={styles.srOnly}>
        Search pins
      </label>
      <input
        id={inputId}
        type="search"
        className={styles.input}
        placeholder="Search pins…"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={matchedItems.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={
          clampedActive >= 0 ? `${listboxId}-opt-${clampedActive}` : undefined
        }
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
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
