import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Bulletproof Autosave Hook:
 * - Runs every intervalMs (default 5000ms / 5 seconds) when data is dirty.
 * - Flushes pending changes immediately on window `beforeunload`, `pagehide`, and `visibilitychange`.
 * - Avoids concurrent overlapping saves.
 * - Tracks status: 'saved' | 'saving' | 'unsaved' | 'error'.
 *
 * @param {Object} options
 * @param {any} options.data - The data object to watch and persist.
 * @param {Function} options.onSave - Save callback (data) => Promise<void> | void.
 * @param {number} [options.intervalMs=5000] - Save frequency in ms (default: 5000).
 * @param {boolean} [options.enabled=true] - Toggle autosave on/off.
 */
export function useAutosave({ data, onSave, intervalMs = 5000, enabled = true }) {
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved' | 'error'
  const [lastSavedAt, setLastSavedAt] = useState(() => new Date());

  const latestDataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const lastSavedDataRef = useRef(JSON.stringify(data));
  const isSavingRef = useRef(false);

  // Keep references updated & detect dirty changes
  useEffect(() => {
    latestDataRef.current = data;
    onSaveRef.current = onSave;

    if (!enabled) return;

    try {
      const currentSerialized = JSON.stringify(data);
      if (currentSerialized !== lastSavedDataRef.current && !isSavingRef.current) {
        setSaveStatus('unsaved');
      }
    } catch (e) {
      // Ignore serialization issues
    }
  }, [data, onSave, enabled]);

  // Execute periodic save
  const executeSave = useCallback(async () => {
    if (isSavingRef.current || !enabled) return;

    const dataToSave = latestDataRef.current;
    let serialized = null;
    try {
      serialized = JSON.stringify(dataToSave);
    } catch (e) {
      console.warn('Autosave serialization failed:', e);
      return;
    }

    // Skip if unchanged
    if (serialized === lastSavedDataRef.current) {
      return;
    }

    try {
      isSavingRef.current = true;
      setSaveStatus('saving');

      await onSaveRef.current(dataToSave);

      lastSavedDataRef.current = serialized;
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Autosave execution error:', err);
      setSaveStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [enabled]);

  // Synchronous flush for tab closing or switching away
  const flushImmediately = useCallback(() => {
    if (!enabled) return;
    const dataToSave = latestDataRef.current;
    try {
      const serialized = JSON.stringify(dataToSave);
      if (serialized !== lastSavedDataRef.current) {
        onSaveRef.current(dataToSave);
        lastSavedDataRef.current = serialized;
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      }
    } catch (err) {
      console.error('Flush autosave failed on page unload:', err);
    }
  }, [enabled]);

  // Periodic timer every intervalMs (5 seconds)
  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      executeSave();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs, enabled, executeSave]);

  // Critical: Flush immediately when tab closes, user navigates away, or window is hidden
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      flushImmediately();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushImmediately();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, flushImmediately]);

  const markAsSaved = useCallback((customData) => {
    const target = customData !== undefined ? customData : latestDataRef.current;
    try {
      lastSavedDataRef.current = JSON.stringify(target);
      setSaveStatus('saved');
    } catch (e) {
      // Ignore
    }
  }, []);

  return {
    saveStatus,
    lastSavedAt,
    saveNow: executeSave,
    flushImmediately,
    markAsSaved
  };
}
