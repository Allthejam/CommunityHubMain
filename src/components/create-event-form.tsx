
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Loader2, Upload, Camera, X, Save, Search, History, Sparkles } from "lucide-react";
import { addWeeks, addMonths, addYears, format } from 'date-fns';
import { parseEventDate, getAdvancedRepeatingEvent } from '@/lib/utils/event-utils';



import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "./ui/date-picker";
import { RichTextEditor } from "./rich-text-editor";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { createEventAction, updateEventAction } from "@/lib/actions/eventActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Separator } from "./ui/separator";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";



const eventFormSchema = z.object({
  businessId: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters."),
  category: z.string().min(1, "Please select a category."),
  description: z.string().min(10, "Description is too short."),
  startDate: z.date({ required_error: "A start date is required." }),
  endDate: z.date().optional(),
  repeatUntil: z.date().optional(),
  startTime: z.string().optional(),
  image: z.string().optional().nullable(),
  metaTitle: z.string().max(70, "Meta title should be 70 characters or less.").optional(),
  metaDescription: z.string().max(160, "Meta description should be 160 characters or less.").optional(),
  repeat: z.string().optional(),
});


type Business = { id: string; businessName: string };

const eventCategories = ["Music", "Food & Drink", "Arts & Culture", "Charity", "Sports", "Family", "Workshop", "Other"];

