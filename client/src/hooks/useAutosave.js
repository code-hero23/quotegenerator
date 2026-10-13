import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Universal Autosave Hook:
 * 1. Saves on EVERY change (debounced at debounceMs, default 300ms).
 * 2. Runs periodic safety timer (every intervalMs, default 5000ms).
 * 3. Saves immediately when switching browser tabs (visibilitychange & blur).
 * 4. Saves immediately when closing Chrome tab or refreshing (beforeunload & pagehide).
 *
 * @param {Object} options
 * @param {any} options.data - The data object to watch and persist.
 * @param {Function} options.onSave - Save callback (data) => Promise<void> | void.
 * @param {number} [options.intervalMs=5000] - Periodic fallback interval (default: 5000ms).
 * @param {number} [options.debounceMs=300] - Debounce delay after any edit (default: 300ms).
 * @param {boolean} [options.enabled=true] - Toggle autosave on/off.
 */
export function useAutosave({
  data,
  onSave,
  intervalMs = 5000,
  debounceMs = 300,
  enabled = true
}) {
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved' | 'error'
  const [lastSavedAt, setLastSavedAt] = useState(() => new Date());

  const latestDataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const lastSavedDataRef = useRef(JSON.stringify(data));
  const isSavingRef = useRef(false);
  const debounceTimerRef = useRef(null);

  // Synchronous flush function: guaranteed to execute synchronously on unload/blur/visibility
  const flushImmediately = useCallback(() => {
    if (!enabled) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

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
      console.error('Flush autosave failed on page unload/blur:', err);
    }
  }, [enabled]);

  // Async save action with state tracking
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

  // Trigger 1: Save on EVERY change with short debounce
  useEffect(() => {
    latestDataRef.current = data;
    onSaveRef.current = onSave;

    if (!enabled) return;

    try {
      const currentSerialized = JSON.stringify(data);
      if (currentSerialized !== lastSavedDataRef.current) {
        setSaveStatus('unsaved');

        // Reset debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          executeSave();
        }, debounceMs);
      }
    } catch {
      // Ignore serialization issues
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, onSave, enabled, debounceMs, executeSave]);

  // Trigger 2: Periodic heartbeat interval (every 5 seconds)
  useEffect(() => {
    if (!enabled) return;

    const intervalTimer = setInterval(() => {
      executeSave();
    }, intervalMs);

    return () => clearInterval(intervalTimer);
  }, [intervalMs, enabled, executeSave]);

  // Trigger 3 & 4: Save immediately on tab switch, window blur, tab close, or refresh
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

    const handleWindowBlur = () => {
      flushImmediately();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, flushImmediately]);

  const markAsSaved = useCallback((customData) => {
    const target = customData !== undefined ? customData : latestDataRef.current;
    try {
      lastSavedDataRef.current = JSON.stringify(target);
      setSaveStatus('saved');
    } catch {
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
