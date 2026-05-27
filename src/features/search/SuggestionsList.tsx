import styles from './SearchBar.module.css';

export type SuggestionsListProps = {
  items: string[];
  listboxId: string;
  activeIndex: number;
  onPick: (text: string) => void;
};

export function SuggestionsList({
  items,
  listboxId,
  activeIndex,
  onPick,
}: SuggestionsListProps) {
  if (items.length === 0) return null;
  return (
    <ul id={listboxId} role="listbox" className={styles.list}>
      {items.map((item, i) => {
        const selected = i === activeIndex;
        return (
          <li
            key={item}
            id={`${listboxId}-opt-${i}`}
            role="option"
            aria-selected={selected}
            className={styles.option}
            onMouseDown={(e) => {
              // Use mousedown so we beat the input's blur which would close the list first.
              e.preventDefault();
              onPick(item);
            }}
          >
            {item}
          </li>
        );
      })}
    </ul>
  );
}
