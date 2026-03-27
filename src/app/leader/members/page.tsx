
'use client';

import * as React from "react";
import {
    MoreHorizontal,
    Users,
    UserPlus,
    Loader2,
    ShieldAlert,
    Crown,
    UserX,
    UserCheck,
    Archive,
    FilterX,
    ChevronDown,
    Eye,
    EyeOff,
    User as UserIcon,
    Calendar,
    FileEdit,
    Clock,
    ArrowUpDown,
    UserCog,
    Trash2,
    ChevronsUpDown,
    Check,
    AlertTriangle,
    Ban,
} from "lucide-react"
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { addExistingMemberToCommunity, removeMemberFromCommunityAction, updateMemberRoleAction } from "@/lib/actions/teamActions";
import { changeAccountTypeAction } from '@/lib/actions/userActions';
import { updateMemberStatusAction } from "@/lib/actions/memberActions";
import { PaginationControls } from "@/components/ui/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from "@/lib/utils";
import { appointCommunityLeaderAction } from "@/lib/actions/teamActions";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


type MemberStatus = 'active' | 'suspended' | 'pending approval' | 'under investigation' | 'hidden';

export type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  accountType: 'personal' | 'business' | 'enterprise' | 'national' | 'advertiser' | 'leader' | 'reporter';
  status: MemberStatus;
  joined: any;
  communityId: string;
  avatar: string;
  offenseCount?: number;
  communityRoles?: Record<string, any>;
  gender?: string;
  ageRange?: string;
  community?: string;
};

type CommunityOption = {
    id: string;
    name: string;
}

const memberStatuses: MemberStatus[] = ['active', 'suspended', 'pending approval', 'under investigation', 'hidden'];
const accountTypes: Member['accountType'][] = ['personal', 'business', 'enterprise', 'leader', 'reporter'];
const communityTeamRoles = ['reporter', 'editor', 'moderator', 'broadcaster', 'administrator', 'vice-president', 'treasurer', 'secretary', 'leader'];

