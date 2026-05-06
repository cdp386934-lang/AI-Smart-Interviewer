export function throttle<T extends (...args: any[]) => any>(fn: T, wait = 300) {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    }
  };
}
