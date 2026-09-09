'use client';

import { useEffect } from 'react';

/**
 * GlobalScrollLocker
 * Universally disables background scrolling whenever any modal or mobile drawer menu is open.
 * Works seamlessly across desktop laptops and mobile devices (iOS Safari, Android Chrome).
 */
export default function GlobalScrollLocker() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const modalSelectors = [
      '.modal-overlay',
      '.card-modal-overlay',
      '.event-modal-overlay',
      '.print-modal-overlay',
      '.scan-result-overlay',
      '.sidebar-overlay',
      '.admin-sidebar.open'
    ].join(', ');

    let isLocked = false;

    const updateScrollLock = () => {
      const activeOverlay = document.querySelector(modalSelectors);
      const shouldLock = Boolean(activeOverlay);

      if (shouldLock && !isLocked) {
        isLocked = true;
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
      } else if (!shouldLock && isLocked) {
        isLocked = false;
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        document.body.style.touchAction = '';
      }
    };

    updateScrollLock();

    const observer = new MutationObserver(updateScrollLock);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  return null;
}
