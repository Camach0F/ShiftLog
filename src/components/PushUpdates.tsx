import { useEffect } from 'react';

import { disableUpdatePush, enableUpdatePush } from '@/lib/push';
import { useStore } from '@/lib/store';
import { useTourState } from '@/lib/tour';

/**
 * Keeps the phone subscribed to the "new version" push notifications while "Avisar de versiones
 * nuevas" is on, and unsubscribes when it is turned off. The first permission request waits for
 * the guide to be closed, so two dialogs never pile up.
 */
export function PushUpdates() {
  const { state, ready } = useStore();
  const { open: tourOpen } = useTourState();
  const { checkUpdates } = state.settings;

  useEffect(() => {
    if (!ready || tourOpen) return;
    if (checkUpdates) enableUpdatePush();
    else disableUpdatePush();
  }, [ready, tourOpen, checkUpdates]);

  return null;
}
