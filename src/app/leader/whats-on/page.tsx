
"use client";

import * as React from "react";
import Link from "next/link";
import {
    ClipboardList,
    MoreHorizontal,
    Archive,
    FileEdit,
    PlusCircle,
    RotateCw,
    Ban,
    Trash2,
    Loader2,
} from "lucide-react"
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ItemStatus = "Active" | "Temporarily Closed" | "Archived";

export type WhatsonItem = {
  id: string;
  title: string;
  category: string;
  status: ItemStatus;
};


const StatusBadge = ({ status }: { status: ItemStatus }) => {
  const statusStyles: { [key in ItemStatus]: { variant: "default" | "secondary" | "destructive" | "outline", className: string, text: string } } = {
    Active: { variant: "default", className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", text: "Active" },
    "Temporarily Closed": { variant: "secondary", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", text: "Temporarily Closed" },
    Archived: { variant: "outline", className: "border-dashed", text: "Archived" },
  };

  const style = statusStyles[status] || { variant: "secondary", className: "", text: "Unknown" };

  return (
    <Badge variant={style.variant} className={cn("capitalize", style.className)}>
      {style.text}
    </Badge>
  );
};


const ItemRow = React.memo(({ item, onUpdateStatus, onDelete }: { item: WhatsonItem; onUpdateStatus: (id: string, status: ItemStatus) => void; onDelete: (id: string) => void; }) => {
    const { status } = item;
    return (
        <TableRow>
            <TableCell className="font-medium">{item.title}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell><StatusBadge status={status} /></TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href={`/leader/whatson/edit/${item.id}`}><FileEdit className="mr-2 h-4 w-4" />Edit Listing</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {status === 'Active' && <DropdownMenuItem onClick={() => onUpdateStatus(item.id, 'Temporarily Closed')}><Ban className="mr-2 h-4 w-4" />Temporarily Close</DropdownMenuItem>}
                    {status === 'Temporarily Closed' && <DropdownMenuItem onClick={() => onUpdateStatus(item.id, 'Active')}><RotateCw className="mr-2 h-4 w-4" />Re-activate</DropdownMenuItem>}
                    {status !== 'Archived' && <DropdownMenuItem onClick={() => onUpdateStatus(item.id, 'Archived')}><Archive className="mr-2 h-4 w-4" />Archive Listing</DropdownMenuItem>}
                    {status === 'Archived' && (
                        <>
                            <DropdownMenuItem onClick={() => onUpdateStatus(item.id, 'Active')}><RotateCw className="mr-2 h-4 w-4" />Re-activate</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(item.id)}>
                                <Trash2 className="mr-2 h-4 w-4"/>Delete Permanently
                            </DropdownMenuItem>
                        </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
});
ItemRow.displayName = 'ItemRow';

const TABS: { value: string, label: string }[] = [
    { value: "all", label: "All Items" },
    { value: "Active", label: "Active" },
    { value: "Temporarily Closed", label: "Temporarily Closed" },
    { value: "Archived", label: "Archived" },
];


export default function LeaderWhatsonPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const [whatsonItems, setWhatsonItems] = React.useState<WhatsonItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { toast } = useToast();
    const [activeTab, setActiveTab] = React.useState("all");

    React.useEffect(() => {
        if (isUserLoading || isProfileLoading) return;
        
        if (!userProfile?.communityId || !db) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(
            collection(db, "whatson"),
            where("communityId", "==", userProfile.communityId)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const itemsData: WhatsonItem[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                itemsData.push({ 
                    id: doc.id,
                    ...data
                } as WhatsonItem);
            });
            setWhatsonItems(itemsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching what's on items:", error);
            toast({
                title: "Error fetching data",
                description: "Could not retrieve what's on items from the database.",
                variant: "destructive"
            });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile, isUserLoading, isProfileLoading, db, toast]);

    const onTabChange = (value: string) => {
        setActiveTab(value);
    }
    
    const filteredItems = React.useMemo(() => {
        if (activeTab === 'all') return whatsonItems;
        return whatsonItems.filter(item => item.status === activeTab);
    }, [whatsonItems, activeTab]);

    const handleUpdateStatus = async (id: string, status: ItemStatus) => {
        if (!db) return;
        const itemRef = doc(db, 'whatson', id);
        try {
            await updateDoc(itemRef, { status });
            toast({ title: "Status Updated", description: "The item's status has been changed." });
        } catch (error) {
            toast({ title: "Error", description: "Could not update item status.", variant: "destructive" });
        }
    }

    const handleDelete = async (id: string) => {
        if (!db) return;
        if (!window.confirm("Are you sure you want to permanently delete this listing?")) {
            return;
        }
        const itemRef = doc(db, 'whatson', id);
        try {
            await deleteDoc(itemRef);
            toast({ title: "Item Deleted", description: "The item has been permanently removed." });
        } catch (error) {
            toast({ title: "Error", description: "Could not delete the item.", variant: "destructive" });
        }
    }
    
    return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Manage "What's On"
        </h1>
        <p className="text-muted-foreground">
            Create and manage permanent attractions and venues for your community.
        </p>
      </div>

       <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <Tabs value={activeTab} onValueChange={onTabChange}>
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                        {TABS.map(tab => (
                            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
                 <Button asChild>
                    <Link href="/leader/whatson/create">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create Item
                    </Link>
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>Item / Venue</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || isUserLoading || isProfileLoading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <div className="flex justify-center items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Loading items...</span>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <ItemRow key={item.id} item={item} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} />
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center"
                    >
                      No items in this category.
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
