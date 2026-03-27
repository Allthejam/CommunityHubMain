
'use client';

import * as React from 'react';
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  Circle,
  Clock,
  File,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Phone,
  Pin,
  PlusCircle,
  Search,
  Send,
  Settings,
  Smile,
  Star,
  ThumbsUp,
  Trash2,
  User as UserIcon,
  UserPlus,
  Video,
  VolumeX,
  X,
  Maximize,
  Minimize,
  Check,
  Flag,
  Camera,
  LogOut,
  ArchiveRestore,
  Home,
  Lock,
  LifeBuoy,
  Upload,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase, useAuth } from '@/firebase';
import { collection, doc, orderBy, query, getDocs, where, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, deleteDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { format, isValid } from "date-fns";
import EmojiPicker, { Theme as EmojiTheme } from "emoji-picker-react";
import { sendPushNotificationAction } from '@/lib/actions/notificationActions';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { deleteMessageAction } from '@/lib/actions/chatActions';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'firebase/auth';


type Message = {
    senderId: string;
    sender: string;
    text: string;
    image?: string;
    timestamp: any;
    isOwn: boolean;
    avatar: string;
    members?: { id: string; name: string }[];
};

type Conversation = {
    id: string;
    name: string;
    avatar: string;
    lastMessage: string;
    isArchived: boolean;
    hasUnread?: boolean;
    lastMessageTimestamp: any;
    createdBy: string;
    scope: 'public' | 'private' | 'platform';
    memberIds: string[];
    archivedBy?: string[];
    communityId: string;
    isPlatformChat?: boolean;
};

type TeamMember = {
    id: string;
    name: string;
    avatar?: string;
};

type ReadStatus = {
    [conversationId: string]: { lastRead: any };
}

const MemberListDialog = ({ members }: { members: { id: string; name: string }[] }) => (
    <Dialog>
        <DialogTrigger asChild>
            <Button variant="link" className="p-0 h-auto text-primary">...and {members.length - 4} more</Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>All Members</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-64">
                <div className="space-y-2 pr-4">
                    {members.map(member => (
                        <div key={member.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                            <UserIcon className="h-4 w-4" />
                            <span>{member.name}</span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
);

function ChatPageContent() {
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const [sidebarWidth, setSidebarWidth] = React.useState(320);
    const [isResizing, setIsResizing] = React.useState(false);
    const sidebarRef = React.useRef<HTMLDivElement>(null);
    
    const communityId = userProfile?.communityId;
    const chatTheme = userProfile?.settings?.chatTheme || { mode: 'light', texture: '', cardTexture: '' };

    const [currentPage, setCurrentPage] = React.useState('main');
    const [currentChatId, setCurrentChatId] = React.useState<string | null>(null);
    const [conversations, setConversations] = React.useState<Conversation[]>([]);
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [newMessage, setNewMessage] = React.useState('');
    const [imageToSend, setImageToSend] = React.useState<string | null>(null);
    const [loadingConversations, setLoadingConversations] = React.useState(true);
    const [loadingMessages, setLoadingMessages] = React.useState(false);
    const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);

    const [isMobileChatOpen, setIsMobileChatOpen] = React.useState(false);
    const [isMenuOpen, setMenuOpen] = React.useState(false);
    const [isActionsOpen, setActionsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    
    const [openNewChatDialog, setOpenNewChatDialog] = React.useState(false);
    const [newGroupName, setNewGroupName] = React.useState("");
    const [selectedMembers, setSelectedMembers] = React.useState<string[]>([]);
    const [isCreatingChat, setIsCreatingChat] = React.useState(false);
    const bottomOfMessagesRef = React.useRef<HTMLDivElement>(null);
    const [conversationToDelete, setConversationToDelete] = React.useState<Conversation | null>(null);
    const [pinnedConversations, setPinnedConversations] = React.useState<string[]>([]);
    const [favoriteConversations, setFavoriteConversations] = React.useState<string[]>([]);
    const [readStatus, setReadStatus] = React.useState<ReadStatus>({});
    const isInitialLoadRef = React.useRef(true);
    const [isChatFullScreen, setChatFullScreen] = React.useState(false);
    
    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const auth = useAuth();

    const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        const conversationIdFromUrl = searchParams.get('conversationId');
        if (conversationIdFromUrl) {
            setCurrentChatId(conversationIdFromUrl);
            setIsMobileChatOpen(true);
        }
    }, [searchParams]);

    React.useEffect(() => {
        const storedPinned = localStorage.getItem('pinnedLeaderChats');
        if (storedPinned) setPinnedConversations(JSON.parse(storedPinned));
        
        const storedFavorites = localStorage.getItem('favoriteLeaderChats');
        if (storedFavorites) setFavoriteConversations(JSON.parse(storedFavorites));
    }, []);

    const togglePin = (conversationId: string) => {
        const newPinned = pinnedConversations.includes(conversationId)
            ? pinnedConversations.filter(id => id !== conversationId)
            : [...pinnedConversations, conversationId];
        setPinnedConversations(newPinned);
        localStorage.setItem('pinnedLeaderChats', JSON.stringify(newPinned));
    };

    const toggleFavorite = (conversationId: string) => {
        const newFavorites = favoriteConversations.includes(conversationId)
            ? favoriteConversations.filter(id => id !== conversationId)
            : [...favoriteConversations, conversationId];
        setFavoriteConversations(newFavorites);
        localStorage.setItem('favoriteLeaderChats', JSON.stringify(newFavorites));
    };
    
    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isValid(date)) {
            return format(date, 'p');
        }
        return '';
    };

    React.useEffect(() => {
        if (!user || !db) {
            setLoadingConversations(false);
            return;
        }

        const readStatusQuery = query(collection(db, "users", user.uid, "readStatus"));
        const unsubscribeReadStatus = onSnapshot(readStatusQuery, (snapshot) => {
            const status: ReadStatus = {};
            snapshot.forEach(doc => {
                status[doc.id] = doc.data() as { lastRead: any };
            });
            setReadStatus(status);
        });

        const conversationsQuery = query(
            collection(db, "conversations"),
            where("memberIds", "array-contains", user.uid)
        );

        const unsubscribeConvos = onSnapshot(conversationsQuery, async (snapshot) => {
            let currentReadStatus: ReadStatus = {};
            const readStatusRef = collection(db, "users", user.uid, "readStatus");
            const readSnapshot = await getDocs(readStatusRef);
            readSnapshot.forEach(doc => {
                currentReadStatus[doc.id] = doc.data() as { lastRead: any };
            });

            const allUserConvos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
            
            const filteredConvos = allUserConvos.map(convo => {
                const lastReadTimestamp = currentReadStatus[convo.id]?.lastRead?.seconds || 0;
                const hasUnread = (convo.lastMessageTimestamp?.seconds || 0) > lastReadTimestamp;
                return {
                    ...convo,
                    isArchived: convo.archivedBy?.includes(user.uid) || false,
                    hasUnread,
                };
            });
            
            filteredConvos.sort((a, b) => (b.lastMessageTimestamp?.seconds || 0) - (a.lastMessageTimestamp?.seconds || 0));
            setConversations(filteredConvos);
            setLoadingConversations(false);
        });
        
        if (communityId) {
            const membersQuery = query(
                collection(db, 'users'),
                where('memberOf', 'array-contains', communityId)
            );

            const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
                const members: TeamMember[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.settings?.publicProfile !== false) {
                        members.push({
                            id: doc.id,
                            name: data.name,
                            avatar: data.avatar,
                        });
                    }
                });
                setTeamMembers(members);
            });
             return () => unsubscribeMembers();
        }

        return () => {
            unsubscribeConvos();
            unsubscribeReadStatus();
        };

    }, [user, communityId, db]);
    
     React.useEffect(() => {
        if (!currentChatId || !user || !db) {
            setMessages([]);
            return;
        }
        
        isInitialLoadRef.current = true;
        const markAsRead = async () => {
            const readStatusRef = doc(db, `users/${user.uid}/readStatus`, currentChatId);
            await setDoc(readStatusRef, { lastRead: serverTimestamp() }, { merge: true });
        };
        markAsRead();

        setLoadingMessages(true);
        const messagesQuery = query(collection(db, `conversations/${currentChatId}/messages`), orderBy("timestamp", "asc"));
        
        const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
            const msgs: Message[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                msgs.push({
                    ...data,
                    isOwn: data.senderId === user?.uid
                } as Message);
            });
            setMessages(msgs);
            setLoadingMessages(false);
        }, () => setLoadingMessages(false));

        return () => unsubscribeMessages();
    }, [currentChatId, user, db]);
    
    React.useEffect(() => {
        if (!loadingMessages) {
          bottomOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }, [messages, loadingMessages]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !imageToSend) || !currentChatId || !user || !userProfile || !db) return;
    
        const convoRef = doc(db, 'conversations', currentChatId);
        const messagesRef = collection(convoRef, 'messages');
    
        try {
            const messageData: Partial<Message> = {
                senderId: user.uid,
                sender: userProfile.name,
                avatar: userProfile.avatar || '',
                timestamp: serverTimestamp()
            };

            if (newMessage.trim()) {
                messageData.text = newMessage;
            }

            if (imageToSend) {
                messageData.image = imageToSend;
            }

            await addDoc(messagesRef, messageData);
    
            await updateDoc(convoRef, {
                lastMessage: newMessage || "Sent an image",
                lastMessageTimestamp: serverTimestamp(),
            });
    
            const conversation = conversations.find(c => c.id === currentChatId);
            if (conversation) {
                const otherMembers = (conversation as any).memberIds.filter((id: string) => id !== user.uid);
                
                await sendPushNotificationAction({
                    audience: { type: 'users', value: otherMembers },
                    notification: {
                        title: `New message in "${conversation.name}"`,
                        body: `${userProfile.name}: ${newMessage || 'Sent an image'}`,
                        tag: conversation.id,
                    },
                });

                for (const memberId of otherMembers) {
                    await addDoc(collection(db, 'notifications'), {
                        recipientId: memberId,
                        type: 'New Message',
                        subject: `New message in "${conversation.name}"`,
                        from: userProfile.name,
                        date: new Date().toISOString(),
                        status: 'new',
                        relatedId: currentChatId
                    });
                }
            }
    
            setNewMessage("");
            setImageToSend(null);
    
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
        }
    };
    
    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImageToSend(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    React.useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
        }
    }, [newMessage]);


    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
        setIsResizing(true);
        document.body.style.cursor = 'col-resize';
    }, []);

    const handleMouseUp = React.useCallback(() => {
        setIsResizing(false);
        document.body.style.cursor = 'default';
    }, []);

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        if (isResizing && sidebarRef.current) {
            const sidebarLeft = sidebarRef.current.getBoundingClientRect().left;
            let newWidth = e.clientX - sidebarLeft;
            
            // Clamp the width
            if (newWidth < 250) newWidth = 250;
            if (newWidth > 600) newWidth = 600;
            
            setSidebarWidth(newWidth);
        }
    }, [isResizing]);
    
    React.useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);


    const loadChat = (chat: any) => {
        setCurrentChatId(chat.id);
        setIsMobileChatOpen(true);
        setMenuOpen(false);
        setActionsOpen(false);
    };

    const switchPage = (page: string) => {
        setCurrentPage(page);
    }
    
    const closeChat = () => setIsMobileChatOpen(false);
    
    const handleCreateChat = async () => {
        if (!newGroupName.trim() || selectedMembers.length === 0 || !user || !communityId || !db) {
            return;
        }
        setIsCreatingChat(true);

        const memberIds = [user.uid, ...selectedMembers];
        const allMemberObjects = [
            { id: user.uid, name: userProfile?.name || 'You' },
            ...selectedMembers.map(id => {
                const member = teamMembers.find(m => m.id === id);
                return { id: id, name: member?.name || 'Unknown User' };
            })
        ];
        const avatarSeed = memberIds.sort().join('');
        const initialMessage = `${userProfile?.name} created this group.`;
        
        try {
            const newConvoRef = await addDoc(collection(db, 'conversations'), {
                name: newGroupName,
                avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(avatarSeed)}`,
                communityId: communityId,
                memberIds: memberIds,
                scope: 'private',
                lastMessage: initialMessage,
                lastMessageTimestamp: serverTimestamp(),
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                archivedBy: [],
            });

            for (const memberId of selectedMembers) {
                await addDoc(collection(db, 'notifications'), {
                    recipientId: memberId,
                    type: 'New Message',
                    subject: `You were added to a new chat: "${newGroupName}"`,
                    from: userProfile?.name,
                    date: new Date().toISOString(),
                    status: 'new',
                    relatedId: newConvoRef.id
                });
            }

            const initialMsgRef = collection(newConvoRef, 'messages');
            await addDoc(initialMsgRef, {
                senderId: "system",
                sender: "System",
                avatar: "",
                text: `${userProfile?.name} created the group.`,
                members: allMemberObjects,
                timestamp: serverTimestamp(),
            });

            setCurrentChatId(newConvoRef.id);
            setOpenNewChatDialog(false);
            setNewGroupName("");
            setSelectedMembers([]);
        } catch (error) {
            console.error("Error creating chat:", error);
            toast({ title: "Error", description: "Failed to create new chat.", variant: "destructive"});
        } finally {
            setIsCreatingChat(false);
        }
    };
    
    const findOrCreatePlatformChat = async () => {
        if (!user || !userProfile || !db) return;
        
        const q = query(
            collection(db, "conversations"),
            where("isPlatformChat", "==", true),
            where("memberIds", "array-contains", user.uid)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const existingChat = querySnapshot.docs[0];
            loadChat(existingChat);
        } else {
             try {
                const newConvoRef = await addDoc(collection(db, 'conversations'), {
                    name: "Platform Support",
                    avatar: `https://i.postimg.cc/HnhWpVyt/Hub-Logo192x192.png`,
                    isPlatformChat: true,
                    communityId: communityId,
                    memberIds: [user.uid],
                    lastMessage: "You have started a conversation with Platform Support.",
                    lastMessageTimestamp: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    archivedBy: [],
                });

                const initialMsgRef = collection(newConvoRef, 'messages');
                await addDoc(initialMsgRef, {
                    senderId: "system",
                    sender: "System",
                    avatar: "",
                    text: "Welcome to Platform Support. An admin will be with you shortly.",
                    timestamp: serverTimestamp(),
                });

                loadChat({ id: newConvoRef.id, name: "Platform Support", avatar: `https://i.postimg.cc/HnhWpVyt/Hub-Logo192x192.png`, lastMessage: "You have started a conversation with Platform Support.", isArchived: false, lastMessageTimestamp: serverTimestamp(), createdBy: user.uid, scope: 'private', memberIds: [user.uid], communityId: communityId});
            } catch (error) {
                console.error("Error creating platform chat:", error);
                toast({ title: "Error", description: "Failed to create support chat.", variant: "destructive"});
            }
        }
    }
    
    const toggleArchive = async (conversationId: string) => {
        if (!user || !db) return;
        const convoRef = doc(db, 'conversations', conversationId);
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        const isArchived = conversation.isArchived;
        const currentArchivedBy = (conversation as any).archivedBy || [];
        
        const newArchivedBy = isArchived
            ? currentArchivedBy.filter((uid: string) => uid !== user.uid)
            : [...currentArchivedBy, user.uid];

        try {
            await updateDoc(convoRef, { archivedBy: newArchivedBy });
             toast({
                title: `Conversation ${isArchived ? 'Unarchived' : 'Archived'}`,
                description: `"${conversation.name}" has been moved.`
            });
            if (currentChatId === conversationId && !isArchived) {
                const nextConvo = conversations.find(c => !(c as any).archivedBy?.includes(user.uid) && c.id !== conversationId);
                setCurrentChatId(nextConvo?.id || null);
            }
        } catch (error) {
            console.error("Error archiving chat:", error);
            toast({ title: "Error", description: "Failed to update chat.", variant: "destructive" });
        }
    };
    
    const handleLeaveGroup = async (conversationId: string | null) => {
        if (!conversationId || !user || !db) return;
        const convoRef = doc(db, 'conversations', conversationId);

        try {
            await updateDoc(convoRef, {
                memberIds: arrayRemove(user.uid)
            });
            toast({
                title: "You have left the group",
                description: "You will no longer receive messages from this conversation."
            });
            if (currentChatId === conversationId) {
                setCurrentChatId(null);
            }
        } catch (error) {
            console.error("Error leaving group:", error);
            toast({ title: "Error", description: "Could not leave the group.", variant: "destructive" });
        }
    }
    
    const handleDeleteChat = async () => {
        if (!conversationToDelete || !db) return;
        try {
            const result = await deleteMessageAction({
              conversationId: conversationToDelete.id,
              messageId: '',
            });
            toast({ title: "Chat Deleted", description: `The chat "${conversationToDelete.name}" has been permanently deleted.` });
            if (currentChatId === conversationToDelete.id) {
                setCurrentChatId(null);
            }
        } catch (error) {
            console.error("Error deleting chat:", error);
            toast({ title: "Error", description: "Failed to delete the chat.", variant: "destructive" });
        } finally {
            setConversationToDelete(null);
        }
    }

    const handleSelectUser = async (member: TeamMember) => {
        if (!user || !db || !userProfile) return;

        const q = query(
        collection(db, "conversations"),
        where("memberIds", "array-contains", user.uid),
        where("scope", "==", "private"),
        );

        const snapshot = await getDocs(q);
        const existingChat = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Conversation))
        .find(convo => convo.memberIds.length === 2 && convo.memberIds.includes(member.id));

        if (existingChat) {
            loadChat(existingChat);
        } else {
        const newGroupName = `${userProfile.name} & ${member.name}`;
        const memberIds = [user.uid, member.id];
        const avatarSeed = memberIds.sort().join('');
        const initialMessage = `${userProfile.name} started a conversation with ${member.name}.`;

        try {
            const newConvoRef = await addDoc(collection(db, 'conversations'), {
                name: newGroupName,
                avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(avatarSeed)}`,
                communityId: communityId,
                memberIds: memberIds,
                scope: 'private',
                lastMessage: initialMessage,
                lastMessageTimestamp: serverTimestamp(),
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                archivedBy: [],
            });

            await addDoc(collection(newConvoRef, 'messages'), {
                senderId: "system",
                sender: "System",
                avatar: "",
                text: initialMessage,
                timestamp: serverTimestamp(),
            });
            
            loadChat({ id: newConvoRef.id, name: newGroupName, avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(avatarSeed)}`, lastMessage: initialMessage, isArchived: false, lastMessageTimestamp: serverTimestamp(), createdBy: user.uid, scope: 'private', memberIds: memberIds, communityId: communityId});
        } catch (error) {
            console.error("Error creating direct chat:", error);
            toast({ title: "Error", description: "Failed to start a new chat.", variant: "destructive"});
        }
        }
    };
    
    const sortedConversations = React.useMemo(() => {
        const active = conversations.filter(c => !c.isArchived && !c.isPlatformChat);
        const pinned = active.filter(c => pinnedConversations.includes(c.id));
        const unpinned = active.filter(c => !pinnedConversations.includes(c.id));
        return [...pinned, ...unpinned];
    }, [conversations, pinnedConversations]);

    const archivedConversations = conversations.filter(c => c.isArchived && !c.isPlatformChat);
    const selectedConversation = conversations.find(c => c.id === currentChatId);
    
    let lastDisplayedDate: string | null = null;
    
    React.useEffect(() => {
        if (isCameraOpen) {
            const getCameraPermission = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) videoRef.current.srcObject = stream;
                } catch (error) {
                    setHasCameraPermission(false);
                    setIsCameraOpen(false);
                    toast({ variant: "destructive", title: "Camera Access Denied", description: "Please enable camera permissions in your browser settings." });
                }
            };
            getCameraPermission();
        } else if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
    }, [isCameraOpen, toast]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            setImageToSend(canvas.toDataURL('image/jpeg', 0.9));
            setIsCameraOpen(false);
        }
    };
    
    const handleLogout = async () => {
        if (!auth) return;
        await signOut(auth);
        router.push('/');
    };

    const getInitials = (name: string | undefined) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('');
    };


    if (isUserLoading || profileLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    
    return (
        <>
        <div className={cn("bg-slate-100 h-screen flex flex-col overflow-hidden font-sans text-slate-900", chatTheme?.mode, chatTheme?.texture )}>
            <nav className="w-full h-20 bg-indigo-700 flex flex-row items-center justify-between px-6 text-white flex-shrink-0 z-50">
                <div className="flex items-center gap-2">
                    <Link href="/home" passHref>
                        <Button variant="ghost" className="p-3 rounded-xl transition-all hover:bg-indigo-600 active:scale-95" title="Go Home">
                            <Home className="h-6 w-6" />
                        </Button>
                    </Link>
                    <Separator orientation="vertical" className="h-8 bg-indigo-500/50" />
                    <Button variant="ghost" onClick={() => switchPage('main')} className="p-3 rounded-xl transition-all hover:bg-indigo-600 active:scale-95" title="Recent Chats">
                        <MessageSquare className="h-6 w-6" />
                    </Button>
                    <Button variant="ghost" onClick={() => switchPage('archived')} className="p-3 rounded-xl transition-all hover:bg-indigo-600 active:scale-95" title="Archived">
                        <Archive className="h-6 w-6" />
                    </Button>
                    <Button variant="ghost" onClick={() => switchPage('search')} className="p-3 rounded-xl transition-all hover:bg-indigo-600 active:scale-95" title="Community Members">
                        <UserPlus className="h-6 w-6" />
                    </Button>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                            <Avatar className="h-10 w-10 border-2 border-white">
                                <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
                                <AvatarFallback>{userProfile ? getInitials(userProfile.name) : 'U'}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href={`/profile/${user?.uid}`}>
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>My Profile</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </nav>
             <main className="flex-1 flex overflow-hidden relative">
                <aside id="sidebarPanel" ref={sidebarRef} className={cn("w-full md:w-80 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 flex-shrink-0 z-30", currentChatId && "hidden md:flex")}
                    style={{ width: `${sidebarWidth}px` }}
                >
                    <div className="p-4 pb-2">
                        <h1 id="sidebarTitle" className="text-2xl font-bold text-slate-800 mb-4">Conversations</h1>
                        <div className="relative">
                            <Input 
                                type="text" 
                                id="searchBar"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="w-full bg-slate-100 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                            <Search className="absolute left-3.5 top-3.5 text-slate-400 text-sm h-4 w-4" />
                        </div>
                    </div>
                    <ScrollArea id="sidebarList" className="flex-1 custom-scrollbar">
                        {currentPage === 'main' && sortedConversations.map((item) => (
                            <ContextMenu key={item.id}>
                                <ContextMenuTrigger>
                                    <Button
                                        variant="ghost"
                                        className={cn("w-full justify-start p-3 h-auto relative", currentChatId === item.id && "bg-secondary")}
                                        onClick={() => loadChat(item)}
                                    >
                                         {item.hasUnread && <span className="absolute left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-blue-500" />}
                                        <div className="flex items-center gap-3 w-full pl-4">
                                            <Avatar><AvatarImage src={item.avatar} /><AvatarFallback>{item.name.charAt(0)}</AvatarFallback></Avatar>
                                            <div className="flex-1 text-left overflow-hidden min-w-0">
                                                <p className="font-semibold truncate flex items-center gap-2"><Lock className="h-3 w-3"/>{item.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{item.lastMessage}</p>
                                            </div>
                                            <div className="flex items-center shrink-0">
                                                {favoriteConversations.includes(item.id) && <Star className="h-4 w-4 text-yellow-500 mr-1" />}
                                                {pinnedConversations.includes(item.id) && <Pin className="h-4 w-4 text-muted-foreground" />}
                                            </div>
                                        </div>
                                    </Button>
                                </ContextMenuTrigger>
                                 <ContextMenuContent>
                                    <ContextMenuLabel>{item.name}</ContextMenuLabel>
                                    <ContextMenuSeparator />
                                        <ContextMenuItem onSelect={() => togglePin(item.id)}><Pin className="mr-2 h-4 w-4" />{pinnedConversations.includes(item.id) ? "Unpin" : "Pin"}</ContextMenuItem>
                                    <ContextMenuItem onSelect={() => toggleFavorite(item.id)}><Star className="mr-2 h-4 w-4" />{favoriteConversations.includes(item.id) ? "Unfavorite" : "Favorite"}</ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onSelect={() => toggleArchive(item.id)}>
                                        <Archive className="mr-2 h-4 w-4"/> Archive Chat
                                    </ContextMenuItem>
                                     <ContextMenuSeparator />
                                    <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => handleLeaveGroup(item.id)}><LogOut className="mr-2 h-4 w-4"/> Leave Group</ContextMenuItem>
                                        {item.createdBy === user?.uid && (
                                        <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConversationToDelete(item as any)}>
                                            <Trash2 className="mr-2 h-4 w-4"/> Delete Chat
                                        </ContextMenuItem>
                                    )}
                                </ContextMenuContent>
                            </ContextMenu>
                        ))}
                        {currentPage === 'archived' && archivedConversations.map((item) => (
                            <Button key={item.id} variant="ghost" className="w-full justify-start p-3 h-auto relative" onClick={() => toggleArchive(item.id)}>
                                <ArchiveRestore className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <div className="flex items-center gap-3 w-full pl-8">
                                    <Avatar><AvatarImage src={item.avatar} /><AvatarFallback>{item.name.charAt(0)}</AvatarFallback></Avatar>
                                    <div className="flex-1 text-left overflow-hidden min-w-0">
                                        <p className="font-semibold truncate">{item.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{item.lastMessage}</p>
                                    </div>
                                </div>
                            </Button>
                        ))}
                        {currentPage === 'search' && teamMembers.map((member) => (
                            <Button key={member.id} variant="ghost" className="w-full justify-start p-3 h-auto" onClick={() => handleSelectUser(member)}>
                                <div className="flex items-center gap-3 w-full">
                                    <Avatar>
                                        <AvatarImage src={member.avatar} alt={member.name} />
                                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="text-left">
                                        <p className="font-semibold">{member.name}</p>
                                    </div>
                                </div>
                            </Button>
                        ))}
                    </ScrollArea>
                    <CardFooter className="p-2 border-t flex flex-col gap-2">
                        <Dialog open={openNewChatDialog} onOpenChange={setOpenNewChatDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    New Group Chat
                                </Button>
                            </DialogTrigger>
                             <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create a New Group Chat</DialogTitle>
                                    <DialogDescription>
                                        Name your group and select members to invite.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="group-name">Group Name</Label>
                                        <Input id="group-name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., Event Planning Committee" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Invite Members</Label>
                                        <ScrollArea className="h-48 rounded-md border p-4">
                                            <div className="space-y-2">
                                                {teamMembers.filter(m => m.id !== user?.uid).map(member => (
                                                    <div key={member.id} className="flex items-center space-x-3">
                                                        <Checkbox 
                                                            id={`member-${member.id}`} 
                                                            onCheckedChange={(checked) => {
                                                                setSelectedMembers(prev => 
                                                                    checked 
                                                                        ? [...prev, member.id]
                                                                        : prev.filter(mId => mId !== member.id)
                                                                )
                                                            }}
                                                        />
                                                        <Label htmlFor={`member-${member.id}`} className="flex items-center gap-2 font-normal">
                                                            <UserIcon className="h-4 w-4" />
                                                            {member.name}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" onClick={handleCreateChat} disabled={isCreatingChat || !newGroupName.trim() || selectedMembers.length === 0}>
                                        {isCreatingChat && <Loader2 className="animate-spin mr-2" />}
                                        Create Chat
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                         {userProfile?.role === 'president' && (
                            <Button variant="ghost" className="w-full justify-start" onClick={findOrCreatePlatformChat}>
                                <LifeBuoy className="mr-2 h-4 w-4" />
                                Contact Platform Support
                            </Button>
                        )}
                    </CardFooter>
                </aside>
                 <div id="resizer" className="hidden md:block" onMouseDown={handleMouseDown}></div>
                <section id="chatWindow" className={cn("flex-1 flex flex-col absolute inset-0 md:relative z-40 bg-white md:bg-slate-50", currentChatId ? 'flex' : 'hidden md:flex')}>
                    {currentChatId ? (
                        <>
                            <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between flex-shrink-0 relative z-20 shadow-sm">
                                <div className="flex items-center space-y-1 min-w-0">
                                    <Button onClick={() => setCurrentChatId(null)} variant="ghost" className="md:hidden mr-3 p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                                        <ArrowLeft />
                                    </Button>
                                    <Avatar className="w-10 h-10 rounded-full mr-3 flex-shrink-0">
                                        <AvatarImage src={selectedConversation?.avatar} alt="Avatar" />
                                        <AvatarFallback>{selectedConversation?.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <h2 id="currentChatName" className="font-bold text-slate-800 truncate text-base">{selectedConversation?.name}</h2>
                                        <p id="currentChatStatus" className="text-xs text-green-500 flex items-center">
                                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span> Active Now
                                        </p>
                                    </div>
                                </div>
                                 <div id="headerActions" className="flex items-center space-x-2 md:space-x-4 text-slate-500">
                                    <Button variant="ghost" size="icon" className="hidden"><Phone /></Button>
                                    <Button variant="ghost" size="icon" className="hidden"><Video /></Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreVertical /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56" align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem><UserIcon className="mr-2 h-4 w-4" /> View Profile</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => selectedConversation && toggleArchive(selectedConversation.id)}><Archive className="mr-2 h-4 w-4" /> Archive Chat</DropdownMenuItem>
                                             <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <VolumeX className="mr-2 h-4 w-4" />
                                                    Mute Notifications
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    <DropdownMenuItem>Mute for 24 hours</DropdownMenuItem>
                                                    <DropdownMenuItem>Mute for 48 hours</DropdownMenuItem>
                                                    <DropdownMenuItem>Mute for 1 week</DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => handleLeaveGroup(currentChatId)}>
                                                <LogOut className="mr-2 h-4 w-4" /> Leave Group
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConversationToDelete(selectedConversation || null)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Chat
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </header>

                            <ScrollArea id="messageDisplay" className="flex-1 p-4 md:p-6 custom-scrollbar bg-[#f8fafc]">
                                <div className="space-y-4">
                                {messages.map((msg, index) => {
                                    const messageDate = msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "PPP") : null;
                                    const showDateSeparator = messageDate && messageDate !== lastDisplayedDate;
                                    if (showDateSeparator) {
                                        lastDisplayedDate = messageDate;
                                    }
                                    return (
                                        <React.Fragment key={index}>
                                            {showDateSeparator && (
                                                <div className="relative my-4">
                                                    <div className="absolute inset-0 flex items-center">
                                                        <span className="w-full border-t border-muted" />
                                                    </div>
                                                    <div className="relative flex justify-center text-xs uppercase">
                                                        <span className="bg-card px-2 text-muted-foreground">
                                                            {messageDate}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className={cn("flex items-end gap-3", msg.isOwn ? 'justify-end' : 'justify-start')}>
                                                {!msg.isOwn && (
                                                    <Avatar className={cn("h-8 w-8", msg.senderId === "system" && "hidden")}>
                                                        <AvatarImage src={msg.avatar} />
                                                        <AvatarFallback>{msg.sender.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <div className={cn("rounded-2xl p-3 px-4 shadow-md max-w-[80%] text-sm relative", msg.isOwn ? "bg-indigo-600 text-white rounded-br-none" : "bg-white text-slate-700 rounded-bl-none border border-slate-100")}>
                                                    {!msg.isOwn && msg.senderId !== "system" && <p className="text-xs font-bold mb-1">{msg.sender}</p>}
                                                    
                                                    {msg.senderId === 'system' ? (
                                                        <div className="text-center text-xs text-muted-foreground italic w-full">
                                                            {msg.members && msg.members.length > 0 ? (
                                                                <>
                                                                    {msg.members[0].name} created the group.
                                                                </>
                                                            ) : (
                                                                msg.text
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {msg.image && <Image src={msg.image} alt="sent image" width={300} height={200} className="rounded-lg mb-2"/>}
                                                            {msg.text && <p className="text-sm">{msg.text}</p>}
                                                        </>
                                                    )}
        
                                                    {msg.senderId !== "system" && (
                                                        <p className={cn("text-xs mt-1 text-right", msg.isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                                            {formatTimestamp(msg.timestamp)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                                <div ref={bottomOfMessagesRef} />
                                </div>
                            </ScrollArea>
                            <footer id="chatFooter" className="bg-white border-t border-slate-200 flex-shrink-0 relative flex flex-col">
                                {imageToSend && (
                                  <div className="p-2 relative w-24 h-24 m-2 border rounded-md">
                                    <Image src={imageToSend} alt="preview" layout="fill" objectFit="cover" className="rounded-md"/>
                                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setImageToSend(null)}><X className="h-4 w-4"/></Button>
                                  </div>
                                )}
                                <form onSubmit={handleSendMessage} className="flex-1 flex items-end bg-slate-100 rounded-2xl p-1 shadow-inner relative m-4">
                                     <Popover>
                                         <PopoverTrigger asChild>
                                             <Button variant="ghost" className="p-3 text-indigo-600 hover:bg-white rounded-xl transition-all mb-0.5"><PlusCircle className="text-2xl h-6 w-6"/></Button>
                                         </PopoverTrigger>
                                         <PopoverContent className="w-auto p-2" side="top" align="start">
                                              <div className="grid gap-2">
                                                  <Button variant="ghost" className="w-full justify-start" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4"/> Upload Photo</Button>
                                                  <Button variant="ghost" className="w-full justify-start" onClick={() => setIsCameraOpen(true)}><Camera className="mr-2 h-4 w-4"/> Use Camera</Button>
                                             </div>
                                         </PopoverContent>
                                     </Popover>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" className="p-3 text-indigo-600 hover:bg-white rounded-xl transition-all mb-0.5"><Smile className="text-2xl h-6 w-6"/></Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 border-0" side="top" align="start">
                                            <EmojiPicker 
                                                onEmojiClick={(emojiObject) => setNewMessage(prev => prev + emojiObject.emoji)}
                                                theme={chatTheme.mode === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <Textarea 
                                        ref={textAreaRef}
                                        rows={1} 
                                        onKeyDown={handleEnter} 
                                        placeholder="Write your message..." 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="flex-1 bg-transparent border-none focus:ring-0 py-3 px-3 resize-none h-full text-sm md:text-base custom-scrollbar"
                                    />
                                    <Button id="sendBtn" type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-md m-1 transition-all active:scale-90">
                                        <Send className="text-sm md:text-base h-5 w-5"/>
                                    </Button>
                                </form>
                            </footer>
                        </>
                    ) : (
                        <div id="emptyState" className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-4">
                            <div className="bg-indigo-50 p-8 rounded-full mb-6">
                                <MessageSquare className="h-16 w-16 text-indigo-200" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Your Community Hub</h3>
                            <p className="max-w-xs mx-auto text-sm">Select a conversation or find a new member to start chatting.</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Take a Picture</DialogTitle></DialogHeader>
              <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
              {hasCameraPermission === false && <Alert variant="destructive"><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera access in your browser.</AlertDescription></Alert>}
              <div className="flex gap-2"><Button onClick={handleCapture} disabled={hasCameraPermission !== true}><Camera className="mr-2" /> Capture</Button><Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button></div>
          </DialogContent>
        </Dialog>
        <canvas ref={canvasRef} className="hidden" />
        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

        <Dialog open={!!conversationToDelete} onOpenChange={() => setConversationToDelete(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Chat</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to permanently delete the chat "{conversationToDelete?.name}"? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setConversationToDelete(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDeleteChat}>Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}

export default function ChatPage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ChatPageContent />
        </React.Suspense>
    );
}
