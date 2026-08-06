'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, addDoc, serverTimestamp, doc, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageSquare, 
  Send, 
  Store, 
  User, 
  MapPin, 
  Package, 
  Truck, 
  Phone, 
  Loader2, 
  Search, 
  CheckCircle2,
  Users,
  Paperclip,
  Clock,
  ShieldCheck,
  Building,
  ExternalLink,
  Plus
} from 'lucide-react';
import { useActiveCommunityId } from '@/hooks/use-active-community-id';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'courier' | 'store' | 'customer' | 'leader';
  text: string;
  orderId?: string;
  orderSummary?: {
    orderNumber: string;
    storeName: string;
    customerName: string;
    shippingAddress: string;
    status: string;
  };
  createdAt: any;
};

type DeliveryThread = {
  id: string;
  orderId?: string;
  storeName: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress: string;
  status: string;
  lastMessage?: string;
  lastMessageTime?: string;
  recipientId?: string;
  recipientRole?: string;
};

type CommunityUser = {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  role?: string;
  accountType?: string;
  photoURL?: string;
};

type OrderDoc = {
  id: string;
  orderNumber?: string;
  storeName?: string;
  customerName?: string;
  buyerName?: string;
  shippingAddress?: string;
  status?: string;
  createdAt?: any;
};

// Initial default threads for initial view
const initialThreads: DeliveryThread[] = [
  {
    id: 'thread-1',
    orderId: 'ORD-8492',
    storeName: 'High Street Bakery',
    customerName: 'Sarah Jenkins',
    customerPhone: '+44 7700 900123',
    shippingAddress: '14 Park Lane, Flat 2B',
    status: 'Shipped',
    lastMessage: 'I am outside with your order now!',
    lastMessageTime: '10:42 AM',
  },
  {
    id: 'thread-2',
    orderId: 'ORD-8471',
    storeName: 'Village Hardware & Tools',
    customerName: 'Mark Thompson',
    customerPhone: '+44 7700 900456',
    shippingAddress: '88 Church Street',
    status: 'Packed',
    lastMessage: 'Package is boxed and ready for pickup behind counter.',
    lastMessageTime: '09:15 AM',
  },
];

