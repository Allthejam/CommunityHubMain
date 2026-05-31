'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns';
import { Loader2, Package, Truck, MapPin, User, Store, MoreHorizontal, CheckCircle, RefreshCcw, DollarSign } from 'lucide-react';
import { getCourierOrdersAction, updateOrderStatusAction } from '@/lib/actions/orderActions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';

type OrderStatus = 'Received' | 'Awaiting Payment' | 'Packed' | 'Shipped' | 'Ready for Collection' | 'Delivered/Collected' | 'Refunded' | 'Return to Stock';

const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const statusConfig: Record<OrderStatus, { className: string, icon: React.ReactNode }> = {
        'Received': { className: 'bg-blue-100 text-blue-800', icon: <Package className="h-3 w-3" /> },
        'Awaiting Payment': { className: 'bg-yellow-100 text-yellow-800', icon: <DollarSign className="h-3 w-3" /> },
        'Packed': { className: 'bg-orange-100 text-orange-800', icon: <Package className="h-3 w-3" /> },
        'Shipped': { className: 'bg-purple-100 text-purple-800', icon: <Truck className="h-3 w-3" /> },
        'Ready for Collection': { className: 'bg-indigo-100 text-indigo-800', icon: <CheckCircle className="h-3 w-3" /> },
        'Delivered/Collected': { className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
        'Refunded': { className: 'bg-red-100 text-red-800', icon: <RefreshCcw className="h-3 w-3" /> },
        'Return to Stock': { className: 'bg-gray-100 text-gray-800', icon: <Package className="h-3 w-3" /> },
    };

    const config = statusConfig[status] || { className: '', icon: null };

    return (
        <Badge variant="outline" className={config.className}>
            {config.icon}
            <span className="ml-1.5">{status}</span>
        </Badge>
    );
};

export default function CourierDashboardPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const [orders, setOrders] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isUpdating, setIsUpdating] = React.useState<string | null>(null);

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const fetchOrders = React.useCallback(async () => {
        if (user && userProfile?.communityId) {
            setLoading(true);
            try {
                const data = await getCourierOrdersAction(user.uid, userProfile.communityId);
                setOrders(data);
            } catch (err) {
                console.error("Failed to fetch courier orders:", err);
            } finally {
                setLoading(false);
            }
        } else if (!isUserLoading && !profileLoading) {
            setLoading(false);
        }
    }, [user, userProfile?.communityId, isUserLoading, profileLoading]);

    React.useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
        setIsUpdating(orderId);
        const result = await updateOrderStatusAction({ orderId, status });
        if (result.success) {
            toast({ title: 'Status Updated', description: `Order status updated to "${status}".` });
            fetchOrders(); // Refresh data
        } else {
            toast({ title: 'Error', description: 'Could not update order status.', variant: 'destructive' });
        }
        setIsUpdating(null);
    }

    if (isUserLoading || profileLoading || loading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Truck className="h-8 w-8 text-primary" />
                    Courier Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Manage and track all local deliveries for {userProfile?.communityName}.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Open Delivery Tasks</CardTitle>
                    <CardDescription>Orders requiring collection or delivery.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Storefront</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Delivery Address</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders && orders.length > 0 ? (
                                    orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}...</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Store className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{order.businessName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span>{order.customerName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px]">
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                                                    <span className="text-xs">{order.shippingAddress}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell><StatusBadge status={order.status} /></TableCell>
                                            <TableCell className="text-right">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" disabled={isUpdating === order.id}>
                                                            {isUpdating === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal />}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Update Delivery Status</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Shipped')}>
                                                            <Truck className="mr-2 h-4 w-4" /> Out for Delivery
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Delivered/Collected')}>
                                                            <CheckCircle className="mr-2 h-4 w-4" /> Delivered
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Packed')}>
                                                            <RefreshCcw className="mr-2 h-4 w-4" /> Back to Store (Packed)
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <Package className="h-12 w-12 text-muted-foreground mb-2" />
                                                <h3 className="font-semibold">No Delivery Tasks</h3>
                                                <p className="text-muted-foreground text-sm">There are currently no orders requiring delivery in your community.</p>
                                            </div>
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
