
'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, Package, ShoppingBag } from 'lucide-react';

type OrderItem = {
    productId: string;
    name: string;
    quantity: number;
    price: number;
}

type Order = {
    id: string;
    businessName: string; 
    items: OrderItem[];
    totalAmount: number;
    status: string;
    createdAt: { toDate: () => Date };
}

export default function MyOrdersPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();

    const ordersQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    }, [user, db]);

    const { data: orders, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);

    const loading = isUserLoading || ordersLoading;

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
                                    orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}...</TableCell>
                                            <TableCell className="font-medium">{order.businessName || 'Local Business'}</TableCell>
                                            <TableCell>{format(order.createdAt.toDate(), "PPP")}</TableCell>
                                            <TableCell>£{order.totalAmount.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{order.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                            <h3 className="font-semibold">No Orders Yet</h3>
                                            <p className="text-muted-foreground">You haven't placed any orders yet.</p>
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
