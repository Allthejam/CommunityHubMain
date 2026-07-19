'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Loader2 } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type Notification } from '@/lib/types/notifications';

function getNotificationIcon(type: string) {
  switch (type) {
    case 'Event Request':
      return '📅';
    case 'Business Submission':
      return '💼';
    case 'News Story Submission':
      return '📰';
    case 'Partnership Request':
      return '🤝';
    case 'New Message':
      return '💬';
    case 'General Inquiry':
      return '✉️';
    case 'New Report':
      return '⚠️';
    case 'Leadership Invitation':
      return '👑';
    case 'Special Access Request':
      return '🔑';
    case 'Leader Information Update':
      return '🔑';
    case 'Boundary Dispute':
      return '⚖️';
    case 'Leadership Application':
      return '👑';
    case 'Advertiser Profile':
      return '💼';
    case 'New Order':
    case 'Order Update':
      return '🛒';
    default:
      return '🔔';
  }
}

function getNotificationLink(notification: Notification) {
  let path = '#';
  if (notification.actionUrl) {
    path = notification.actionUrl;
  } else {
    switch (notification.type) {
      case 'New Message':
        if (notification.subject.includes("Platform Support")) {
          path = `/leader/chat?conversationId=${notification.relatedId}`;
        } else if (notification.from === "Platform Administration") {
          path = `/admin/staff-chat?conversationId=${notification.relatedId}`;
        } else {
          path = `/chat?conversationId=${notification.relatedId}`;
        }
        break;
      case 'New Report':
        path = '/leader/reports';
        break;
      case 'Lost & Found Report':
        path = '/leader/lost-and-found';
        break;
      case 'Event Request':
        path = '/leader/events';
        break;
      case 'Business Submission':
        path = '/leader/businesses';
        break;
      case 'News Story Submission':
        path = '/leader/news';
        break;
      case 'Advert Approval Request':
        path = '/leader/adverts';
        break;
      case 'Charity Application':
        path = '/leader/charities';
        break;
      case 'Leadership Application':
        path = '/leader/applications';
        break;
      case 'New Order':
      case 'Order Update':
        path = '/business/orders';
        break;
      default:
        path = '/notifications';
        break;
    }
  }
  return path;
}

export function NotificationBell() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(firestore, 'notifications'),
      where('recipientId', '==', user.uid),
      where('status', '==', 'new')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Notification)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, firestore]);

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
          <Bell className="h-5 w-5" />
          {!loading && notifications.length > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">
              {notifications.length}
            </Badge>
          )}
          <span className="sr-only">View notifications</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <span className="font-extrabold text-xs text-slate-700">Notifications</span>
          {!loading && notifications.length > 0 && (
            <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
              {notifications.length} New
            </Badge>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No new notifications</div>
          ) : (
            notifications.slice(0, 6).map((n) => {
              const path = getNotificationLink(n);
              const icon = getNotificationIcon(n.type);
              return (
                <DropdownMenuItem
                  key={n.id}
                  className="p-3 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 flex items-start gap-3 focus:bg-slate-50"
                  onClick={async () => {
                    try {
                      await updateDoc(doc(firestore, 'notifications', n.id), { status: 'read' });
                    } catch (err) {
                      console.error('Failed to mark notification as read', err);
                    }
                    router.push(path);
                  }}
                >
                  <div className="text-base bg-slate-100 p-1.5 rounded-lg shrink-0 w-8 h-8 flex items-center justify-center">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 line-clamp-1">{n.from || 'Notification'}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{n.subject}</p>
                    <p className="text-[9px] text-slate-400 mt-1">
                      {n.date
                        ? typeof n.date === 'string'
                          ? n.date
                          : n.date.toDate
                          ? n.date.toDate().toLocaleDateString('en-GB')
                          : 'Just now'
                        : 'Just now'}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem asChild className="p-0">
          <Link
            href="/notifications"
            className="cursor-pointer w-full text-center py-2.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 bg-slate-50/50 hover:bg-slate-50 flex justify-center items-center"
          >
            See All Notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
