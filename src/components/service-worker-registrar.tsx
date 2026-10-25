'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { saveSubscriptionAction } from '@/lib/actions/pushActions';

const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BGl1ZM5bQwHkzV_0gXhyTCSjJDn-Hz_0PqQAeP1EQk2_A1kjc7yWCZOgjKZScUTUcUB2G1BaNW3bmaV6SZqEFA4';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function ServiceWorkerRegistrar() {
  const { toast } = useToast();
  const { user } = useUser();
  const syncedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerSW = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
          toast({
            title: 'Service Worker Failed',
            description: 'Push notifications and offline capabilities might not work.',
            variant: 'destructive',
          });
        });
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }
  }, [toast]);

  // Automatically sync push subscription for logged-in users who have granted browser notification permission
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !user?.uid ||
      !('serviceWorker' in navigator) ||
      !('Notification' in window) ||
      !('PushManager' in window)
    ) {
      return;
    }

    if (Notification.permission !== 'granted') return;
    if (syncedUserRef.current === user.uid) return;

    let cancelled = false;

    const syncPushSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription && DEFAULT_VAPID_PUBLIC_KEY) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(DEFAULT_VAPID_PUBLIC_KEY),
          });
        }

        if (subscription && !cancelled) {
          await saveSubscriptionAction({
            userId: user.uid,
            subscription: subscription.toJSON(),
          });
          syncedUserRef.current = user.uid;
        }
      } catch (err) {
        console.warn('[SW] Auto-sync push subscription skipped:', err);
      }
    };

    syncPushSubscription();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return null;
}
