import { createContext, useCallback, useContext, useMemo, useState } from "react";

const CommandContext = createContext(null);

export function CommandProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState(null);
  const [pendingNewBooking, setPendingNewBooking] = useState(false);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);
  const togglePalette = useCallback(() => setOpen((o) => !o), []);

  const requestRange = useCallback((range) => {
    setPendingRange(range);
    setOpen(false);
  }, []);

  const consumeRange = useCallback(() => {
    const r = pendingRange;
    setPendingRange(null);
    return r;
  }, [pendingRange]);

  const requestNewBooking = useCallback(() => {
    setPendingNewBooking(true);
    setOpen(false);
  }, []);

  const consumeNewBooking = useCallback(() => {
    const v = pendingNewBooking;
    setPendingNewBooking(false);
    return v;
  }, [pendingNewBooking]);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      openPalette,
      closePalette,
      togglePalette,
      requestRange,
      consumeRange,
      pendingRange,
      requestNewBooking,
      consumeNewBooking,
      pendingNewBooking,
    }),
    [
      open,
      openPalette,
      closePalette,
      togglePalette,
      requestRange,
      consumeRange,
      pendingRange,
      requestNewBooking,
      consumeNewBooking,
      pendingNewBooking,
    ]
  );

  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>;
}

export function useCommand() {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error("useCommand must be used within CommandProvider");
  return ctx;
}
