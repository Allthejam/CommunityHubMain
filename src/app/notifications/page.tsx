
'use client';

import * as React from "react";
import {
    BellRing,
    Archive,
    CheckCircle2,
    Eye,
    Loader2,
    Mail,
    CalendarPlus,
    Building,
    Newspaper,
    Handshake,
    MessageSquare,
    AlertTriangle,
    Crown,
    Key,
    Gavel,
    ShieldAlert,
    MoreHorizontal,
    User,
    ArrowRight,
    ArrowUpDown,
    Trash2,
    ShoppingCart,
    Megaphone,
    ListTodo,
    Target,
    Siren,
    Clock,
    CheckCheck,
    ExternalLink,
    Search,
    Filter,
    Sparkles
} from "lucide-react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isValid } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { type Notification, type NotificationType } from "@/lib/types/notifications";
import { updateNotificationStatusAction, deleteNotificationAction } from "@/lib/actions/notificationActions";
import { getNotificationDestination } from "@/lib/utils/notificationRouting";
import { PaginationControls } from "@/components/ui/pagination";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function getTypeMetadata(type: NotificationType | string, subject = '') {
  const s = subject.toLowerCase();
  
  if (
    type === "Emergency Plan Update" ||
    type === "Situation Bulletin" ||
    type === "Public Emergency Alert" ||
    s.includes("emergency") ||
    s.includes("resilience") ||
    s.includes("wildfire") ||
    s.includes("flood") ||
    s.includes("sop")
  ) {
    return {
      icon: <Siren className="h-4 w-4 text-rose-600 animate-pulse" />,
      label: "Emergency & Resilience",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      accentBorder: "border-l-rose-500",
      glowBg: "bg-rose-50/40 dark:bg-rose-950/20"
    };
  }

  if (type === "Community Announcement" || s.includes("announcement") || s.includes("broadcast")) {
    return {
      icon: <Megaphone className="h-4 w-4 text-sky-600" />,
      label: "Announcement",
      badgeClass: "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
      accentBorder: "border-l-sky-500",
      glowBg: "bg-sky-50/40 dark:bg-sky-950/20"
    };
  }

  if (type === "Event Request" || s.includes("event") || s.includes("festival")) {
    return {
      icon: <CalendarPlus className="h-4 w-4 text-blue-600" />,
      label: "Event & Activity",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      accentBorder: "border-l-blue-500",
      glowBg: "bg-blue-50/40 dark:bg-blue-950/20"
    };
  }

  if (type === "News Story Submission" || s.includes("news")) {
    return {
      icon: <Newspaper className="h-4 w-4 text-purple-600" />,
      label: "News Story",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      accentBorder: "border-l-purple-500",
      glowBg: "bg-purple-50/40 dark:bg-purple-950/20"
    };
  }

  if (type === "New Order" || type === "Order Update" || type === "Business Submission" || s.includes("order")) {
    return {
      icon: <ShoppingCart className="h-4 w-4 text-emerald-600" />,
      label: "Order & Business",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      accentBorder: "border-l-emerald-500",
      glowBg: "bg-emerald-50/40 dark:bg-emerald-950/20"
    };
  }

  if (type === "Poll Alert" || type === "Petition Alert" || s.includes("poll") || s.includes("petition")) {
    return {
      icon: <ListTodo className="h-4 w-4 text-amber-600" />,
      label: "Poll & Petition",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      accentBorder: "border-l-amber-500",
      glowBg: "bg-amber-50/40 dark:bg-amber-950/20"
    };
  }

  if (type === "New Message") {
    return {
      icon: <MessageSquare className="h-4 w-4 text-teal-600" />,
      label: "Direct Message",
      badgeClass: "bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
      accentBorder: "border-l-teal-500",
      glowBg: "bg-teal-50/40 dark:bg-teal-950/20"
    };
  }

  if (type === "Leadership Invitation" || type === "Leadership Application" || type === "Special Access Request") {
    return {
      icon: <Crown className="h-4 w-4 text-indigo-600" />,
      label: "Leadership & Access",
      badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
      accentBorder: "border-l-indigo-500",
      glowBg: "bg-indigo-50/40 dark:bg-indigo-950/20"
    };
  }

  if (type === "New Report" || type === "Boundary Dispute") {
    return {
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
      label: "Safety & Reports",
      badgeClass: "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
      accentBorder: "border-l-red-500",
      glowBg: "bg-red-50/40 dark:bg-red-950/20"
    };
  }

  return {
    icon: <BellRing className="h-4 w-4 text-slate-600 dark:text-slate-400" />,
    label: type || "Notice",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    accentBorder: "border-l-slate-400",
    glowBg: "bg-slate-50/40 dark:bg-slate-900/20"
  };
}

