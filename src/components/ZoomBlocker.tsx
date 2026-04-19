'use client';

import { useEffect } from 'react';

/**
 * ZoomBlocker - Blocks all zoom gestures on mobile to make the app feel native
 *
 * iOS Safari (since iOS 10) ignores viewport meta user-scalable=no for accessibility.
 * This component uses JavaScript to intercept and prevent:
 * - Pinch-to-zoom (2+ finger touch gestures)
 * - Double-tap-to-zoom
 * - Ctrl+scroll zoom on desktop
 * - Safari gesture events
 */
export default function ZoomBlocker() {
  useEffect(() => {
    // Block pinch-to-zoom by preventing default on multi-touch move
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Block Safari-specific gesture events (gesturestart, gesturechange, gestureend)
    const handleGesture = (e: Event) => {
      e.preventDefault();
    };

    // Block double-tap zoom by tracking last tap time
    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    // Block Ctrl+scroll zoom on desktop
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    // Block Ctrl+/Cmd+ keyboard zoom shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault();
      }
    };

    // Add all event listeners
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('gesturestart', handleGesture);
    document.addEventListener('gesturechange', handleGesture);
    document.addEventListener('gestureend', handleGesture);
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', handleGesture);
      document.removeEventListener('gesturechange', handleGesture);
      document.removeEventListener('gestureend', handleGesture);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null; // This component renders nothing
}
