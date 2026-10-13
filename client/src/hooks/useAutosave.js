import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook that runs autosave every `intervalMs` milliseconds (default: 5000ms / 5 seconds).
 * - Only triggers save when data has actually changed (dirty check).
 * - Avoids concurrent overlapping async saves.
 * - Tracks status: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'.
 * - Provides `saveNow` to force immediate save.
 *
 * @param {Object} options
 * @param {any} options.data - The data object to watch and persist.
 * @param {Function} options.onSave - Async or sync callback (data) => Promise<void> | void.
 * @param {number} [options.intervalMs=5000] - Save frequency in ms (default: 5000).
 * @param {boolean} [options.enabled=true] - Toggle autosave on/off.
 */
export function useAutosave({ data, onSave, intervalMs = 5000, enabled = true }) {
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved' | 'error'
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // References to keep closures fresh without resetting the timer
  const latestDataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const lastSavedDataRef = useRef(JSON.stringify(data));
  const isSavingRef = useRef(false);

  // Keep callback and data refs up to date
  useEffect(() => {
    latestDataRef.current = data;
    onSaveRef.current = onSave;

    if (!enabled) return;

    try {
      const currentSerialized = JSON.stringify(data);
      if (currentSerialized !== lastSavedDataRef.current && saveStatus !== 'saving') {
        setSaveStatus('unsaved');
      }
    } catch (e) {
      // Ignore circular or serialization errors
    }
  }, [data, onSave, enabled, saveStatus]);

  // Execute the save action
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

    // Skip if data is identical to last saved
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

  // Periodic interval every intervalMs (5 seconds)
  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      executeSave();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs, enabled, executeSave]);

  // Helper to mark current state as saved (e.g. after initial restore)
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
    markAsSaved
  };
}
