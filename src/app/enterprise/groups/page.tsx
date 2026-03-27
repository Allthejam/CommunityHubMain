
'use client';

import * as React from "react";
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Handshake, Loader2, PlusCircle, Eye, Pencil, FileEdit, Trash2, MoreHorizontal, BadgeCheck, Percent, Gift, Megaphone, Calendar, GalleryHorizontal } from "lucide-react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { BusinessStatusBadge } from "@/components/business-status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteBusinessAction } from "@/lib/actions/businessActions";

type EnterpriseGroup = {
  id: string;
  businessName: string;
  shortDescription: string;
  logoImage?: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft";
};


export default function EnterpriseGroupsPage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [enterprisePlan, setEnterprisePlan] = React.useState<Plan | null>(null);
  
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [groupToDelete, setGroupToDelete] = React.useState<EnterpriseGroup | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const groupsQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(
      collection(db, "businesses"),
      where("ownerId", "==", user.uid),
      where("accountType", "==", "enterprise")
    );
  }, [user, db]);

  const { data: groups, isLoading: groupsLoading } = useCollection<EnterpriseGroup>(groupsQuery);
  const loading = authLoading || groupsLoading;

   React.useEffect(() => {
    const fetchPlans = async () => {
      const plans = await getPricingPlans();
      if (plans.enterprise) {
        setEnterprisePlan(plans.enterprise);
      }
    };
    fetchPlans();
  }, []);
  
  const openDeleteDialog = (group: EnterpriseGroup) => {
    setGroupToDelete(group);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete || !user) return;
    setIsDeleting(true);
    const result = await deleteBusinessAction({ businessId: groupToDelete.id, userId: user.uid });
    
    if (result.success) {
      toast({
        title: "Group Deleted",
        description: `"${groupToDelete.businessName}" has been successfully removed.`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
    setGroupToDelete(null);
  }

  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Handshake className="h-8 w-8 text-primary" />
            My Enterprise Groups
        </h1>
        <p className="text-muted-foreground">
          Create and manage your enterprise group listings.
        </p>
      </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">
              Enterprise Group Information
            </CardTitle>
            <CardDescription className="text-primary/80 dark:text-primary/90">
              Here’s what’s included with your enterprise group subscription on our platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-background/80 rounded-lg border">
                <CardTitle className="text-base flex items-center gap-2 mb-2"><Handshake /> Groups</CardTitle>
                <p className="text-2xl font-bold">£{enterprisePlan?.monthlyPrice ?? '...'}</p>
                <p className="text-xs text-muted-foreground">per group / per month</p>
            </div>
             <div className="p-4 bg-background/80 rounded-lg border">
                <CardTitle className="text-base flex items-center gap-2 mb-2"><Megaphone /> Adverts</CardTitle>
                <p className="text-2xl font-bold">£{enterprisePlan?.additionalAdvertPrice ?? '...'}</p>
                <p className="text-xs text-muted-foreground">per additional advert</p>
            </div>
             <div className="p-4 bg-background/80 rounded-lg border">
                <CardTitle className="text-base flex items-center gap-2 mb-2"><Calendar /> Events</CardTitle>
                <p className="text-2xl font-bold">£{enterprisePlan?.additionalEventPrice ?? '...'}</p>
                <p className="text-xs text-muted-foreground">per additional event</p>
            </div>
             <div className="p-4 bg-background/80 rounded-lg border">
              <CardTitle className="text-base flex items-center gap-2 mb-2">
                <Percent className="h-5 w-5 text-green-500" /> 40% Community Give-Back
              </CardTitle>
              <p className="text-muted-foreground text-sm">We donate 40% of your fee back to the registered local community.</p>
            </div>
          </CardContent>
          <CardFooter>
              <Button variant="link" asChild className="p-0 h-auto">
                <Link href="/enterprise/terms">See Full Terms & Conditions</Link>
            </Button>
          </CardFooter>
        </Card>

       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Your Groups</CardTitle>
                <CardDescription>A list of all your created enterprise groups.</CardDescription>
            </div>
            <Button asChild>
                <Link href="/enterprise/groups/create">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Group
                </Link>
            </Button>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Group Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : groups && groups.length > 0 ? (
                            groups.map(group => (
                                <ContextMenu key={group.id}>
                                  <ContextMenuTrigger asChild>
                                    <TableRow>
                                        <TableCell className="font-medium">{group.businessName}</TableCell>
                                        <TableCell><BusinessStatusBadge status={group.status} /></TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => router.push(`/businesses/${group.id}`)}>
                                                        <Eye className="mr-2 h-4 w-4" /> View Public Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => router.push(`/enterprise/groups/edit/${group.id}`)}>
                                                        <FileEdit className="mr-2 h-4 w-4" /> Edit Group
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteDialog(group)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Group
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                  </ContextMenuTrigger>
                                  <ContextMenuContent>
                                    <ContextMenuLabel>Actions for {group.businessName}</ContextMenuLabel>
                                    <ContextMenuItem onClick={() => router.push(`/businesses/${group.id}`)}>
                                        <Eye className="mr-2 h-4 w-4" /> View Public Profile
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => router.push(`/enterprise/groups/edit/${group.id}`)}>
                                        <FileEdit className="mr-2 h-4 w-4" /> Edit Group
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem className="text-destructive" onSelect={() => openDeleteDialog(group)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Group
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                </ContextMenu>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    You have not created any enterprise groups yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                    This action cannot be undone. This will permanently delete the group <span className="font-bold">{groupToDelete?.businessName}</span> and all associated data.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Deletion
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