export function CreateEventForm({ event, onSaveSuccess }: { event?: any, onSaveSuccess?: () => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [image, setImage] = React.useState<string | null>(event?.image || null);
  const [showOtherCategory, setShowOtherCategory] = React.useState(false);
  const [customCategory, setCustomCategory] = React.useState('');
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  const userProfileRef = useMemoFirebase(() => (db && user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const { hasAdvanced, updatedEvent } = React.useMemo(() => {
    if (!event) return { hasAdvanced: false, updatedEvent: null };
    return getAdvancedRepeatingEvent(event);
  }, [event]);

  const activeEvent = updatedEvent || event;

  React.useEffect(() => {
    if (hasAdvanced && activeEvent && event?.id) {
      updateEventAction(event.id, {
        startDate: activeEvent.startDate,
        endDate: activeEvent.endDate,
        pastOccurrences: activeEvent.pastOccurrences,
      });
    }
  }, [hasAdvanced, activeEvent, event?.id]);

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: activeEvent ? {
      ...activeEvent,
      startDate: parseEventDate(activeEvent.startDate) || undefined,
      endDate: parseEventDate(activeEvent.endDate) || undefined,
      repeatUntil: parseEventDate(activeEvent.repeatUntil) || undefined,
      startTime: activeEvent.startTime || '',
      repeat: activeEvent.repeat || 'none',
    } : {
      title: "",
      category: "",
      description: "",
      startTime: "",
      image: null,
      metaTitle: '',
      metaDescription: '',
      repeat: 'none',
    },
  });
  
  const metaTitle = form.watch('metaTitle');
  const eventTitle = form.watch('title');
  const metaDescription = form.watch('metaDescription');
  const startDate = form.watch('startDate');
  const repeat = form.watch('repeat');

  const communityId = userProfile?.communityId;
  const communityRoleData = communityId ? userProfile?.communityRoles?.[communityId] : null;

  const activeRole = communityRoleData?.role || userProfile?.role;
  const isLeader = ['president', 'leader', 'administrator'].includes(activeRole);

  const ownedBusinessesQuery = useMemoFirebase(() => (user ? query(collection(db, "businesses"), where("ownerId", "==", user.uid)) : null), [user, db]);
  const teamBusinessesQuery = useMemoFirebase(() => (user ? query(collection(db, "businesses"), where("teamMemberIds", "array-contains", user.uid)) : null), [user, db]);

  const { data: ownedBusinesses, isLoading: loadingOwned } = useCollection<Business>(ownedBusinessesQuery);
  const { data: teamBusinesses, isLoading: loadingTeam } = useCollection<Business>(teamBusinessesQuery);
  
  const businesses = React.useMemo(() => {
    const all = new Map<string, Business>();
    (ownedBusinesses || []).forEach(b => all.set(b.id, b));
    (teamBusinesses || []).forEach(b => all.set(b.id, b));
    return Array.from(all.values());
  }, [ownedBusinesses, teamBusinesses]);

  const businessesLoading = loadingOwned || loadingTeam;
  const showBusinessSelector = businesses && businesses.length > 0;
  
  React.useEffect(() => {
    if (activeEvent) {
        const parsedStart = parseEventDate(activeEvent.startDate);
        const parsedEnd = parseEventDate(activeEvent.endDate);
        if (parsedStart) form.setValue('startDate', parsedStart);
        if (parsedEnd) form.setValue('endDate', parsedEnd);
        
        const isCustomCategory = !eventCategories.includes(activeEvent.category);
        if (isCustomCategory) {
            setShowOtherCategory(true);
            setCustomCategory(activeEvent.category);
            form.setValue('category', 'Other');
        } else {
            form.setValue('category', activeEvent.category);
        }
        setImage(activeEvent.image);
        form.setValue('repeat', activeEvent.repeat || 'none');
        if (activeEvent.repeatUntil) {
          form.setValue('repeatUntil', parseEventDate(activeEvent.repeatUntil) || undefined);
        }
    }
  }, [activeEvent, form]);


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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setImage(dataUrl);
          form.setValue('image', dataUrl);
          setIsCameraOpen(false);
      }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              setImage(result);
              form.setValue('image', result);
          };
          reader.readAsDataURL(file);
      }
  };
  
  const handleCategoryChange = (value: string) => {
    form.setValue('category', value);
    if (value === 'Other') {
        setShowOtherCategory(true);
    } else {
        setShowOtherCategory(false);
        setCustomCategory('');
    }
  };

  async function onSubmit(values: z.infer<typeof eventFormSchema>) {
    if (!user || !userProfile?.communityId) {
        toast({ title: "Error", description: "You must be logged in and part of a community.", variant: "destructive" });
        return;
    }

    const finalCategory = values.category === 'Other' ? customCategory : values.category;
    if (!finalCategory) {
        toast({ title: "Missing Category", description: "Please select or enter a category.", variant: "destructive" });
        return;
    }
    
    form.clearErrors();

    const isCommunityEvent = values.businessId === 'community_event';
    const selectedBusiness = !isCommunityEvent && values.businessId ? businesses?.find(b => b.id === values.businessId) : null;

    const finalEndDate = values.endDate && values.endDate >= values.startDate ? values.endDate : values.startDate;

    const eventDataForAction = { 
        ...values,
        businessId: isCommunityEvent ? undefined : values.businessId,
        businessName: selectedBusiness ? selectedBusiness.businessName : (isLeader ? 'Community' : userProfile.name),
        image, 
        category: finalCategory,
        endDate: finalEndDate,
        repeatUntil: values.repeatUntil || undefined,
    };
    
    const result = event?.id 
      ? await updateEventAction(event.id, eventDataForAction)
      : await createEventAction({
          ...eventDataForAction,
          communityId: userProfile.communityId,
          ownerId: user.uid,
      });


    if (result.success) {
      toast({ title: `Event ${event ? 'Updated' : 'Created'}`, description: `Your event has been successfully ${event ? 'updated' : 'submitted'}.` });
      form.reset();
      setImage(null);
      if(onSaveSuccess) onSaveSuccess();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
              {showBusinessSelector && (
              <FormField
                control={form.control}
                name="businessId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associated Business / Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={businessesLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLeader && <SelectItem value="community_event">Community Event (Hosted by Leader)</SelectItem>}
                        {businesses?.map((biz) => (
                          <SelectItem key={biz.id} value={biz.id}>
                            {biz.businessName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Choose a business to associate this event with, or select "Community Event" if you're a leader.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              )}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={handleCategoryChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showOtherCategory && (
                        <Input
                            className="mt-2"
                            placeholder="Please specify other category"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                        />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <RichTextEditor value={field.value || ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                       <DatePicker date={field.value} setDate={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date (Event Duration)</FormLabel>
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                      />
                      <FormDescription className="text-xs">
                        Date this event occurrence ends (e.g. same day for a 1-day event).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="repeat"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Repeat Pattern</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          const currentStart = form.getValues('startDate');
                          if (currentStart && value !== 'none') {
                            let predictedNext: Date | undefined;
                            if (value === 'weekly') predictedNext = addWeeks(currentStart, 1);
                            else if (value === 'bi-weekly') predictedNext = addWeeks(currentStart, 2);
                            else if (value === 'monthly') predictedNext = addMonths(currentStart, 1);
                            else if (value === 'yearly') predictedNext = addYears(currentStart, 1);
                            
                            if (predictedNext) {
                              toast({
                                title: "Recurrence Pattern Selected",
                                description: `Next predicted date: ${format(predictedNext, "dd/MM/yyyy")}. You can freely edit or change any dates below.`
                              });
                            }
                          }
                        }}
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Does not repeat" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Does not repeat</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Every 2 Weeks</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Select if this event recurs. All date fields remain 100% editable.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {repeat && repeat !== 'none' && (
                <FormField
                  control={form.control}
                  name="repeatUntil"
                  render={({ field }) => (
                    <FormItem className="flex flex-col max-w-sm">
                      <FormLabel>Repeat Until (Optional)</FormLabel>
                      <DatePicker date={field.value} setDate={field.onChange} />
                      <FormDescription className="text-xs">
                        Date after which this event stops repeating (leave blank for indefinite).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Leader Audit Trail: Past Occurrences History */}
              {activeEvent && Array.isArray(activeEvent.pastOccurrences) && activeEvent.pastOccurrences.length > 0 && (
                <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                      <History className="h-4 w-4" /> Past Event Occurrences & Audit Trail (Leader View Only)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Past event dates are stored for your administrative audit record and hidden from the public. Only current and future dates are published to user calendars.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="divide-y divide-border/60">
                      {activeEvent.pastOccurrences.map((occ: any, index: number) => {
                        const occStart = parseEventDate(occ.startDate);
                        const occEnd = parseEventDate(occ.endDate);

                        return (
                          <div key={index} className="py-2 flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-foreground">Occurrence #{index + 1}:</span> {occStart ? format(occStart, "PPP") : 'N/A'} {occEnd && occStart && format(occStart, "yyyy-MM-dd") !== format(occEnd, "yyyy-MM-dd") ? ` to ${format(occEnd, "PPP")}` : ''}
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-background">Passed & Archived</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}


              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time (Optional)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="space-y-2">
                <FormLabel>Event Image</FormLabel>
                {image ? (
                    <div className="relative w-48 h-32">
                        <Image src={image} alt="Event image preview" fill style={{ objectFit: "cover" }} className="rounded-md border" />
                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full" onClick={() => setImage(null)}><X className="h-4 w-4" /></Button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="mr-2 h-4 w-4" /> Upload Image
                      </Button>
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                      <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)}><Camera className="mr-2 h-4 w-4" /> Take Picture</Button>
                    </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

               <Separator />

              <Card className="border-border/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Search engine optimization</CardTitle>
                    <CardDescription>
                      Improve your ranking and how your event page will appear in search engines results.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg bg-muted/50">
                        <p className="text-blue-800 dark:text-blue-400 text-lg font-medium group-hover:underline truncate">{metaTitle || eventTitle || 'Event Page Title'}</p>
                        <p className="text-green-700 dark:text-green-400 text-sm">https://my-community-hub.co.uk/events/{eventTitle?.toLowerCase().replace(/\s+/g, '-') || 'your-event'}</p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{metaDescription || 'Your compelling meta description will appear here, helping you attract more attendees from search results.'}</p>
                    </div>

                    <FormField
                        control={form.control}
                        name="metaTitle"
                        render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between items-center">
                                <FormLabel>Meta title</FormLabel>
                                <span className="text-xs text-muted-foreground">{field.value?.length || 0} / 70</span>
                            </div>
                            <FormControl>
                            <Input placeholder="Public title for the event page..." {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="metaDescription"
                        render={({ field }) => (
                        <FormItem>
                             <div className="flex justify-between items-center">
                                <FormLabel>Meta description</FormLabel>
                                <span className="text-xs text-muted-foreground">{field.value?.length || 0} / 160</span>
                            </div>
                            <FormControl>
                                <Textarea className="min-h-[80px]" placeholder="This description will appear in search engines..." {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </CardContent>
                </Card>

            </div>
          <div className="flex justify-end pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {event ? <><Save className="mr-2 h-4 w-4" /> Save Changes</> : (isLeader ? "Create Community Event" : "Submit for Approval")}
              </Button>
          </div>
        </form>
      </Form>
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Take a Picture</DialogTitle></DialogHeader>
          <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
          {hasCameraPermission === false && <Alert variant="destructive"><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera access in your browser.</AlertDescription></Alert>}
          <div className="flex gap-2"><Button onClick={handleCapture} disabled={hasCameraPermission !== true}><Camera className="mr-2" /> Capture</Button><Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
