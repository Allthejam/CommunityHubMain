

"use client";

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
    ArrowUpDown,
    MoreHorizontal,
    Trash2,
} from "lucide-react"
import { collection, query, where, onSnapshot, doc, orderBy } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isValid, parse } from "date-fns";

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
import { type Notification, type NotificationType } from "@/lib/types/notifications";
import { updateNotificationStatusAction, deleteNotificationAction } from "@/lib/actions/notificationActions";
import { PaginationControls } from "@/components/ui/pagination";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";


const TypeIcon = ({ type }: { type: NotificationType }) => {
    switch (type) {
        case "Event Request":
            return <CalendarPlus className="h-5 w-5 text-blue-500" />;
        case "Business Submission":
            return <Building className="h-5 w-5 text-green-500" />;
        case "News Story Submission":
            return <Newspaper className="h-5 w-5 text-purple-500" />;
        case "Partnership Request":
            return <Handshake className="h-5 w-5 text-teal-500" />;
        case "New Message":
            return <MessageSquare className="h-5 w-5 text-indigo-500" />;
        case "General Inquiry":
            return <Mail className="h-5 w-5 text-orange-500" />;
        case "New Report":
            return <AlertTriangle className="h-5 w-5 text-red-500" />;
        case "Leadership Invitation":
            return <Crown className="h-5 w-5 text-amber-500" />;
        case "Special Access Request":
            return <Key className="h-5 w-5 text-destructive" />;
         case "Leader Information Update":
            return <Key className="h-5 w-5 text-blue-500" />;
        case "Boundary Dispute":
            return <Gavel className="h-5 w-5 text-red-500" />;
        case "Leadership Application":
            return <Crown className="h-5 w-5 text-purple-500" />;
         case "Advertiser Profile":
            return <Building className="h-5 w-5 text-indigo-500" />;
        default:
            return <BellRing className="h-5 w-5 text-muted-foreground" />;
    }
}

