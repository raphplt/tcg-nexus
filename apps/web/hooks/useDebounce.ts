import { useEffect, useState } from "react";

// Hook permettant de déboucher une valeur après un certain délai
// Cela permet d'éviter de faire des requêtes à chaque fois que l'utilisateur tape
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
