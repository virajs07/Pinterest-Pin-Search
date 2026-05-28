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
            // mousedown fires before the input's blur, so the option doesn't
            // unmount before the click lands. preventDefault keeps focus on
            // the input (preserving keyboard context for screen readers).
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(item)}
          >
            {item}
          </li>
        );
      })}
    </ul>
  );
}