const NotificationRow = React.memo(({ 
    notification, 
    onUpdateStatus, 
    onDelete, 
    onViewDetails, 
    isSelected, 
    onSelect,
    isLeader
}: { 
    notification: Notification; 
    onUpdateStatus: (id: string, status: "read" | "archived") => void;
    onDelete: (id: string) => void;
    onViewDetails: (notification: Notification) => void;
    isSelected: boolean;
    onSelect: (id: string, checked: boolean) => void;
    isLeader: boolean;
}) => {
    const { type, status, subject, from, date, readAt } = notification;
    const router = useRouter();

    const isDeclineNotification = notification.type === 'Special Access Request' && notification.subject.toLowerCase().includes('declined');
    const isNew = status === 'new' || status === 'New';
    const isArchived = status === 'archived' || status === 'Archived';
    const meta = getTypeMetadata(type, subject);

    const handleView = async () => {
        if (isNew) {
            onUpdateStatus(notification.id, 'read');
        }

        if (isDeclineNotification) {
            onViewDetails(notification);
            return;
        }

        const destination = getNotificationDestination(notification, isLeader);
        if (destination && destination !== '#') {
            router.push(destination);
        } else {
            onViewDetails(notification);
        }
    };

    const formattedReceivedDate = React.useMemo(() => {
        if (!date) return 'Just now';
        const d = (date as any)?.toDate ? (date as any).toDate() : new Date(date);
        if (isValid(d)) {
            return {
                relative: formatDistanceToNow(d, { addSuffix: true }),
                exact: format(d, 'd MMM yyyy, HH:mm')
            };
        }
        return { relative: 'Just now', exact: 'Just now' };
    }, [date]);

    const formattedReadDate = React.useMemo(() => {
        if (!readAt) return null;
        const d = (readAt as any)?.toDate ? (readAt as any).toDate() : new Date(readAt);
        if (isValid(d)) {
            return format(d, 'd MMM, HH:mm');
        }
        return null;
    }, [readAt]);

    const contextMenuItems = (
        <>
            <ContextMenuLabel>Actions</ContextMenuLabel>
            <ContextMenuItem onSelect={handleView}>
                <Eye className="mr-2 h-4 w-4 text-sky-500" /> View & Open Destination
            </ContextMenuItem>
            <ContextMenuSeparator />
            {isNew && (
                <ContextMenuItem onSelect={() => onUpdateStatus(notification.id, 'read')}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> Mark as Read
                </ContextMenuItem>
            )}
            {!isArchived && (
                <ContextMenuItem onSelect={() => onUpdateStatus(notification.id, 'archived')}>
                    <Archive className="mr-2 h-4 w-4 text-amber-500" /> Archive
                </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(notification.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
            </ContextMenuItem>
        </>
    );

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <TableRow 
                    onClick={handleView}
                    className={cn(
                        'cursor-pointer transition-colors border-l-4 group',
                        meta.accentBorder,
                        isNew ? `${meta.glowBg} font-medium` : 'hover:bg-muted/40'
                    )}
                >
                    <TableCell onClick={(e) => e.stopPropagation()} className="w-[44px]">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => onSelect(notification.id, !!checked)}
                            aria-label="Select notification"
                        />
                    </TableCell>

                    <TableCell className="w-[180px]">
                        <Badge variant="outline" className={cn("text-xs font-semibold px-2 py-0.5 flex items-center gap-1.5 w-fit border", meta.badgeClass)}>
                            {meta.icon}
                            <span className="truncate max-w-[120px]">{meta.label}</span>
                        </Badge>
                    </TableCell>

                    <TableCell className="min-w-[240px]">
                        <div className="flex items-center gap-2 flex-wrap">
                            {isNew && (
                                <Badge className="bg-sky-600 hover:bg-sky-700 text-[10px] font-bold px-1.5 py-0 h-4">
                                    NEW
                                </Badge>
                            )}
                            <span className={cn("text-sm text-foreground", isNew ? "font-bold" : "font-normal")}>
                                {subject}
                            </span>
                        </div>
                    </TableCell>

                    <TableCell className="w-[160px] text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground/80">{from || 'Platform System'}</span>
                    </TableCell>

                    <TableCell className="w-[200px]">
                        <div className="flex flex-col text-xs">
                            <span className="text-foreground/90 font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {formattedReceivedDate.exact}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                {formattedReceivedDate.relative}
                            </span>
                        </div>
                    </TableCell>

                    <TableCell className="w-[150px]">
                        {isNew ? (
                            <Badge variant="outline" className="text-[10px] font-bold text-sky-700 border-sky-300 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300">
                                ● Unread
                            </Badge>
                        ) : formattedReadDate ? (
                            <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1 w-fit">
                                <CheckCheck className="h-3 w-3 text-emerald-600" />
                                Read: {formattedReadDate}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                ✓ Read
                            </Badge>
                        )}
                    </TableCell>

                    <TableCell className="text-right w-[90px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                onClick={handleView}
                                title="Open target destination"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Notification Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={handleView}>
                                        <Eye className="mr-2 h-4 w-4 text-sky-500" /> Open Destination
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onViewDetails(notification)}>
                                        <Clock className="mr-2 h-4 w-4 text-indigo-500" /> View Audit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {isNew && (
                                        <DropdownMenuItem onClick={() => onUpdateStatus(notification.id, 'read')}>
                                            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> Mark as Read
                                        </DropdownMenuItem>
                                    )}
                                    {!isArchived && (
                                        <DropdownMenuItem onClick={() => onUpdateStatus(notification.id, 'archived')}>
                                            <Archive className="mr-2 h-4 w-4 text-amber-500" /> Archive
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(notification.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </TableCell>
                </TableRow>
            </ContextMenuTrigger>
            <ContextMenuContent>
                {contextMenuItems}
            </ContextMenuContent>
        </ContextMenu>
    );
});
NotificationRow.displayName = "NotificationRow";

export default function NotificationsPage() {
    const [notifications, setNotifications] = React.useState<Notification[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState("new");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const db = useFirestore();
    const router = useRouter();

    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);
    const isLeader = Boolean(userProfile?.role && ['president', 'leader', 'vice-president', 'owner', 'admin'].includes(userProfile.role));

    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [sorting, setSorting] = React.useState<{ key: keyof Notification; order: 'asc' | 'desc' }>({ key: 'date', order: 'desc' });
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
    
    const [viewingNotification, setViewingNotification] = React.useState<Notification | null>(null);

    React.useEffect(() => {
        if (isUserLoading) return;
        if (!user || !db) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(
            collection(db, "notifications"),
            where("recipientId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rawData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notification));
            
            // Exclude external admin-app-only notifications (e.g. internal roadmap tasks, targetApp: 'admin')
            const notificationsData = rawData.filter(n => {
                const targetApp = (n as any).targetApp;
                if (targetApp === 'admin') return false;
                const typeStr = (n.type as string) || '';
                const subjectStr = (n.subject || '').toLowerCase();
                if (typeStr === 'Task Assignment' || typeStr === 'Development Task') return false;
                if (subjectStr.includes('development task')) return false;
                return true;
            });

            // Sort by date descending client-side
            notificationsData.sort((a, b) => {
                const dateA = (a.date as any)?.toDate ? (a.date as any).toDate() : new Date(a.date);
                const dateB = (b.date as any)?.toDate ? (b.date as any).toDate() : new Date(b.date);
                if (isValid(dateA) && isValid(dateB)) {
                    return dateB.getTime() - dateA.getTime();
                }
                return 0;
            });

            setNotifications(notificationsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notifications:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch notifications." });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, isUserLoading, db, toast]);

    const handleUpdateStatus = async (id: string, status: 'read' | 'archived') => {
        const result = await updateNotificationStatusAction({ 
            notificationId: id, 
            status,
            actor: userProfile?.name || user?.displayName || 'User'
        });
        if (!result.success) {
            toast({ title: "Error", description: "Failed to update notification status.", variant: "destructive" });
        }
    };
    
    const handleViewDetails = React.useCallback(async (notification: Notification) => {
        setViewingNotification(notification);
        if (notification.status === 'new' || notification.status === 'New') {
            updateNotificationStatusAction({ 
                notificationId: notification.id, 
                status: 'read',
                actor: userProfile?.name || user?.displayName || 'User'
            }).catch(console.error);
        }
    }, [userProfile, user]);
    
    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this notification?")) return;
        const result = await deleteNotificationAction({ notificationId: id });
        if (!result.success) {
            toast({ title: "Error", description: "Failed to delete notification.", variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Notification deleted." });
        }
    };
    
    const handleSelectRow = (id: string, checked: boolean) => {
        setSelectedIds(prev =>
            checked ? [...prev, id] : prev.filter(selectedId => selectedId !== id)
        );
    };

    const handleSort = (key: keyof Notification) => {
        setSorting(prev => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Metric counts
    const newCount = React.useMemo(() => notifications.filter(n => n.status === 'new' || n.status === 'New').length, [notifications]);
    const readCount = React.useMemo(() => notifications.filter(n => n.status === 'read' || n.status === 'Read').length, [notifications]);
    const archivedCount = React.useMemo(() => notifications.filter(n => n.status === 'archived' || n.status === 'Archived').length, [notifications]);
    const emergencyCount = React.useMemo(() => notifications.filter(n => {
        const s = (n.subject || '').toLowerCase();
        return n.type === 'Emergency Plan Update' || n.type === 'Situation Bulletin' || n.type === 'Public Emergency Alert' || s.includes('emergency') || s.includes('resilience');
    }).length, [notifications]);

    const filteredNotifications = React.useMemo(() => {
        let filtered = notifications;

        // 1. Status Tab filter
        if (activeTab === 'new') {
            filtered = filtered.filter(n => n.status === 'new' || n.status === 'New');
        } else if (activeTab === 'read') {
            filtered = filtered.filter(n => n.status === 'read' || n.status === 'Read');
        } else if (activeTab === 'archived') {
            filtered = filtered.filter(n => n.status === 'archived' || n.status === 'Archived');
        } else if (activeTab === 'all') {
            filtered = filtered.filter(n => n.status !== 'archived' && n.status !== 'Archived');
        }

        // 2. Category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(n => {
                const s = (n.subject || '').toLowerCase();
                if (categoryFilter === 'emergency') {
                    return n.type === 'Emergency Plan Update' || n.type === 'Situation Bulletin' || n.type === 'Public Emergency Alert' || s.includes('emergency') || s.includes('resilience') || s.includes('wildfire') || s.includes('flood');
                }
                if (categoryFilter === 'announcement') {
                    return n.type === 'Community Announcement' || s.includes('announcement') || s.includes('broadcast');
                }
                if (categoryFilter === 'events') {
                    return n.type === 'Event Request' || s.includes('event') || s.includes('festival');
                }
                if (categoryFilter === 'news') {
                    return n.type === 'News Story Submission' || s.includes('news');
                }
                if (categoryFilter === 'orders') {
                    return n.type === 'New Order' || n.type === 'Order Update' || n.type === 'Business Submission' || s.includes('order');
                }
                if (categoryFilter === 'polls') {
                    return n.type === 'Poll Alert' || n.type === 'Petition Alert' || s.includes('poll') || s.includes('petition');
                }
                if (categoryFilter === 'messages') {
                    return n.type === 'New Message';
                }
                return true;
            });
        }

        // 3. Search query filter
        if (searchQuery.trim()) {
            const queryLower = searchQuery.toLowerCase();
            filtered = filtered.filter(n => 
                (n.subject || '').toLowerCase().includes(queryLower) ||
                (n.from || '').toLowerCase().includes(queryLower) ||
                (n.type || '').toLowerCase().includes(queryLower)
            );
        }
        
        return [...filtered].sort((a, b) => {
            const key = sorting.key;
            const order = sorting.order === 'asc' ? 1 : -1;
            
            let valA = a[key] as any;
            let valB = b[key] as any;
            
            if (key === 'date') {
                const dateA = (valA as any)?.toDate ? (valA as any).toDate() : new Date(valA);
                const dateB = (valB as any)?.toDate ? (valB as any).toDate() : new Date(valB);
                if (isValid(dateA) && isValid(dateB)) {
                    return (dateA.getTime() - dateB.getTime()) * order;
                }
                return 0;
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                 return valA.localeCompare(valB) * order;
            }
            if (valA < valB) return -1 * order;
            if (valA > valB) return 1 * order;
            return 0;
        });

    }, [notifications, activeTab, categoryFilter, searchQuery, sorting]);
    
    const paginatedNotifications = React.useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return filteredNotifications.slice(start, start + pagination.pageSize);
    }, [filteredNotifications, pagination]);

    const pageCount = Math.ceil(filteredNotifications.length / pagination.pageSize);

    const handleBulkUpdateStatus = async (status: 'read' | 'archived') => {
        const promises = selectedIds.map(id => updateNotificationStatusAction({ 
            notificationId: id, 
            status,
            actor: userProfile?.name || user?.displayName || 'User'
        }));
        await Promise.all(promises);
        toast({
            title: 'Notifications Updated',
            description: `${selectedIds.length} notifications marked as ${status}.`,
        });
        setSelectedIds([]);
    };

    return (
    <>
        <div className="space-y-6">
            {/* Header with gradient badge */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-md">
                            <BellRing className="h-6 w-6" />
                        </div>
                        Notification Center
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Live situation updates, emergency broadcasts, member requests, and community alerts with verified audit timestamps.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {newCount > 0 && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleBulkUpdateStatus('read')}
                            className="bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-200"
                        >
                            <CheckCheck className="h-4 w-4 mr-1.5 text-sky-600" />
                            Mark All Read
                        </Button>
                    )}
                </div>
            </div>

            {/* Vibrant Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-l-4 border-l-sky-500 shadow-sm bg-gradient-to-br from-sky-50/40 to-transparent dark:from-sky-950/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">Unread Alerts</span>
                            <span className="h-2 w-2 rounded-full bg-sky-500 animate-ping" />
                        </div>
                        <div className="text-2xl font-black text-foreground mt-1">{newCount}</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-rose-500 shadow-sm bg-gradient-to-br from-rose-50/40 to-transparent dark:from-rose-950/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Emergency / Plan</span>
                            <Siren className="h-4 w-4 text-rose-600" />
                        </div>
                        <div className="text-2xl font-black text-foreground mt-1">{emergencyCount}</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-gradient-to-br from-emerald-50/40 to-transparent dark:from-emerald-950/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Read History</span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl font-black text-foreground mt-1">{readCount}</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500 shadow-sm bg-gradient-to-br from-indigo-50/40 to-transparent dark:from-indigo-950/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Total Received</span>
                            <Sparkles className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="text-2xl font-black text-foreground mt-1">{notifications.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Status Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                            <TabsList className="grid grid-cols-4 w-full md:w-auto bg-muted">
                                <TabsTrigger value="new" className="text-xs font-bold data-[state=active]:bg-sky-600 data-[state=active]:text-white">
                                    New ({newCount})
                                </TabsTrigger>
                                <TabsTrigger value="read" className="text-xs font-bold">
                                    Read ({readCount})
                                </TabsTrigger>
                                <TabsTrigger value="all" className="text-xs font-bold">
                                    All ({notifications.length - archivedCount})
                                </TabsTrigger>
                                <TabsTrigger value="archived" className="text-xs font-bold">
                                    Archived ({archivedCount})
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Search & Bulk Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search alerts & senders..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-9 text-xs"
                                />
                            </div>

                            {selectedIds.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <Button size="sm" className="h-9 text-xs" onClick={() => handleBulkUpdateStatus('read')}>
                                        Mark Read ({selectedIds.length})
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => handleBulkUpdateStatus('archived')}>
                                        Archive ({selectedIds.length})
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-3 text-xs">
                        <span className="text-muted-foreground font-semibold text-[11px] mr-1 flex items-center gap-1">
                            <Filter className="h-3 w-3" /> Filter:
                        </span>
                        {[
                            { id: 'all', label: 'All Categories' },
                            { id: 'emergency', label: '🚨 Emergency & Safety' },
                            { id: 'announcement', label: '📢 Announcements' },
                            { id: 'events', label: '📅 Events' },
                            { id: 'news', label: '📰 News' },
                            { id: 'orders', label: '🛒 Orders & Commerce' },
                            { id: 'polls', label: '📊 Polls & Petitions' },
                            { id: 'messages', label: '💬 Messages' },
                        ].map(chip => (
                            <button
                                key={chip.id}
                                type="button"
                                onClick={() => setCategoryFilter(chip.id)}
                                className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                                    categoryFilter === chip.id
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-muted/60 text-muted-foreground hover:bg-muted border-transparent"
                                )}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[44px]">
                                        <Checkbox
                                            checked={paginatedNotifications.length > 0 && selectedIds.length === paginatedNotifications.length}
                                            onCheckedChange={(checked) => {
                                                setSelectedIds(checked ? paginatedNotifications.map(n => n.id) : []);
                                            }}
                                            aria-label="Select all notifications on this page"
                                        />
                                    </TableHead>
                                    <TableHead><Button variant="ghost" size="sm" onClick={() => handleSort('type')} className="text-xs font-bold p-0 hover:bg-transparent">Category <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                                    <TableHead><Button variant="ghost" size="sm" onClick={() => handleSort('subject')} className="text-xs font-bold p-0 hover:bg-transparent">Subject & Summary <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                                    <TableHead><Button variant="ghost" size="sm" onClick={() => handleSort('from')} className="text-xs font-bold p-0 hover:bg-transparent">From <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                                    <TableHead><Button variant="ghost" size="sm" onClick={() => handleSort('date')} className="text-xs font-bold p-0 hover:bg-transparent">Received <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                                    <TableHead className="text-xs font-bold">Audit Status</TableHead>
                                    <TableHead className="text-right text-xs font-bold">Open</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-48 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                            <p className="text-xs text-muted-foreground mt-2 font-medium">Loading notifications...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedNotifications.length > 0 ? (
                                    paginatedNotifications.map((notification) => (
                                        <NotificationRow
                                            key={notification.id}
                                            notification={notification}
                                            onUpdateStatus={handleUpdateStatus}
                                            onDelete={handleDelete}
                                            onViewDetails={handleViewDetails}
                                            isSelected={selectedIds.includes(notification.id)}
                                            onSelect={handleSelectRow}
                                            isLeader={isLeader}
                                        />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <BellRing className="h-8 w-8 text-muted-foreground/40" />
                                                <p className="text-sm font-semibold text-foreground">No notifications found</p>
                                                <p className="text-xs text-muted-foreground">You are all caught up for this filter.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="p-4 border-t">
                        <PaginationControls
                            pagination={pagination}
                            setPagination={setPagination}
                            pageCount={pageCount}
                            totalRows={filteredNotifications.length}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Detailed Notification Audit Dialog */}
        <Dialog open={!!viewingNotification} onOpenChange={() => setViewingNotification(null)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        {viewingNotification && getTypeMetadata(viewingNotification.type, viewingNotification.subject).icon}
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {viewingNotification?.type || 'Notification'}
                        </span>
                    </div>
                    <DialogTitle className="text-lg font-bold">{viewingNotification?.subject}</DialogTitle>
                    <DialogDescription>
                        Dispatched by <strong className="text-foreground">{viewingNotification?.from || 'Community Hub System'}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {viewingNotification?.details?.declineReason && (
                        <div className="p-3 bg-muted rounded-lg text-xs">
                            <span className="font-bold block text-foreground mb-1">Decision Notes:</span>
                            <p>{viewingNotification.details.declineReason}</p>
                        </div>
                    )}

                    {/* Audit Timeline & Timestamps */}
                    <div className="rounded-lg border p-3.5 space-y-2.5 bg-muted/20 text-xs">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary" /> Verified Audit Log
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2 rounded bg-background border">
                                <span className="text-muted-foreground block">Received Timestamp:</span>
                                <span className="font-semibold text-foreground">
                                    {viewingNotification?.date
                                        ? (viewingNotification.date as any).toDate
                                            ? format((viewingNotification.date as any).toDate(), 'd MMM yyyy, HH:mm:ss')
                                            : viewingNotification.date
                                        : 'Recorded on Dispatch'}
                                </span>
                            </div>

                            <div className="p-2 rounded bg-background border">
                                <span className="text-muted-foreground block">Read / Viewed Timestamp:</span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {viewingNotification?.readAt
                                        ? (viewingNotification.readAt as any).toDate
                                            ? format((viewingNotification.readAt as any).toDate(), 'd MMM yyyy, HH:mm:ss')
                                            : viewingNotification.readAt
                                        : 'Recorded Just Now'}
                                </span>
                            </div>
                        </div>

                        {viewingNotification?.history && viewingNotification.history.length > 0 && (
                            <div className="pt-2 border-t space-y-1">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Action History:</span>
                                {viewingNotification.history.map((h, i) => (
                                    <div key={i} className="flex justify-between text-[11px] text-muted-foreground">
                                        <span>Action: <strong className="text-foreground">{h.action}</strong> by {h.actor || 'User'}</span>
                                        <span>
                                            {h.timestamp?.toDate ? format(h.timestamp.toDate(), 'd MMM, HH:mm') : 'Logged'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex sm:justify-between items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewingNotification(null)}>
                        Close
                    </Button>

                    {viewingNotification && (
                        <Button 
                            size="sm" 
                            className="bg-primary hover:bg-primary/90 font-semibold"
                            onClick={() => {
                                const dest = getNotificationDestination(viewingNotification, isLeader);
                                setViewingNotification(null);
                                router.push(dest);
                            }}
                        >
                            Open Target Page <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
    );
}
