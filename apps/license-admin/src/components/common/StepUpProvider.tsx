/**
 * Step-up authentication context (spec §27.3, §12.10).
 *
 * Provides a global `requestStepUp(callback)` API that any component can
 * call before performing a sensitive operation (revoke license, rotate
 * signing key, revoke API key). If the admin already has a valid step-up
 * token in the auth store, the callback fires immediately; otherwise the
 * StepUpModal opens and the callback fires after the admin re-enters MFA.
 *
 * Mounted once at the root of the authenticated app.
 */
import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StepUpModal } from '../common/StepUpModal';
import {
  selectHasStepUp,
  useAuthStore,
} from '../../store/auth';

interface StepUpContextValue {
  /** Request a step-up session before performing a sensitive operation. */
  requestStepUp: (callback: () => void, opts?: { titleKey?: string; descriptionKey?: string }) => void;
}

const StepUpContext = createContext<StepUpContextValue | null>(null);

export function StepUpProvider({ children }: { readonly children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  const [titleKey, setTitleKey] = useState<string | undefined>(undefined);
  const [descriptionKey, setDescriptionKey] = useState<string | undefined>(undefined);
  const callbackRef = useRef<(() => void) | null>(null);
  const hasStepUp = useAuthStore(selectHasStepUp);

  const requestStepUp = useCallback(
    (callback: () => void, opts?: { titleKey?: string; descriptionKey?: string }) => {
      callbackRef.current = callback;
      setTitleKey(opts?.titleKey);
      setDescriptionKey(opts?.descriptionKey);
      if (hasStepUp) {
        // Already step-up — fire immediately.
        callback();
        callbackRef.current = null;
        return;
      }
      setOpened(true);
    },
    [hasStepUp],
  );

  const handleConfirmed = useCallback(() => {
    const cb = callbackRef.current;
    callbackRef.current = null;
    if (cb) {cb();}
  }, []);

  const handleClose = useCallback(() => {
    setOpened(false);
    callbackRef.current = null;
  }, []);

  const value = useMemo<StepUpContextValue>(() => ({ requestStepUp }), [requestStepUp]);

  return (
    <StepUpContext.Provider value={value}>
      {children}
      <StepUpModal
        opened={opened}
        onClose={handleClose}
        onConfirmed={handleConfirmed}
        titleKey={titleKey}
        descriptionKey={descriptionKey}
      />
    </StepUpContext.Provider>
  );
}

/**
 * Hook to access the step-up API. Returns `requestStepUp(callback)` — call
 * it immediately before a sensitive mutation. The provider handles the
 * modal display, the MFA verification, and the step-up token storage.
 */
export function useStepUp(): StepUpContextValue {
  const ctx = useContext(StepUpContext);
  if (!ctx) {
    throw new Error('useStepUp must be used inside a <StepUpProvider>');
  }
  return ctx;
}