export default function CourierChatPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { communityId, userProfile, isLoading: activeCommunityLoading } = useActiveCommunityId();

  // Active Tab in Sidebar: 'chats' | 'users' | 'orders'
  const [sidebarTab, setSidebarTab] = React.useState('chats');
  const [selectedThread, setSelectedThread] = React.useState<DeliveryThread>(initialThreads[0]);
  const [threads, setThreads] = React.useState<DeliveryThread[]>(initialThreads);

  // Search States
  const [chatSearchQuery, setChatSearchQuery] = React.useState('');
  const [userSearchQuery, setUserSearchQuery] = React.useState('');
  const [orderSearchQuery, setOrderSearchQuery] = React.useState('');

  // Message composer state
  const [inputText, setInputText] = React.useState('');
  const [attachedOrderId, setAttachedOrderId] = React.useState<string>('none');

  // Live Firestore Query: Community Users matching active communityId across all Firestore field schemas
  const usersQuery1 = useMemoFirebase(
    () => (communityId ? query(collection(db, 'users'), where('communityId', '==', communityId)) : null),
    [communityId, db]
  );
  const usersQuery2 = useMemoFirebase(
    () => (communityId ? query(collection(db, 'users'), where('primaryCommunityId', '==', communityId)) : null),
    [communityId, db]
  );
  const usersQuery3 = useMemoFirebase(
    () => (communityId ? query(collection(db, 'users'), where('homeCommunityId', '==', communityId)) : null),
    [communityId, db]
  );
  const allUsersQuery = useMemoFirebase(
    () => (communityId ? query(collection(db, 'users'), limit(100)) : null),
    [communityId, db]
  );

  const { data: usersData1, isLoading: loading1 } = useCollection<CommunityUser>(usersQuery1);
  const { data: usersData2 } = useCollection<CommunityUser>(usersQuery2);
  const { data: usersData3 } = useCollection<CommunityUser>(usersQuery3);
  const { data: allUsersData, isLoading: loadingAll } = useCollection<CommunityUser>(allUsersQuery);

  const usersLoading = loading1 && loadingAll;

  // Deduplicate and filter strictly for users registered to this active community
  const localUsersList = React.useMemo(() => {
    if (!communityId) return [];
    const map = new Map<string, CommunityUser>();

    const checkAndAdd = (u: CommunityUser) => {
      if (!u || !u.id || map.has(u.id)) return;
      const isMatch =
        u.communityId === communityId ||
        u.primaryCommunityId === communityId ||
        u.homeCommunityId === communityId ||
        (u.communityRoles && u.communityRoles[communityId]) ||
        (Array.isArray(u.communityIds) && u.communityIds.includes(communityId));
      if (isMatch) {
        map.set(u.id, u);
      }
    };

    (usersData1 || []).forEach(checkAndAdd);
    (usersData2 || []).forEach(checkAndAdd);
    (usersData3 || []).forEach(checkAndAdd);
    (allUsersData || []).forEach(checkAndAdd);

    return Array.from(map.values());
  }, [communityId, usersData1, usersData2, usersData3, allUsersData]);

  // Live Firestore Query: Community Orders (/orders where communityId == communityId)
  const ordersQuery = useMemoFirebase(
    () =>
      communityId
        ? query(
            collection(db, 'orders'),
            where('communityId', '==', communityId),
            limit(30)
          )
        : null,
    [communityId, db]
  );
  const { data: communityOrdersData } = useCollection<OrderDoc>(ordersQuery);

  // Live Firestore Messages Query for selected thread
  const messagesQuery = useMemoFirebase(
    () =>
      communityId && selectedThread?.id
        ? query(
            collection(db, `communities/${communityId}/courier_chats/${selectedThread.id}/messages`),
            orderBy('createdAt', 'asc')
          )
        : null,
    [communityId, selectedThread?.id, db]
  );
  const { data: firestoreMessages } = useCollection<ChatMessage>(messagesQuery);

  // Local state messages fallback
  const [localMessages, setLocalMessages] = React.useState<Record<string, ChatMessage[]>>({
    'thread-1': [
      {
        id: 'm1',
        senderId: 'store-1',
        senderName: 'High Street Bakery',
        senderRole: 'store',
        text: 'Order ORD-8492 is packed and ready for collection!',
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        id: 'm2',
        senderId: user?.uid || 'courier-1',
        senderName: userProfile?.name || 'Courier',
        senderRole: 'courier',
        text: 'On my way! Estimated arrival in 5 minutes.',
        createdAt: new Date(Date.now() - 1000 * 60 * 20),
      },
      {
        id: 'm3',
        senderId: 'customer-1',
        senderName: 'Sarah Jenkins',
        senderRole: 'customer',
        text: 'Great! Please leave it by the blue side door if I do not answer.',
        createdAt: new Date(Date.now() - 1000 * 60 * 10),
      },
    ],
    'thread-2': [
      {
        id: 'm2-1',
        senderId: 'store-2',
        senderName: 'Village Hardware & Tools',
        senderRole: 'store',
        text: 'Package ORD-8471 is boxed and ready for pickup behind counter.',
        createdAt: new Date(Date.now() - 1000 * 60 * 45),
      },
    ],
  });

  const activeMessages = (firestoreMessages && firestoreMessages.length > 0)
    ? firestoreMessages
    : (localMessages[selectedThread.id] || []);

  // Filtered lists
  const filteredThreads = React.useMemo(() => {
    if (!chatSearchQuery.trim()) return threads;
    const q = chatSearchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.orderId?.toLowerCase().includes(q) ||
        t.storeName.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q)
    );
  }, [threads, chatSearchQuery]);

  const filteredUsers = React.useMemo(() => {
    if (!userSearchQuery.trim()) return localUsersList;
    const q = userSearchQuery.toLowerCase();
    return localUsersList.filter(
      (u) =>
        (u.name || u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || u.accountType || '').toLowerCase().includes(q)
    );
  }, [localUsersList, userSearchQuery]);

  const filteredOrders = React.useMemo(() => {
    const list = communityOrdersData || [];
    if (!orderSearchQuery.trim()) return list;
    const q = orderSearchQuery.toLowerCase();
    return list.filter(
      (o) =>
        (o.orderNumber || o.id).toLowerCase().includes(q) ||
        (o.storeName || '').toLowerCase().includes(q) ||
        (o.customerName || o.buyerName || '').toLowerCase().includes(q)
    );
  }, [communityOrdersData, orderSearchQuery]);

  // Start new chat with community user
  const handleStartUserChat = (targetUser: CommunityUser) => {
    const userName = targetUser.name || targetUser.displayName || targetUser.email || 'Community Member';
    const existingThread = threads.find((t) => t.recipientId === targetUser.id || t.customerName === userName);

    if (existingThread) {
      setSelectedThread(existingThread);
      setSidebarTab('chats');
      toast({ title: 'Chat Opened', description: `Opened chat thread with ${userName}.` });
      return;
    }

    const newThread: DeliveryThread = {
      id: `thread-user-${Date.now()}`,
      storeName: 'Direct Community Dispatch',
      customerName: userName,
      customerPhone: targetUser.phone || 'N/A',
      shippingAddress: 'Local Community Member',
      status: 'General Chat',
      lastMessage: 'Started new direct community chat',
      lastMessageTime: format(new Date(), 'HH:mm'),
      recipientId: targetUser.id,
      recipientRole: targetUser.role || targetUser.accountType || 'Member',
    };

    setThreads((prev) => [newThread, ...prev]);
    setSelectedThread(newThread);
    setSidebarTab('chats');
    toast({ title: 'Direct Chat Started', description: `Chat channel created with ${userName}.` });
  };

  // Start new chat from an active order
  const handleStartOrderChat = (order: OrderDoc) => {
    const orderNum = order.orderNumber || order.id || 'ORD-NEW';
    const store = order.storeName || 'Local Highstreet Merchant';
    const customer = order.customerName || order.buyerName || 'Local Customer';
    
    const existingThread = threads.find((t) => t.orderId === orderNum);
    if (existingThread) {
      setSelectedThread(existingThread);
      setSidebarTab('chats');
      toast({ title: 'Order Chat Opened', description: `Opened delivery chat for Order #${orderNum}.` });
      return;
    }

    const newThread: DeliveryThread = {
      id: `thread-order-${Date.now()}`,
      orderId: orderNum,
      storeName: store,
      customerName: customer,
      shippingAddress: order.shippingAddress || 'Highstreet Hub Address',
      status: order.status || 'Active Delivery',
      lastMessage: `Dispatch thread created for Order ${orderNum}`,
      lastMessageTime: format(new Date(), 'HH:mm'),
    };

    setThreads((prev) => [newThread, ...prev]);
    setSelectedThread(newThread);
    setSidebarTab('chats');
    toast({ title: 'Order Chat Created', description: `Dispatch thread created for Order #${orderNum}.` });
  };

  // Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && attachedOrderId === 'none') return;

    let orderSummaryObj: any = undefined;
    if (attachedOrderId !== 'none') {
      const orderMatch = communityOrdersData?.find((o) => o.id === attachedOrderId || o.orderNumber === attachedOrderId);
      orderSummaryObj = {
        orderNumber: orderMatch?.orderNumber || selectedThread.orderId || attachedOrderId,
        storeName: orderMatch?.storeName || selectedThread.storeName,
        customerName: orderMatch?.customerName || orderMatch?.buyerName || selectedThread.customerName,
        shippingAddress: orderMatch?.shippingAddress || selectedThread.shippingAddress,
        status: orderMatch?.status || selectedThread.status || 'Active Delivery',
      };
    }

    const senderNameVal = userProfile?.courierName || userProfile?.name || 'Community Courier';
    const messageText = inputText.trim() || (orderSummaryObj ? `[Attached Order Info: #${orderSummaryObj.orderNumber}]` : '');

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user?.uid || 'courier-1',
      senderName: senderNameVal,
      senderRole: 'courier',
      text: messageText,
      orderSummary: orderSummaryObj,
      createdAt: new Date(),
    };

    // Save to Firestore if connected to live community
    if (communityId && selectedThread?.id) {
      try {
        const msgsRef = collection(db, `communities/${communityId}/courier_chats/${selectedThread.id}/messages`);
        await addDoc(msgsRef, {
          senderId: user?.uid || 'courier-1',
          senderName: senderNameVal,
          senderRole: 'courier',
          text: messageText,
          orderSummary: orderSummaryObj || null,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firestore write fallback to local state:', err);
      }
    }

    // Fallback local state update
    setLocalMessages((prev) => ({
      ...prev,
      [selectedThread.id]: [...(prev[selectedThread.id] || []), newMessage],
    }));

    // Update last message in thread list
    setThreads((prev) =>
      prev.map((t) =>
        t.id === selectedThread.id
          ? { ...t, lastMessage: messageText, lastMessageTime: format(new Date(), 'HH:mm') }
          : t
      )
    );

    setInputText('');
    setAttachedOrderId('none');
  };

  if (isUserLoading || activeCommunityLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            Courier Community Dispatch Chat
          </h1>
          <p className="text-muted-foreground mt-1">
            Connected to your local community user database and active order dispatch streams.
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1 text-xs self-start sm:self-center">
          <ShieldCheck className="mr-1.5 h-4 w-4" /> Live Community Database
        </Badge>
      </div>

      {/* Main 2-Column Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
        {/* Left Sidebar: 3 Tabs (Chats, User Directory, Community Orders) */}
        <Card className="lg:col-span-4 flex flex-col h-full overflow-hidden border shadow-sm">
          <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex flex-col h-full w-full">
            <div className="p-3 border-b bg-muted/40">
              <TabsList className="grid grid-cols-3 w-full h-8 text-xs bg-muted/60 p-0.5">
                <TabsTrigger value="chats" className="text-[11px] py-1">
                  Chats ({threads.length})
                </TabsTrigger>
                <TabsTrigger value="users" className="text-[11px] py-1">
                  Users ({localUsersList.length})
                </TabsTrigger>
                <TabsTrigger value="orders" className="text-[11px] py-1">
                  Orders ({communityOrdersData?.length || 0})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: Active Chats List */}
            <TabsContent value="chats" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search chats, stores, orders..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredThreads.length > 0 ? (
                  filteredThreads.map((thread) => {
                    const isSelected = selectedThread.id === thread.id;
                    return (
                      <button
                        key={thread.id}
                        onClick={() => setSelectedThread(thread)}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex flex-col gap-1 border ${
                          isSelected
                            ? 'bg-primary/10 border-primary/30 shadow-sm'
                            : 'hover:bg-muted/50 border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs font-mono flex items-center gap-1.5">
                            {thread.orderId ? (
                              <Badge variant="secondary" className="text-[10px] py-0 font-mono">
                                #{thread.orderId}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 bg-blue-50 text-blue-700">
                                Direct User
                              </Badge>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{thread.lastMessageTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{thread.storeName}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{thread.customerName} &bull; {thread.lastMessage}</p>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    No active chats matching search.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: Community User Directory */}
            <TabsContent value="users" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search local users, store owners..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {usersLoading ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <div key={u.id} className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <Avatar className="h-8 w-8 border shrink-0">
                          <AvatarImage src={u.photoURL} />
                          <AvatarFallback>{(u.name || u.displayName || u.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <h4 className="font-semibold text-xs truncate">{u.name || u.displayName || u.email}</h4>
                          <p className="text-[10px] text-muted-foreground truncate">{u.role || u.accountType || 'Community Member'} {u.phone ? `• ${u.phone}` : ''}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => handleStartUserChat(u)}
                        className="shrink-0 text-[11px] h-7 px-2"
                      >
                        <MessageSquare className="mr-1 h-3 w-3 text-primary" /> Chat
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    No community users found.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: Community Active Orders */}
            <TabsContent value="orders" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search orders, store, buyer..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((o) => (
                    <div key={o.id} className="p-2.5 rounded-lg border bg-muted/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs">#{o.orderNumber || o.id}</span>
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">{o.status || 'Active'}</Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-0.5">
                        <p className="font-semibold text-foreground">{o.storeName || 'Local Merchant'}</p>
                        <p>Customer: {o.customerName || o.buyerName || 'Local Resident'}</p>
                      </div>
                      <Button
                        type="button"
                        size="xs"
                        variant="secondary"
                        onClick={() => handleStartOrderChat(o)}
                        className="w-full text-[11px] h-7"
                      >
                        <Truck className="mr-1 h-3 w-3" /> Open Dispatch Chat
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    No active community orders found.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Right Main Thread Area */}
        <Card className="lg:col-span-8 flex flex-col h-full overflow-hidden border shadow-sm">
          {/* Thread Header with Structured Delivery Badges */}
          <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  {selectedThread.orderId ? `Order #${selectedThread.orderId}` : selectedThread.customerName}
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    {selectedThread.status}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <Store className="h-3.5 w-3.5 text-primary" /> {selectedThread.storeName} &bull; <User className="h-3.5 w-3.5" /> {selectedThread.customerName}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {selectedThread.customerPhone && (
                <Badge variant="secondary" className="text-[11px] flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {selectedThread.customerPhone}
                </Badge>
              )}
              <div className="flex items-center gap-1 text-muted-foreground bg-background px-2 py-1 rounded-md border text-[11px]">
                <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span className="max-w-[180px] truncate">{selectedThread.shippingAddress}</span>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-background">
            {activeMessages.map((msg) => {
              const isMe = msg.senderId === user?.uid || msg.senderRole === 'courier';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {msg.senderName} ({msg.senderRole})
                    </span>
                  </div>

                  {/* Attached Structured Order Card if present */}
                  {msg.orderSummary && (
                    <div className="mb-2 p-3 rounded-lg border bg-purple-50/60 border-purple-200 text-purple-950 space-y-1 max-w-sm shadow-sm">
                      <div className="flex items-center justify-between font-mono text-xs font-bold border-b border-purple-200 pb-1">
                        <span className="flex items-center gap-1">
                          <Package className="h-3.5 w-3.5 text-purple-600" />
                          Order #{msg.orderSummary.orderNumber}
                        </span>
                        <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-800">{msg.orderSummary.status}</Badge>
                      </div>
                      <div className="text-[11px] space-y-0.5 pt-0.5">
                        <p><strong>Merchant:</strong> {msg.orderSummary.storeName}</p>
                        <p><strong>Customer:</strong> {msg.orderSummary.customerName}</p>
                        <p className="truncate"><strong>Address:</strong> {msg.orderSummary.shippingAddress}</p>
                      </div>
                    </div>
                  )}

                  {/* Text Message Bubble */}
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl text-xs sm:text-sm shadow-sm ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-muted text-foreground rounded-tl-none border'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {msg.createdAt ? format(new Date(msg.createdAt.seconds ? msg.createdAt.seconds * 1000 : msg.createdAt), 'HH:mm') : format(new Date(), 'HH:mm')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Message Composer Footer with Order Quick-Attach */}
          <form onSubmit={handleSendMessage} className="p-3 border-t bg-card space-y-2">
            {/* Quick Order Attach Selection Bar */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" /> Attach Order:
              </span>
              <Select value={attachedOrderId} onValueChange={setAttachedOrderId}>
                <SelectTrigger className="h-7 text-xs bg-muted/40">
                  <SelectValue placeholder="Select active order to attach..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Plain Text)</SelectItem>
                  {selectedThread.orderId && (
                    <SelectItem value={selectedThread.orderId}>
                      Current Thread Order #{selectedThread.orderId}
                    </SelectItem>
                  )}
                  {communityOrdersData?.map((ord) => (
                    <SelectItem key={ord.id} value={ord.id}>
                      Order #{ord.orderNumber || ord.id} ({ord.storeName || 'Store'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder={`Message ${selectedThread.storeName} or ${selectedThread.customerName}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="text-xs sm:text-sm"
              />
              <Button type="submit" size="icon" disabled={!inputText.trim() && attachedOrderId === 'none'}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
