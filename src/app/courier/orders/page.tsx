'use client';

import * as React from 'react';
import { useUser, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Package, 
  Truck, 
  MapPin, 
  User, 
  Store, 
  MoreHorizontal, 
  CheckCircle, 
  RefreshCcw, 
  DollarSign, 
  Search, 
  Loader2, 
  Clock 
} from 'lucide-react';
import { getCourierOrdersAction, updateOrderStatusAction } from '@/lib/actions/orderActions';
import { useToast } from '@/hooks/use-toast';
import { useActiveCommunityId } from '@/hooks/use-active-community-id';

type OrderStatus = 'Received' | 'Awaiting Payment' | 'Packed' | 'Shipped' | 'Ready for Collection' | 'Delivered/Collected' | 'Refunded' | 'Return to Stock';

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const statusConfig: Record<OrderStatus, { className: string; icon: React.ReactNode }> = {
    'Received': { className: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Package className="h-3 w-3" /> },
    'Awaiting Payment': { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <DollarSign className="h-3 w-3" /> },
    'Packed': { className: 'bg-orange-100 text-orange-800 border-orange-200', icon: <Package className="h-3 w-3" /> },
    'Shipped': { className: 'bg-purple-100 text-purple-800 border-purple-200', icon: <Truck className="h-3 w-3" /> },
    'Ready for Collection': { className: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: <CheckCircle className="h-3 w-3" /> },
    'Delivered/Collected': { className: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle className="h-3 w-3" /> },
    'Refunded': { className: 'bg-red-100 text-red-800 border-red-200', icon: <RefreshCcw className="h-3 w-3" /> },
    'Return to Stock': { className: 'bg-gray-100 text-gray-800 border-gray-200', icon: <Package className="h-3 w-3" /> },
  };

  const config = statusConfig[status] || { className: 'bg-gray-100 text-gray-800', icon: null };

  return (
    <Badge variant="outline" className={config.className}>
      {config.icon}
      <span className="ml-1.5 font-medium">{status}</span>
    </Badge>
  );
};

export default function CourierOrdersPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { communityId, userProfile, isLoading: activeCommunityLoading } = useActiveCommunityId();

  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('all');

  const fetchOrders = React.useCallback(async () => {
    if (user && communityId) {
      setLoading(true);
      try {
        const data = await getCourierOrdersAction(user.uid, communityId);
        setOrders(data);
      } catch (err) {
        console.error('Failed to fetch courier orders:', err);
      } finally {
        setLoading(false);
      }
    } else if (!isUserLoading && !activeCommunityLoading) {
      setLoading(false);
    }
  }, [user, communityId, isUserLoading, activeCommunityLoading]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    setIsUpdating(orderId);
    const result = await updateOrderStatusAction({ orderId, status });
    if (result.success) {
      toast({ title: 'Order Updated', description: `Delivery status set to "${status}".` });
      fetchOrders();
    } else {
      toast({ title: 'Error', description: 'Could not update delivery status.', variant: 'destructive' });
    }
    setIsUpdating(null);
  };

  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === 'pickup' && !['Packed', 'Received'].includes(order.status)) return false;
      if (activeTab === 'in_transit' && order.status !== 'Shipped') return false;
      if (activeTab === 'delivered' && order.status !== 'Delivered/Collected') return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        order.id.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query) ||
        order.businessName?.toLowerCase().includes(query) ||
        order.shippingAddress?.toLowerCase().includes(query)
      );
    });
  }, [orders, activeTab, searchQuery]);

  if (isUserLoading || activeCommunityLoading || loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          Delivery Orders
        </h1>
        <p className="text-muted-foreground">
          View and manage all courier delivery requests in {userProfile?.communityName || 'your community'}.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
            <TabsTrigger value="pickup">To Pick Up</TabsTrigger>
            <TabsTrigger value="in_transit">In Transit</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Delivery Tasks</CardTitle>
          <CardDescription>
            Showing {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'} assigned to your courier service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Storefront</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery Address</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        #{order.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{order.businessName || 'Local Store'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{order.customerName || 'Customer'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-xs text-muted-foreground line-clamp-2">{order.shippingAddress || 'Local Address'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        £{order.deliveryFee ? Number(order.deliveryFee).toFixed(2) : '3.50'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isUpdating === order.id}>
                              {isUpdating === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Update Delivery Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Shipped')}>
                              <Truck className="mr-2 h-4 w-4 text-purple-600" /> Mark Out for Delivery
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Delivered/Collected')}>
                              <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Confirm Delivered
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Packed')}>
                              <RefreshCcw className="mr-2 h-4 w-4 text-orange-600" /> Return to Store
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Package className="h-12 w-12 text-muted-foreground/50 mb-2" />
                        <h3 className="font-semibold text-base">No Matching Delivery Orders</h3>
                        <p className="text-muted-foreground text-sm max-w-sm">
                          {searchQuery
                            ? `No orders matching "${searchQuery}".`
                            : 'There are currently no delivery tasks in this category.'}
                        </p>
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
