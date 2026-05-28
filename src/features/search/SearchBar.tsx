import { useId, useState, type KeyboardEvent } from 'react';
import { useAppSelector } from '@/store';
import { selectSuggestions } from '@/store/suggestionsSlice';
import { useDebouncedSuggestions } from './useDebouncedSuggestions';
import { SuggestionsList } from './SuggestionsList';
import styles from './SearchBar.module.css';

export type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onCommit: (query: string) => void;
};

export function SearchBar({ value, onChange, onCommit }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  // -1 means "no suggestion is highlighted". Highlight only appears when the
  // user explicitly arrows into the list — typing alone should never select.
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const inputId = useId();

  useDebouncedSuggestions(value);
  const items = useAppSelector(selectSuggestions);

  // The selector returns [] until the debounced query catches up to the input,
  // so we can render `items` directly — no extra query-vs-input check needed.
  const matchedItems = open && value.trim().length >= 3 ? items : [];

  const clampedActive =
    activeIndex < 0 || matchedItems.length === 0
      ? -1
      : Math.min(activeIndex, matchedItems.length - 1);

  function commit(text: string) {
    setOpen(false);
    onCommit(text);
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
        aria-controls={matchedItems.length > 0 ? listboxId : undefined}
        aria-activedescendant={
          clampedActive >= 0 ? `${listboxId}-opt-${clampedActive}` : undefined
        }
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setActiveIndex(-1);
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
