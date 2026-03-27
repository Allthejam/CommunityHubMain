
'use client';

import * as React from 'react';
import {
  MoreHorizontal,
  ShoppingCart,
  ArrowUpDown,
  CheckCircle,
  Truck,
  Package,
  DollarSign,
  Undo2,
  Archive,
  RefreshCcw,
  ArrowLeft,
  Loader2,
  ArchiveX,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { updateOrderStatusAction } from '@/lib/actions/orderActions';

type OrderStatus = 'Received' | 'Awaiting Payment' | 'Packed' | 'Shipped' | 'Ready for Collection' | 'Delivered/Collected' | 'Refunded' | 'Return to Stock';

type Order = {
    id: string;
    shippingAddress: string; // Simplified for display
    createdAt: { toDate: () => Date };
    totalAmount: number;
    status: OrderStatus;
    customerName?: string; // To be populated
}


const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const statusConfig: Record<OrderStatus, { className: string, icon: React.ReactNode }> = {
        'Received': { className: 'bg-blue-100 text-blue-800', icon: <ShoppingCart className="h-3 w-3" /> },
        'Awaiting Payment': { className: 'bg-yellow-100 text-yellow-800', icon: <DollarSign className="h-3 w-3" /> },
        'Packed': { className: 'bg-orange-100 text-orange-800', icon: <Package className="h-3 w-3" /> },
        'Shipped': { className: 'bg-purple-100 text-purple-800', icon: <Truck className="h-3 w-3" /> },
        'Ready for Collection': { className: 'bg-indigo-100 text-indigo-800', icon: <CheckCircle className="h-3 w-3" /> },
        'Delivered/Collected': { className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
        'Refunded': { className: 'bg-red-100 text-red-800', icon: <Undo2 className="h-3 w-3" /> },
        'Return to Stock': { className: 'bg-gray-100 text-gray-800', icon: <Archive className="h-3 w-3" /> },
    };

    const config = statusConfig[status];

    return (
        <Badge variant="outline" className={config.className}>
            {config.icon}
            <span className="ml-1.5">{status}</span>
        </Badge>
    );
};

export default function OrdersPage() {
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = React.useState<string | null>(null);

    const ordersQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(db, "orders"), where("businessOwnerId", "==", user.uid));
    }, [user, db]);

    const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

    const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
        setIsUpdating(orderId);
        const result = await updateOrderStatusAction({ orderId, status });
        if (result.success) {
            toast({ title: 'Status Updated', description: `Order ${orderId.substring(0,6)} has been updated to "${status}".` });
        } else {
            toast({ title: 'Error', description: 'Could not update order status.', variant: 'destructive' });
        }
        setIsUpdating(null);
    }

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/business/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <ShoppingCart className="h-8 w-8 text-primary" />
          Customer Orders
        </h1>
        <p className="text-muted-foreground">
          Manage and track all orders for your business.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            A complete history of all orders placed at your storefront.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                    </TableRow>
                ) : orders && orders.length > 0 ? (
                    orders.map((order) => (
                    <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}...</TableCell>
                        <TableCell>{order.customerName || order.shippingAddress.split(',')[0]}</TableCell>
                        <TableCell>{order.createdAt.toDate().toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">£{order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell><StatusBadge status={order.status as OrderStatus} /></TableCell>
                        <TableCell className="text-right">
                        {isUpdating === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Awaiting Payment')}><DollarSign className="mr-2 h-4 w-4"/> Awaiting Payment</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Packed')}><Package className="mr-2 h-4 w-4"/> Packed</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Shipped')}><Truck className="mr-2 h-4 w-4"/> Shipped</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Ready for Collection')}><CheckCircle className="mr-2 h-4 w-4"/> Ready for Collection</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Delivered/Collected')}><CheckCircle className="mr-2 h-4 w-4"/> Delivered/Collected</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>Other Actions</DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Refunded')} className="text-amber-600"><Undo2 className="mr-2 h-4 w-4"/> Issue Refund</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Return to Stock')}><Archive className="mr-2 h-4 w-4"/> Return to Stock</DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Received')}><RefreshCcw className="mr-2 h-4 w-4"/> Reset to Received</DropdownMenuItem>
                                </DropdownMenuContent>
                           </DropdownMenu>
                        )}
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No orders found.
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
