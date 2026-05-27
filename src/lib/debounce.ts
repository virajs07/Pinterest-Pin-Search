export function debounce<Args extends readonly unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): ((...args: Args) => void) & { cancel: () => void } {
  let handle: number | undefined;
  const debounced = (...args: Args) => {
    if (handle !== undefined) window.clearTimeout(handle);
    handle = window.setTimeout(() => fn(...args), waitMs);
  };
  debounced.cancel = () => {
    if (handle !== undefined) {
      window.clearTimeout(handle);
      handle = undefined;
    }
  };
  return debounced;
}
