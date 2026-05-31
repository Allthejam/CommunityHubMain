
'use client';

import * as React from 'react';
import {
  Users,
  PlusCircle,
  MoreHorizontal,
  Loader2,
  FileEdit,
  Trash2,
  Mail,
  User as UserIcon,
  Search,
  HelpCircle,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedCallback } from 'use-debounce';
import { searchUserByEmailAction, addTeamMemberAction, removeTeamMemberAction, updateTeamMemberAction } from '@/lib/actions/teamActions';

type TeamMember = {
    userId: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
};

type Business = {
  id: string;
  businessName: string;
  team?: TeamMember[];
};

type SearchResultUser = {
    id: string;
    name: string;
    email: string;
    avatar: string;
}

export default function TeamManagementPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [selectedBusinessId, setSelectedBusinessId] = React.useState<string | null>(null);
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResult, setSearchResult] = React.useState<SearchResultUser & { error?: string } | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState("Content Editor");
  const [isAdding, setIsAdding] = React.useState(false);
  
  const [memberToEdit, setMemberToEdit] = React.useState<TeamMember | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = React.useState(false);


  const businessesQuery = useMemoFirebase(() => {
    if (!user) return null;
    const ownedQuery = query(collection(db, 'businesses'), where('ownerId', '==', user.uid));
    // In a future step, you might also query for businesses where the user is a manager
    return ownedQuery;
  }, [user, db]);

  const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);
  const selectedBusiness = React.useMemo(() => businesses?.find(b => b.id === selectedBusinessId), [businesses, selectedBusinessId]);

  const loading = isUserLoading || businessesLoading;

  React.useEffect(() => {
    if (businesses && businesses.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);
  
  const debouncedSearch = useDebouncedCallback(async (email: string) => {
    if (!email || email.length < 3 || !email.includes('@')) {
        setSearchResult(null);
        return;
    }
    setIsSearching(true);
    const result = await searchUserByEmailAction({ email });
    if (result.success && result.user) {
        setSearchResult(result.user);
    } else {
        setSearchResult({ error: result.error || 'No user found.' } as any);
    }
    setIsSearching(false);
  }, 500);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      debouncedSearch(e.target.value);
  }
  
  const handleAddMember = async () => {
    if (!selectedBusinessId || !searchResult || searchResult.error) return;

    setIsAdding(true);
    const result = await addTeamMemberAction({
        businessId: selectedBusinessId,
        user: searchResult,
        role: selectedRole,
    });

    if (result.success) {
        toast({ title: "Member Added", description: `${searchResult.name || 'The user'} has been added to the team.` });
        setIsDialogOpen(false);
        setSearchQuery("");
        setSearchResult(null);
        setSelectedRole("Content Editor");
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsAdding(false);
  };
  
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedBusinessId) return;
    
    if (!window.confirm("Are you sure you want to remove this member from the team?")) return;

    const result = await removeTeamMemberAction({ businessId: selectedBusinessId, memberId });
    
    if (result.success) {
      toast({ title: "Member Removed" });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const openEditDialog = (member: TeamMember) => {
    setMemberToEdit(member);
    setSelectedRole(member.role || "Content Editor");
  };

  const handleUpdateRole = async () => {
    if (!memberToEdit || !selectedBusinessId) return;
    setIsUpdatingRole(true);

    const result = await updateTeamMemberAction({ 
        businessId: selectedBusinessId,
        memberId: memberToEdit.userId,
        role: selectedRole,
    });

    if (result.success) {
        toast({ title: 'Role Updated', description: `${memberToEdit.name}'s role has been updated to ${selectedRole}.` });
        setMemberToEdit(null);
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsUpdatingRole(false);
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Users className="h-8 w-8" />
          Team Management
        </h1>
        <p className="text-muted-foreground">
          Invite and manage team members for your businesses.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Your Team</CardTitle>
          <CardDescription>Select a business to view and manage its team members.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-sm">
             <Select onValueChange={setSelectedBusinessId} disabled={loading || !businesses || businesses.length === 0} value={selectedBusinessId || ''}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a business..." />
                </SelectTrigger>
                <SelectContent>
                    {businesses?.map(biz => (
                        <SelectItem key={biz.id} value={biz.id}>
                            {biz.businessName}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          
          {selectedBusinessId && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBusiness?.team && selectedBusiness.team.length > 0 ? (
                    selectedBusiness.team.map((member) => (
                      <ContextMenu key={member.userId}>
                        <ContextMenuTrigger asChild>
                            <TableRow>
                                <TableCell>
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                    <AvatarImage src={member.avatar}/>
                                    <AvatarFallback>{member.name ? member.name.charAt(0) : '?'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                    <p className="font-medium">{member.name || 'Name Not Set'}</p>
                                    <p className="text-sm text-muted-foreground">{member.email}</p>
                                    </div>
                                </div>
                                </TableCell>
                                <TableCell>{member.role}</TableCell>
                                <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => openEditDialog(member)}><FileEdit className="mr-2 h-4 w-4" /> Edit Permissions</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRemoveMember(member.userId)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Remove Member
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuLabel>Actions for {member.name || member.email}</ContextMenuLabel>
                            <ContextMenuItem onSelect={() => openEditDialog(member)}><FileEdit className="mr-2 h-4 w-4" /> Edit Permissions</ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => handleRemoveMember(member.userId)}><Trash2 className="mr-2 h-4 w-4" /> Remove Member</ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No team members yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button disabled={!selectedBusinessId}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Invite New Member
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite a Team Member</DialogTitle>
                        <DialogDescription>Search for an existing user by their email address to add them to this team.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by user email..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="pl-10"
                            />
                        </div>
                        {isSearching && <div className="flex items-center justify-center p-4"><Loader2 className="animate-spin" /></div>}
                        {searchResult && (
                        <Card>
                            <CardContent className="p-4">
                            {searchResult.error ? (
                                <p className="text-sm text-destructive">{searchResult.error}</p>
                            ) : (
                                <div className="space-y-4">
                                <p className="text-sm font-semibold">User Found:</p>
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                    <AvatarImage src={searchResult.avatar} />
                                    <AvatarFallback>{searchResult.name ? searchResult.name.charAt(0) : '?'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                    <p>{searchResult.name || 'Name Not Set'}</p>
                                    <p className="text-xs text-muted-foreground">{searchResult.email}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="role-select">Assign Role</Label>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => e.stopPropagation()}>
                                                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Team Role Permissions</DialogTitle>
                                                </DialogHeader>
                                                <div className="py-4 space-y-4">
                                                    <div>
                                                        <h4 className="font-semibold">Content Editor</h4>
                                                        <p className="text-sm text-muted-foreground">Can edit business profile pages (Page 2, Page 3), manage the photo gallery, and upload minutes.</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold">Advert Manager</h4>
                                                        <p className="text-sm text-muted-foreground">Can create, edit, and manage adverts, events and upload minutes for the business.</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold">Manager</h4>
                                                        <p className="text-sm text-muted-foreground">Has full control over the business listing, including managing the team and all content, but cannot manage billing.</p>
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button>Close</Button>
                                                    </DialogClose>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger id="role-select">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Content Editor">Content Editor</SelectItem>
                                        <SelectItem value="Advert Manager">Advert Manager</SelectItem>
                                        <SelectItem value="Manager">Manager</SelectItem>
                                    </SelectContent>
                                    </Select>
                                </div>
                                </div>
                            )}
                            </CardContent>
                        </Card>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddMember} disabled={isAdding || !searchResult || !!searchResult.error}>
                            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Add to Team
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={!!memberToEdit} onOpenChange={() => setMemberToEdit(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Role for {memberToEdit?.name}</DialogTitle>
                        <DialogDescription>Select a new role for this team member.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="business-role-select">Role</Label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger id="business-role-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Content Editor">Content Editor</SelectItem>
                                <SelectItem value="Advert Manager">Advert Manager</SelectItem>
                                <SelectItem value="Manager">Manager</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMemberToEdit(null)}>Cancel</Button>
                        <Button onClick={handleUpdateRole} disabled={isUpdatingRole}>
                            {isUpdatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Update Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