const NotificationRow = React.memo(({ notification, onUpdateStatus, onDelete, isSelected, onSelect }: { 
    notification: Notification; 
    onUpdateStatus: (id: string, status: "read" | "archived") => void;
    onDelete: (id: string) => void;
    isSelected: boolean;
    onSelect: (id: string, checked: boolean) => void;
}) => {
    const { type, status, subject, from, date, relatedId } = notification;
    const router = useRouter();

    const handleView = async () => {
        if (status === 'new') {
            onUpdateStatus(notification.id, 'read');
        }

        let path = '#';
        if (notification.actionUrl) {
            path = notification.actionUrl;
        } else {
            switch (type) {
                case 'New Message':
                    if (notification.subject.includes("Platform Support")) {
                        path = `/leader/chat?conversationId=${relatedId}`;
                    } else if (notification.from === "Platform Administration") {
                        path = `/admin/staff-chat?conversationId=${relatedId}`;
                    } else {
                        path = `/chat?conversationId=${relatedId}`;
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
                default:
                    break;
            }
        }

        if (path && path !== '#') {
            router.push(path);
        }
    };
    
    const isArchived = status === 'archived';
    const isNew = status === 'new';

    const formattedDate = React.useMemo(() => {
        if (!date) return 'a while ago';
        const d = (date as any)?.toDate ? (date as any).toDate() : new Date(date);
        if (isValid(d)) {
            return formatDistanceToNow(d, { addSuffix: true });
        }
        return 'a while ago';
    }, [date]);

    const contextMenuItems = (
        <>
            <ContextMenuLabel>Actions</ContextMenuLabel>
            <ContextMenuItem onSelect={handleView}><Eye className="mr-2 h-4 w-4" /> View</ContextMenuItem>
            <ContextMenuSeparator />
            {isNew && (
                <ContextMenuItem onSelect={() => onUpdateStatus(notification.id, 'read')}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Read
                </ContextMenuItem>
            )}
            {!isArchived && (
                <ContextMenuItem onSelect={() => onUpdateStatus(notification.id, 'archived')}>
                    <Archive className="mr-2 h-4 w-4" /> Archive
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
                    className={cn(isNew ? 'bg-primary/5' : '', 'cursor-pointer')}
                >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => onSelect(notification.id, !!checked)}
                            aria-label="Select notification"
                        />
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <TypeIcon type={type} />
                            <span className="font-medium">{type}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div>
                            {isNew && <Badge className="mr-2 bg-blue-500 hover:bg-blue-600">New</Badge>}
                            <span className={isNew ? "font-bold" : ""}>{subject}</span>
                        </div>
                    </TableCell>
                    <TableCell>{from}</TableCell>
                    <TableCell>{formattedDate}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={handleView}>
                                    <Eye className="mr-2 h-4 w-4" /> View
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {isNew && (
                                    <DropdownMenuItem onClick={() => onUpdateStatus(notification.id, 'read')}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Read
                                    </DropdownMenuItem>
                                )}
                                {!isArchived && (
                                    <DropdownMenuItem onClick={() => onUpdateStatus(notification.id, 'archived')}>
                                        <Archive className="mr-2 h-4 w-4" /> Archive
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(notification.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const db = useFirestore();

    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [sorting, setSorting] = React.useState<{ key: keyof Notification; order: 'asc' | 'desc' }>({ key: 'date', order: 'desc' });
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });


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
            const notificationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notification));
            
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
        const result = await updateNotificationStatusAction({ notificationId: id, status });
        if (!result.success) {
            toast({ title: "Error", description: "Failed to update notification status.", variant: "destructive" });
        }
    };
    
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

    const sortedNotifications = React.useMemo(() => {
        let filtered = notifications;
        if (activeTab === 'new') {
            filtered = notifications.filter(n => n.status === 'new');
        } else if (activeTab === 'read') {
            filtered = notifications.filter(n => n.status === 'read');
        } else if (activeTab === 'archived') {
            filtered = notifications.filter(n => n.status === 'archived');
        } else if (activeTab === 'all') {
            filtered = notifications.filter(n => n.status !== 'archived');
        }
        
        return [...filtered].sort((a, b) => {
            const key = sorting.key;
            const order = sorting.order === 'asc' ? 1 : -1;
            
            let valA = a[key as keyof Notification] as any;
            let valB = b[key as keyof Notification] as any;
            
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

    }, [notifications, activeTab, sorting]);
    
    const paginatedNotifications = React.useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return sortedNotifications.slice(start, start + pagination.pageSize);
    }, [sortedNotifications, pagination]);

    const pageCount = Math.ceil(sortedNotifications.length / pagination.pageSize);

    const handleBulkUpdateStatus = async (status: 'read' | 'archived') => {
        const promises = selectedIds.map(id => updateNotificationStatusAction({ notificationId: id, status }));
        await Promise.all(promises);
        toast({
            title: 'Notifications Updated',
            description: `${selectedIds.length} notifications have been updated.`,
        });
        setSelectedIds([]);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <BellRing className="h-8 w-8" />
                    My Notifications
                </h1>
                <p className="text-muted-foreground">
                    All your alerts and updates in one place.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="new">New</TabsTrigger>
                                <TabsTrigger value="read">Read</TabsTrigger>
                                <TabsTrigger value="archived">Archived</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => handleBulkUpdateStatus('read')}>Mark as Read ({selectedIds.length})</Button>
                                <Button size="sm" variant="outline" onClick={() => handleBulkUpdateStatus('archived')}>Archive ({selectedIds.length})</Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={paginatedNotifications.length > 0 && selectedIds.length === paginatedNotifications.length}
                                            onCheckedChange={(checked) => {
                                                setSelectedIds(checked ? paginatedNotifications.map(n => n.id) : []);
                                            }}
                                            aria-label="Select all notifications on this page"
                                        />
                                    </TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('type')}>Type <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('subject')}>Subject <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('from')}>From <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('date')}>Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedNotifications.length > 0 ? (
                                    paginatedNotifications.map((notification) => (
                                        <NotificationRow
                                            key={notification.id}
                                            notification={notification}
                                            onUpdateStatus={handleUpdateStatus}
                                            onDelete={handleDelete}
                                            isSelected={selectedIds.includes(notification.id)}
                                            onSelect={handleSelectRow}
                                        />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center">
                                            No {activeTab} notifications.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                     <PaginationControls
                        pagination={pagination}
                        setPagination={setPagination}
                        pageCount={pageCount}
                        totalRows={sortedNotifications.length}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
