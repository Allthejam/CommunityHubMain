
'use client';

import * as React from 'react';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns';
import { Loader2, Package, ShoppingBag } from 'lucide-react';
import { getMyOrdersAction } from '@/lib/actions/orderActions';

export default function MyOrdersPage() {
    const { user, isUserLoading } = useUser();
    const [orders, setOrders] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    const fetchOrders = React.useCallback(async () => {
        if (user) {
            setLoading(true);
            try {
                const data = await getMyOrdersAction(user.uid);
                setOrders(data);
            } catch (err) {
                console.error("Failed to fetch orders:", err);
            } finally {
                setLoading(false);
            }
        } else if (!isUserLoading) {
            setLoading(false);
        }
    }, [user, isUserLoading]);

    React.useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <ShoppingBag className="h-8 w-8" />
                    My Orders
                </h1>
                <p className="text-muted-foreground">
                    A history of all your purchases from local businesses.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>View status and details of your past and current orders.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Store</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : orders && orders.length > 0 ? (
                                    orders.map((order) => {
                                        const date = new Date(order.createdAt);
                                        return (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}...</TableCell>
                                                <TableCell className="font-medium">{order.businessName || 'Local Business'}</TableCell>
                                                <TableCell>{isValid(date) ? format(date, "PPP") : 'N/A'}</TableCell>
                                                <TableCell>£{order.totalAmount.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{order.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <Package className="h-12 w-12 text-muted-foreground mb-2" />
                                                <h3 className="font-semibold">No Orders Found</h3>
                                                <p className="text-muted-foreground text-sm">You haven't placed any orders in this community yet.</p>
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
