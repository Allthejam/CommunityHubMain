
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
} from "lucide-react"
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { type Notification, type NotificationType } from "@/lib/types/notifications";
import { updateNotificationStatusAction } from "@/lib/actions/notificationActions";


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

const NotificationRow = React.memo(({ notification, onUpdateStatus }: { notification: Notification; onUpdateStatus: (id: string, status: "read" | "archived") => void; }) => {
    const { type, status, subject, from, date, relatedId } = notification;
    const router = useRouter();

    const handleView = async () => {
        if (status === 'new') {
            onUpdateStatus(notification.id, 'read');
        }

        let path = '';
        switch (type) {
            case 'New Message':
                path = `/chat?conversationId=${relatedId}`;
                break;
            // Add other cases as needed for different notification types
            default:
                break;
        }

        if (path) {
            router.push(path);
        }
    };
    
    const isArchived = status === 'archived';
    const isNew = status === 'new';

    return (
        <TableRow className={isNew ? 'bg-primary/5' : ''}>
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
            <TableCell>{formatDistanceToNow(new Date(date), { addSuffix: true })}</TableCell>
            <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                    {!isArchived && (
                        <>
                            <Button variant="outline" size="sm" onClick={handleView}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => onUpdateStatus(notification.id, 'archived')}>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                            </Button>
                        </>
                    )}
                </div>
            </TableCell>
        </TableRow>
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
            
            // Sort by date client-side to avoid composite index
            notificationsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    
    const filteredNotifications = React.useMemo(() => {
        if (activeTab === 'new') return notifications.filter(n => n.status === 'new' || n.status === 'read');
        if (activeTab === 'archived') return notifications.filter(n => n.status === 'archived');
        return [];
    }, [notifications, activeTab]);

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
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="new">New</TabsTrigger>
                            <TabsTrigger value="archived">Archived</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredNotifications.length > 0 ? (
                                    filteredNotifications.map((notification) => (
                                        <NotificationRow key={notification.id} notification={notification} onUpdateStatus={handleUpdateStatus} />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            No {activeTab} notifications.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
