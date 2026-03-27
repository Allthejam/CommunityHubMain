
'use client';

import Image from 'next/image'
import * as React from 'react';
import {
  MessageCircle,
  MoreVertical,
  Share2,
  ThumbsUp,
  Clock,
  User,
  AlertTriangle,
  MessageSquare,
  FileEdit,
  Trash2,
  Loader2,
  Video,
  X,
  Play,
} from 'lucide-react'
import { useUser } from '@/firebase';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from './ui/dropdown-menu'
import { Separator } from './ui/separator';
import { likePostAction, updatePostAction, deletePostAction } from '@/lib/actions/postActions';
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CommentSheet } from './comment-sheet';
import Link from 'next/link';
import { RichTextEditor } from './rich-text-editor';
import { Input } from './ui/input';
import { AspectRatio } from './ui/aspect-ratio';


export type Post = {
  id: string | number;
  author: string;
  authorId: string;
  authorAvatar?: string; // Expect a direct string URL
  timestamp: string;
  content: string;
  image?: string | null; // Expect a direct string URL or null
  videoUrl?: string | null;
  likes: number;
  comments: number;
  status?: 'active' | 'new' | 'resolved';
  likedBy?: string[];
  communityId: string;
  commentCount?: number;
};

type PostCardProps = {
  post: Post
  className?: string
}

