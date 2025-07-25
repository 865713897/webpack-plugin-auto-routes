export function debounce<A extends any[], R>(
  func: (...args: A) => R,
  wait: number,
  immediate: boolean = false,
): (...args: A) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: A) {
    const later = () => {
      timeout = null;
      if (!immediate) {
        func(...args);
      }
    };

    const shouldCallNow = immediate && !timeout;
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (shouldCallNow) {
      func(...args);
    }
  };
}