const StatusBadge = ({ status }: { status: MemberStatus }) => {
    const statusConfig = {
        'active': { className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
        'suspended': { className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
        'pending approval': { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
        'under investigation': { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' },
        'hidden': { className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300' },
    };
    return <Badge className={statusConfig[status] || ''}>{status}</Badge>;
}

const UserRow = React.memo(({ user, unassignedCommunities, onAppoint, onUpdateStatus, onViewDetails, onEditRole, onRemove, liaisonExists }: { 
    user: Member; 
    unassignedCommunities: CommunityOption[], 
    onAppoint: (userId: string, communityId: string, communityName: string) => void;
    onUpdateStatus: (userId: string, status: MemberStatus) => void;
    onViewDetails: (user: Member) => void;
    onEditRole: (user: Member) => void;
    onRemove: (user: Member) => void;
    liaisonExists: boolean;
}) => {
    const [isAppointDialogOpen, setIsAppointDialogOpen] = React.useState(false);
    const [selectedCommunity, setSelectedCommunity] = React.useState("");

    const leaderRoleCount = user.communityRoles ? Object.keys(user.communityRoles).length : (user.role === 'president' || user.role === 'leader' ? 1 : 0);

    const handleConfirmAppointment = () => {
        const community = unassignedCommunities.find(c => c.id === selectedCommunity);
        if(community) {
            onAppoint(user.id, community.id, community.name);
            setIsAppointDialogOpen(false);
            setSelectedCommunity("");
        }
    };
    
    const dropdownMenuContent = (
        <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions for {user.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewDetails(user)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
            <DropdownMenuItem asChild><Link href={`/profile/${user.id}`}><UserIcon className="mr-2 h-4 w-4" /> View Profile</Link></DropdownMenuItem>
            {user.role !== 'president' && (
                <DropdownMenuItem onClick={() => onEditRole(user)}><UserCog className="mr-2 h-4 w-4" />Change Role</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setIsAppointDialogOpen(true)}>
                <Crown className="mr-2 h-4 w-4" /> Appoint as Leader
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Status</DropdownMenuLabel>
             {user.status !== 'active' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(user.id, 'active')}>
                <UserCheck className="mr-2 h-4 w-4" /> Reactivate Member
                </DropdownMenuItem>
            )}
            {user.status !== 'suspended' && (
                <DropdownMenuItem className="text-amber-600 focus:text-amber-600" onClick={() => onUpdateStatus(user.id, 'suspended')}>
                <Ban className="mr-2 h-4 w-4" /> Suspend Member
                </DropdownMenuItem>
            )}
             <DropdownMenuItem onClick={() => onUpdateStatus(user.id, 'pending approval')}>
                <Clock className="mr-2 h-4 w-4" /> Set to Pending
            </DropdownMenuItem>
            <DropdownMenuItem className="text-amber-600 focus:text-amber-600" onClick={() => onUpdateStatus(user.id, 'hidden')}>
                <EyeOff className="mr-2 h-4 w-4" /> Hide User
            </DropdownMenuItem>
            {user.status === 'hidden' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(user.id, 'active')}>
                    <Eye className="mr-2 h-4 w-4" /> Un-hide User
                </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onRemove(user)}>
                <Trash2 className="mr-2 h-4 w-4"/> Remove from Community
            </DropdownMenuItem>
        </DropdownMenuContent>
    );

    const contextMenuItems = (
        <>
            <ContextMenuLabel>Actions for {user.name}</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => onViewDetails(user)}><Eye className="mr-2 h-4 w-4" /> View Details</ContextMenuItem>
            <ContextMenuItem asChild><Link href={`/profile/${user.id}`}><UserIcon className="mr-2 h-4 w-4" /> View Profile</Link></ContextMenuItem>
            {user.role !== 'president' && (
                <ContextMenuItem onSelect={() => onEditRole(user)}><UserCog className="mr-2 h-4 w-4" />Change Role</ContextMenuItem>
            )}
            <ContextMenuItem onSelect={() => setIsAppointDialogOpen(true)}>
                <Crown className="mr-2 h-4 w-4" /> Appoint as Leader
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuLabel>Status</ContextMenuLabel>
            {user.status !== 'active' && (
                <ContextMenuItem onSelect={() => onUpdateStatus(user.id, 'active')}>
                <UserCheck className="mr-2 h-4 w-4" /> Reactivate Member
                </ContextMenuItem>
            )}
            {user.status !== 'suspended' && (
                <ContextMenuItem className="text-amber-600 focus:text-amber-600" onSelect={() => onUpdateStatus(user.id, 'suspended')}>
                <Ban className="mr-2 h-4 w-4 text-amber-600"/> Suspend Member
                </ContextMenuItem>
            )}
             <ContextMenuItem onSelect={() => onUpdateStatus(user.id, 'pending approval')}>
                <Clock className="mr-2 h-4 w-4" /> Set to Pending
            </ContextMenuItem>
            <ContextMenuItem className="text-amber-600 focus:text-amber-600" onSelect={() => onUpdateStatus(user.id, 'hidden')}>
                <EyeOff className="mr-2 h-4 w-4" /> Hide User
            </ContextMenuItem>
            {user.status === 'hidden' && (
                <ContextMenuItem onClick={() => onUpdateStatus(user.id, 'active')}>
                    <Eye className="mr-2 h-4 w-4" /> Un-hide User
                </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => onRemove(user)}>
                <UserX className="mr-2 h-4 w-4"/> Remove from Community
            </ContextMenuItem>
        </>
    );

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <TableRow className="block md:table-row">
                        {/* Mobile View */}
                        <td colSpan={7} className="p-0 md:hidden">
                            <div className="flex items-center justify-between gap-2 p-3">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={(user as any).avatar} alt={user.name} />
                                        <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-semibold truncate">{user.name}</p>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={user.status} />
                                            <span className="text-xs text-muted-foreground capitalize">{user.title || user.role}</span>
                                        </div>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    {dropdownMenuContent}
                                </DropdownMenu>
                            </div>
                        </td>
                        
                        {/* Desktop View */}
                        <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarImage src={(user as any).avatar} alt={user.name} />
                                    <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium">{user.name || 'No Name Provided'}</div>
                                    <div className="text-sm text-muted-foreground">{user.email}</div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell capitalize">{user.title || user.role}</TableCell>
                        <TableCell className="hidden md:table-cell">{user.community}</TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                            <span className="font-medium">{leaderRoleCount}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <StatusBadge status={user.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                            {user.offenseCount && user.offenseCount > 0 ? (
                                <Badge variant="destructive" className="flex items-center gap-1.5 justify-center">
                                    <ShieldAlert className="h-3 w-3" />
                                    {user.offenseCount}
                                </Badge>
                            ) : (
                                <span className="text-xs text-muted-foreground">0</span>
                            )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                {dropdownMenuContent}
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {contextMenuItems}
                </ContextMenuContent>
            </ContextMenu>
            <Dialog open={isAppointDialogOpen} onOpenChange={setIsAppointDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Appoint Community Leader</DialogTitle>
                        <DialogDescription>
                            Appoint <span className="font-bold">{user.name}</span> as the leader of a private, unassigned community.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="community-appointment">Select a Community</Label>
                            <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                                <SelectTrigger id="community-appointment">
                                    <SelectValue placeholder="Select a private community..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {unassignedCommunities.length > 0 ? (
                                        unassignedCommunities.map(comm => (
                                            <SelectItem key={comm.id} value={comm.id}>
                                                {comm.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <p className="p-4 text-sm text-muted-foreground">No unassigned private communities found.</p>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAppointDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmAppointment} disabled={!selectedCommunity}>
                            Confirm Appointment & Send Invite
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
});
UserRow.displayName = 'UserRow';


const MemberDetailsDialog = ({ user, onUpdateStatus, onRemove, onEditRole }: {
    user: Member | null;
    onUpdateStatus: (userId: string, status: MemberStatus) => void;
    onRemove: (user: Member) => void;
    onEditRole: (user: Member) => void;
}) => {
    if (!user) return null;

    return (
    <DialogContent>
        <DialogHeader>
            <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <DialogTitle>{user.name || 'No Name Provided'}</DialogTitle>
                    <DialogDescription>{user.email}</DialogDescription>
                </div>
            </div>
        </DialogHeader>
        <div className="py-4 grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-sm font-semibold">Gender</p><p className="capitalize">{user.gender || 'N/A'}</p></div>
            <div><p className="text-sm font-semibold">Age Range</p><p>{user.ageRange || 'N/A'}</p></div>
            <div><p className="text-sm font-semibold">Role</p><p className="capitalize">{user.title || user.role}</p></div>
            <div><p className="text-sm font-semibold">Status</p><StatusBadge status={user.status} /></div>
            <div><p className="text-sm font-semibold">Joined</p><p>{format(user.joined, 'PPP')}</p></div>
            <div><p className="text-sm font-semibold">Offenses</p><p>{user.offenseCount || 0}</p></div>
            <div className="col-span-2"><p className="text-sm font-semibold">Community</p><p>{user.community || 'N/A'}</p></div>
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2">
            <Button asChild><Link href={`/profile/${user.id}`}>View Profile</Link></Button>
            <Button variant="outline" onClick={() => onEditRole(user)}>Change Role</Button>
            {user.status !== 'active' && <Button variant="secondary" onClick={() => onUpdateStatus(user.id, 'active')}>Activate</Button>}
            {user.status !== 'suspended' && <Button variant="secondary" className="text-amber-600 hover:text-amber-600" onClick={() => onUpdateStatus(user.id, 'suspended')}>Suspend</Button>}
            <Button variant="destructive" onClick={() => onRemove(user)}>Remove Member</Button>
            <DialogClose asChild><Button variant="ghost" className="col-span-2">Close</Button></DialogClose>
        </DialogFooter>
    </DialogContent>
    );
};


export default function LeaderMembersPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedUserForDialog, setSelectedUserForDialog] = React.useState<Member | null>(null);

  // Table state
  const [filters, setFilters] = React.useState<{ name: string; role: string[]; status: string[] }>({ name: "", role: [], status: [] });
  const [sorting, setSorting] = React.useState<{ key: keyof Member; order: 'asc' | 'desc' }>({ key: 'joined', order: 'desc' });
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [unassignedCommunities, setUnassignedCommunities] = React.useState<CommunityOption[]>([]);

  // Edit Member Dialog State
  const [memberToEdit, setMemberToEdit] = React.useState<Member | null>(null);
  const [newAccountType, setNewAccountType] = React.useState<Member['accountType']>('personal');
  const [newCommunityRole, setNewCommunityRole] = React.useState('');
  const [isUpdatingRole, setIsUpdatingRole] = React.useState(false);
  
  // Combobox states
  const [isUserSearchOpen, setIsUserSearchOpen] = React.useState(false);
  const [userSearchQuery, setUserSearchQuery] = React.useState("");

    React.useEffect(() => {
        if (!userProfile?.communityId || !db || !user) {
            setLoading(isUserLoading || profileLoading);
            return;
        }

        const q = query(
            collection(db, "users"),
            where("memberOf", "array-contains", userProfile.communityId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const membersData = snapshot.docs.map(doc => {
                const data = doc.data();
                const communityRoleData = data.communityRoles?.[userProfile.communityId];
                return {
                    id: doc.id,
                    ...data,
                    role: communityRoleData?.role || data.role || 'member',
                    title: communityRoleData?.title || data.title || '',
                    joined: doc.data().joined?.toDate ? doc.data().joined.toDate() : new Date(),
                } as Member
            });
            setMembers(membersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching members:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch community members.' });
            setLoading(false);
        });

        const communitiesQuery = query(
            collection(db, "businesses"), 
            where("type", "==", "topic"), 
            where("visibility", "==", "private")
        );
        const unsubscribeCommunities = onSnapshot(communitiesQuery, (snapshot) => {
            const comms = snapshot.docs
                .filter(doc => !doc.data().leaders || doc.data().leaders.length === 0)
                .map(doc => ({ id: doc.id, name: doc.data().name }));
            setUnassignedCommunities(comms);
        });

        return () => {
            unsubscribe();
            unsubscribeCommunities();
        };
    }, [userProfile?.communityId, isUserLoading, profileLoading, toast, user, db]);
  
  const handleSort = (key: keyof Member) => {
      setSorting(prev => ({
          key,
          order: prev.key === key && sorting.order === 'asc' ? 'desc' : 'asc'
      }));
  }
  
  const handleAppoint = async (userId: string, communityId: string, communityName: string) => {
        const result = await appointCommunityLeaderAction({ userId, communityId, communityName });
        if (result.success) {
            toast({
                title: "Invitation Sent",
                description: `User has been invited to lead the ${communityName} community.`,
            });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };
    
   const handleUpdateStatus = async (memberId: string, newStatus: MemberStatus) => {
        const result = await updateMemberStatusAction({ memberId, newStatus });
        if(result.success) {
            toast({ title: "Status Updated", description: `Member status has been set to ${newStatus}.` });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };

  const handleRemoveMember = async (member: Member) => {
    if (!userProfile?.communityId) return;
    if (window.confirm(`Are you sure you want to remove ${member.name} from the community?`)) {
        const result = await removeMemberFromCommunityAction({ memberId: member.id, communityId: userProfile.communityId });
        if (result.success) {
            toast({ title: 'Member Removed', description: `${member.name} has been removed.` });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    }
  };

    const handleUpdateRole = async () => {
        if(!memberToEdit || !user || !userProfile?.communityId) return;
        setIsUpdatingRole(true);
        
        const finalRole = newCommunityRole === 'none' ? '' : newCommunityRole;
        const getTitleFromRole = (role: string) => {
            if (!role) return '';
            return role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }
        const finalTitle = getTitleFromRole(finalRole);

        // Handle account type change
        if (newAccountType !== memberToEdit.accountType) {
            await changeAccountTypeAction({ userId: memberToEdit.id, newType: newAccountType, communityId: userProfile.communityId });
        }

        // Handle community role change
        const result = await updateMemberRoleAction({ 
            memberId: memberToEdit.id, 
            communityId: userProfile.communityId,
            newRole: finalRole, 
            newTitle: finalTitle,
        });

        if (result.success) {
            toast({ title: 'Role Updated', description: `${memberToEdit.name}'s roles have been updated.` });
            setMemberToEdit(null);
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsUpdatingRole(false);
    }
    
    const openEditDialog = (member: Member) => {
        setMemberToEdit(member);
        setNewAccountType(member.accountType || 'personal');
        setNewCommunityRole(member.role);
    };

    const filteredMembers = React.useMemo(() => {
        let filtered = members;
        if (filters.name) {
            filtered = filtered.filter(user => 
                (user.name && user.name.toLowerCase().includes(filters.name.toLowerCase())) || 
                (user.email && user.email.toLowerCase().includes(filters.name.toLowerCase()))
            );
        }
        if (filters.role.length > 0) {
            filtered = filtered.filter(user => filters.role.includes(user.role));
        }
        if (filters.status.length > 0) {
            filtered = filtered.filter(user => filters.status.includes(user.status));
        } else {
            filtered = filtered.filter(user => user.status !== 'hidden');
        }
        
        return [...filtered].sort((a, b) => {
            const key = sorting.key;
            if (!key) return 0;
            const valA = a[key] ?? '';
            const valB = b[key] ?? '';
            const order = sorting.order === 'asc' ? 1 : -1;

            if (key === 'joined' && valA instanceof Date && valB instanceof Date) {
                return (valA.getTime() - valB.getTime()) * order;
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return valA.localeCompare(valB) * order;
            }
            if (valA < valB) return -1 * order;
            if (valA > valB) return 1 * order;
            return 0;
        });
    }, [members, filters, sorting]);
  
    const pageCount = Math.ceil(filteredMembers.length / pagination.pageSize);
    const paginatedMembers = filteredMembers.slice(
        pagination.pageIndex * pagination.pageSize,
        (pagination.pageIndex + 1) * pagination.pageSize
    );
    
    const liaisonExists = members.some(m => m.role === 'police-liaison-officer');

    return (
    <>
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <Users className="h-8 w-8" />
                Manage Members
            </h1>
            <p className="text-muted-foreground">
                View, approve, and manage all members in your community.
            </p>
        </div>
      </div>
      <Card>
        <CardHeader>
             <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div>
                    <CardTitle>Community Members</CardTitle>
                    <CardDescription>A list of all members in your community.</CardDescription>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-4">
                <Input
                    placeholder="Filter by name..."
                    value={filters.name}
                    onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
                    className="max-w-sm"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">Role <ChevronDown className="ml-2 h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {communityTeamRoles.map(role => (
                            <DropdownMenuCheckboxItem
                                key={role}
                                checked={filters.role.includes(role)}
                                onCheckedChange={() => setFilters(f => ({ ...f, role: f.role.includes(role) ? f.role.filter(r => r !== role) : [...f.role, role] }))}
                            >{role.charAt(0).toUpperCase() + role.slice(1)}</DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">Status <ChevronDown className="ml-2 h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {memberStatuses.map(status => (
                            <DropdownMenuCheckboxItem
                                key={status}
                                checked={filters.status.includes(status)}
                                onCheckedChange={() => setFilters(f => ({ ...f, status: f.status.includes(status) ? f.status.filter(s => s !== status) : [...f.status, status] }))}
                            >{status.charAt(0).toUpperCase() + status.slice(1)}</DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                {(filters.name || filters.role.length > 0 || filters.status.length > 0) && (
                    <Button variant="ghost" onClick={() => setFilters({ name: "", role: [], status: [] })}>Reset <FilterX className="ml-2 h-4 w-4" /></Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border md:border-t-0">
            <Table className="responsive-table">
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('name')}>User <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                     <TableHead><Button variant="ghost" onClick={() => handleSort('role')}>Role <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('community')}>Community <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost">Leader Roles <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead className="text-center"><Button variant="ghost" onClick={() => handleSort('offenseCount')}>Offenses <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        </TableCell>
                    </TableRow>
                ) : paginatedMembers.length > 0 ? (
                  paginatedMembers.map((user) => (
                    <UserRow 
                        key={user.id} 
                        user={user} 
                        unassignedCommunities={unassignedCommunities} 
                        onAppoint={handleAppoint} 
                        onUpdateStatus={handleUpdateStatus}
                        onViewDetails={setSelectedUserForDialog}
                        onEditRole={openEditDialog}
                        onRemove={handleRemoveMember}
                        liaisonExists={liaisonExists}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center"
                    >
                      No members found.
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
                totalRows={filteredMembers.length}
            />
        </CardContent>
      </Card>

       <Dialog open={!!selectedUserForDialog} onOpenChange={() => setSelectedUserForDialog(null)}>
        <MemberDetailsDialog user={selectedUserForDialog} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveMember} onEditRole={openEditDialog} />
    </Dialog>

    <Dialog open={!!memberToEdit} onOpenChange={() => setMemberToEdit(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Change Roles for {memberToEdit?.name}</DialogTitle>
                <DialogDescription>Update account type and community-specific roles.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="account-type-select">Account Type</Label>
                    <Select value={newAccountType} onValueChange={(val) => setNewAccountType(val as Member['accountType'])}>
                        <SelectTrigger id="account-type-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {accountTypes.map(type => (
                                <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="role-select">Community Team Role</Label>
                    <Select value={newCommunityRole} onValueChange={setNewCommunityRole}>
                        <SelectTrigger id="role-select">
                            <SelectValue placeholder="No specific role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {communityTeamRoles.map(role => {
                                const formattedLabel = role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                return (
                                    <SelectItem key={role} value={role}>
                                        {formattedLabel}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
                 <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Changing roles may grant or revoke significant permissions.
                    </AlertDescription>
                </Alert>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setMemberToEdit(null)}>Cancel</Button>
                <Button onClick={handleUpdateRole} disabled={isUpdatingRole}>
                    {isUpdatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Confirm & Update Role
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </div>
    </>
  );
}