const parseVideoUrl = (url: string | null | undefined): { type: 'youtube' | 'vimeo' | 'direct'; id: string; isShort: boolean; thumb?: string; url?: string; } | null => {
  if (!url) return null;

  // YouTube Shorts
  const shortsRegex = /youtube\.com\/shorts\/([^"&?\/\s]{11})/;
  const shortsMatch = url.match(shortsRegex);
  if (shortsMatch?.[1]) {
    return { type: 'youtube', id: shortsMatch[1], isShort: true, thumb: `https://i.ytimg.com/vi/${shortsMatch[1]}/hqdefault.jpg` };
  }

  // Standard YouTube
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const ytMatch = url.match(ytRegex);
  if (ytMatch?.[1]) {
    return { type: 'youtube', id: ytMatch[1], isShort: false, thumb: `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg` };
  }

  // Vimeo
  const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch?.[1]) {
    // Note: Vimeo thumbnail fetching requires an API call, so we'll use a placeholder or omit it.
    return { type: 'vimeo', id: vimeoMatch[1], isShort: false, thumb: `https://vumbnail.com/${vimeoMatch[1]}.jpg` };
  }

  // Direct File
  if (url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')) {
    return { type: 'direct', url: url, isShort: false, id: url };
  }
  
  return null;
}


export default function PostCard({ post, className }: PostCardProps) {
  const isPending = post.status === 'new';
  const { user } = useUser();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState(post.content);
  const [editedVideoUrl, setEditedVideoUrl] = React.useState(post.videoUrl || '');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  const isLongPost = post.content.length > 350;
  const displayContent = isLongPost && !isExpanded 
    ? `${post.content.substring(0, 350)}...` 
    : post.content;

  const handleLike = async () => {
    if (!user) {
        toast({
            title: "Authentication Required",
            description: "You must be logged in to like a post.",
            variant: "destructive"
        });
        return;
    }
    try {
        await likePostAction({ postId: String(post.id), userId: user.uid, communityId: post.communityId });
    } catch (error) {
        toast({
            title: "Error",
            description: "Could not update like status.",
            variant: "destructive"
        });
    }
  }

  const hasLiked = user && post.likedBy?.includes(user.uid);
  const isAuthor = user && user.uid === post.authorId;
  
  const handleEdit = () => {
    setEditedContent(post.content);
    setEditedVideoUrl(post.videoUrl || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(post.content);
    setEditedVideoUrl(post.videoUrl || '');
  };
  
  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      toast({ title: 'Error', description: "Content cannot be empty.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const result = await updatePostAction({ postId: String(post.id), communityId: post.communityId, content: editedContent, videoUrl: editedVideoUrl });
      if (result.success) {
        toast({ title: 'Post Updated' });
        setIsEditing(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
        const result = await deletePostAction({ postId: String(post.id), communityId: post.communityId, userId: user.uid });
        if (result.success) {
            toast({ title: 'Post Deleted' });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsDeleting(false);
    }
  };


  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const shareData = {
      title: `Post by ${post.author}`,
      text: post.content,
      url: postUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error: any) {
        if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
          console.error("Error sharing:", error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link Copied!",
          description: "A link to this post has been copied to your clipboard.",
        });
      } catch (error) {
        console.error("Error copying to clipboard:", error);
        toast({
          title: "Error",
          description: "Could not copy link to clipboard.",
          variant: "destructive",
        });
      }
    }
  };
  
  const videoInfo = React.useMemo(() => parseVideoUrl(isEditing ? editedVideoUrl : post.videoUrl), [isEditing, editedVideoUrl, post.videoUrl]);


  return (
    <Card className={cn('overflow-hidden', className, isPending && 'border-dashed border-amber-500')}>
       {isPending && (
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>Pending Leader Approval</span>
        </div>
      )}
      <CardHeader className="flex flex-row items-center gap-4 p-4">
        <Avatar className="h-10 w-10 border">
          <AvatarImage
            src={post.authorAvatar}
            alt={post.author}
          />
          <AvatarFallback>
            {post.author
              ?.split(' ')
              .map((n) => n[0])
              .join('') || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{post.author}</p>
          <p className="text-sm text-muted-foreground">{post.timestamp}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/chat?contact=${post.authorId}&itemId=${post.id}`}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Contact Author
              </Link>
            </DropdownMenuItem>
             <DropdownMenuItem asChild>
              <Link href={`/report-issue?postId=${post.id}`}>
                <span className="text-destructive flex items-center w-full">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Report Post
                </span>
              </Link>
            </DropdownMenuItem>
            {isAuthor && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleEdit}>
                  <FileEdit className="mr-2 h-4 w-4" />
                  Edit Post
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Post
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your post.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="px-4 pb-2 space-y-4">
        {isEditing ? (
          <div className="space-y-2">
            <RichTextEditor
              value={editedContent}
              onChange={setEditedContent}
            />
            <div className="relative mt-2">
                <Input
                    placeholder="Paste a YouTube video URL..."
                    value={editedVideoUrl}
                    onChange={(e) => setEditedVideoUrl(e.target.value)}
                    className="pl-8"
                />
                <Video className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
                className="prose dark:prose-invert max-w-none text-foreground/90"
                dangerouslySetInnerHTML={{ __html: displayContent }}
            />
            {isLongPost && (
              <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? 'Show less' : 'Read more'}
              </Button>
            )}
          </>
        )}
        
        {!isEditing && (
            videoInfo ? (
              <Dialog>
                <DialogTrigger asChild>
                  <div className="block relative aspect-video w-full my-2 rounded-lg overflow-hidden cursor-pointer group">
                    <Image
                      src={videoInfo.thumb || 'https://picsum.photos/seed/video/800/450'}
                      alt="Video thumbnail"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity opacity-70 group-hover:opacity-100">
                        <Play className="h-12 w-12 text-white/80 transition-transform group-hover:scale-110" />
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className={cn(
                    "p-0 bg-black border-0 w-[95vw] max-h-[90vh] flex flex-col sm:p-4",
                    videoInfo.isShort
                        ? "max-w-sm sm:max-w-md"
                        : "sm:max-w-3xl md:max-w-5xl lg:max-w-7xl"
                )}>
                    <DialogHeader className="p-4 text-white">
                      <DialogTitle>{post.title}</DialogTitle>
                      <DialogDescription className="text-gray-400">Post by {post.author}</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 min-h-0">
                      <AspectRatio ratio={videoInfo.isShort ? 9 / 16 : 16 / 9} className="h-full max-h-[calc(80vh-100px)]">
                          {videoInfo.type === 'youtube' && (
                              <iframe
                                  src={`https://www.youtube.com/embed/${videoInfo.id}?autoplay=1&rel=0`}
                                  allow="autoplay; fullscreen; picture-in-picture"
                                  allowFullScreen
                                  className="w-full h-full rounded-md"
                              />
                          )}
                          {videoInfo.type === 'vimeo' && (
                              <iframe
                                  src={`https://player.vimeo.com/video/${videoInfo.id}?autoplay=1`}
                                  allow="autoplay; fullscreen; picture-in-picture"
                                  allowFullScreen
                                  className="w-full h-full rounded-md"
                              />
                          )}
                          {videoInfo.type === 'direct' && (
                              <video controls autoPlay className="w-full h-full rounded-md">
                                  <source src={videoInfo.url} type="video/mp4" />
                                  Your browser does not support the video tag.
                              </video>
                          )}
                      </AspectRatio>
                    </div>
                </DialogContent>
              </Dialog>
            ) : post.image ? (
                <div className="relative aspect-video w-full my-2 rounded-lg overflow-hidden">
                    <Image
                        src={post.image}
                        alt="Post image"
                        fill
                        className="object-contain bg-white"
                    />
                </div>
            ) : null
        )}

      </CardContent>
      <Separator />
      <CardFooter className="flex justify-between p-2">
        <Button variant="ghost" className="flex-1" onClick={handleLike}>
          <ThumbsUp className={cn("mr-2 h-4 w-4", hasLiked && "fill-current text-primary")} />
          {post.likes} Likes
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="flex-1">
              <MessageCircle className="mr-2 h-4 w-4" />
              {post.commentCount || 0} Comments
            </Button>
          </DialogTrigger>
          <DialogContent className="p-0 max-h-[80vh] flex flex-col">
            <DialogHeader className="p-6 pb-2">
                <DialogTitle>Comments on {post.author}'s post</DialogTitle>
            </DialogHeader>
            <CommentSheet postId={String(post.id)} communityId={post.communityId} />
          </DialogContent>
        </Dialog>
        <Button variant="ghost" className="flex-1" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

    