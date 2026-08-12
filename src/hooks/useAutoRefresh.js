import { useEffect, useRef, useState } from "react";

export function useAutoRefresh(callback, interval=30000) {
  const [isPaused, setIsPaused] = useState(false);
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => savedCallback.current(), interval);
    return () => clearInterval(id);
  }, [interval, isPaused]);
  return { isPaused, setIsPaused };
}
