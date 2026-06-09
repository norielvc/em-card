'use client';

import { useEffect } from 'react';

export default function DevErrorSuppressor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const isExtensionRelated = (str) => {
      if (!str) return false;
      return str.includes('extension') || str.includes('chrome-extension') || str.includes('moz-extension');
    };

    const isWalletExtensionError = (err) => {
      // MetaMask and other wallet extensions throw objects with code + message
      return err && typeof err === 'object' && (
        err.code !== undefined ||
        (err.message && (err.message.includes('wallet') || err.message.includes('account')))
      );
    };

    const isObjectError = (err) => {
      return err && typeof err === 'object' && !(err instanceof Error);
    };

    const onError = (event) => {
      // Suppress extension file errors
      if (event.filename && isExtensionRelated(event.filename)) {
        event.stopImmediatePropagation();
        return;
      }
      // Suppress "[object Object]" errors (often from extensions throwing objects)
      if (event.message && event.message.includes('[object Object]')) {
        event.stopImmediatePropagation();
        return;
      }
      // Suppress wallet extension errors (MetaMask, etc.)
      if (isWalletExtensionError(event.error)) {
        event.stopImmediatePropagation();
        return;
      }
      // Suppress if the error itself is an object (not an Error instance)
      if (isObjectError(event.error)) {
        event.stopImmediatePropagation();
        return;
      }
    };

    const onUnhandledRejection = (event) => {
      const reason = event.reason;
      if (!reason) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      // Suppress wallet extension rejections
      if (isWalletExtensionError(reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      // Suppress extension-related rejections
      if (reason.stack && isExtensionRelated(reason.stack)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      // Suppress object rejections (extensions often reject with plain objects)
      if (isObjectError(reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      // Suppress message-based extension errors
      if (reason.message && isExtensionRelated(reason.message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onUnhandledRejection, true);

    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onUnhandledRejection, true);
    };
  }, []);

  return null;
}
