import { useState, useEffect } from 'react';

const EDITOR_MOBILE_MQ = '(max-width: 768px)';

/** True when editor should use compact / collapsible mobile patterns. */
export function useEditorMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(EDITOR_MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isMobile;
}

/** Initial open state: expanded on desktop, collapsed on mobile (SSR-safe). */
export function useEditorMobileSectionInitiallyOpen(): boolean {
  return typeof window !== 'undefined' ? !window.matchMedia(EDITOR_MOBILE_MQ).matches : true;
}
