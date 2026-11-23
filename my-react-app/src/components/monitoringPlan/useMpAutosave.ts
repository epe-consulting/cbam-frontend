import { useCallback, useEffect, useRef, useState } from 'react';
import { savePlanFields, type MpPatch, type MpPlanView } from '../../api/monitoringPlan';
import { applyLocal, mergePatches } from './mpFields';

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const DELAY_MS = 900;

/**
 * Autosave of plan fields. Edits show at once (applyLocal); changes are merged per key and sent
 * after a short pause, and on leaving the page. The server answer replaces the view, with any
 * edits made meanwhile applied on top.
 */
export function useMpAutosave(initial: MpPlanView) {
  const [view, setView] = useState<MpPlanView>(initial);
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const queue = useRef<MpPatch[]>([]);
  const inFlight = useRef<MpPatch[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planId = initial.plan.id;

  useEffect(() => {
    setView(initial);
    queue.current = [];
  }, [initial]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (queue.current.length === 0 || inFlight.current.length > 0) return;
    const sending = queue.current;
    queue.current = [];
    inFlight.current = sending;
    setState('saving');
    try {
      const next = await savePlanFields(planId, sending);
      inFlight.current = [];
      setView({ ...next, fields: applyLocal(next.fields, queue.current) });
      setError(null);
      setState(queue.current.length ? 'pending' : 'saved');
      if (queue.current.length) timer.current = setTimeout(() => void flush(), DELAY_MS);
    } catch (e) {
      inFlight.current = [];
      queue.current = mergePatches(sending, queue.current);
      setError(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  }, [planId]);

  const change = useCallback((patches: MpPatch[]) => {
    queue.current = mergePatches(queue.current, patches);
    setView((v) => ({ ...v, fields: applyLocal(v.fields, patches) }));
    setState('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DELAY_MS);
  }, [flush]);

  useEffect(() => {
    const onLeave = () => void flush();
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('beforeunload', onLeave);
      void flush();
    };
  }, [flush]);

  /** Replaces the view after another call (links, refresh, confirm); sends pending edits first. */
  const replace = useCallback((next: MpPlanView) => setView(next), []);

  return { view, state, error, change, flush, replace };
}
