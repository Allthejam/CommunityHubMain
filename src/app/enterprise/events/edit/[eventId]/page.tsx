
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ArrowLeft, Loader2, Save, Upload, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { updateEventAction } from "@/lib/actions/eventActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const eventFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  category: z.string().min(1, "Please select a category."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  startDate: z.date({ required_error: "A start date is required." }),
  endDate: z.date().optional(),
  startTime: z.string().optional(),
  image: z.string().optional().nullable(),
});

const eventCategories = ["Music", "Food & Drink", "Arts & Culture", "Charity", "Sports", "Family", "Workshop", "Other"];

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [image, setImage] = React.useState<string | null>(null);
  const [showOtherCategory, setShowOtherCategory] = React.useState(false);
  const [customCategory, setCustomCategory] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  const eventRef = useMemoFirebase(() => (db && eventId ? doc(db, 'events', eventId) : null), [db, eventId]);
  const { data: eventData, isLoading: eventLoading } = useDoc(eventRef);

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
  });

  React.useEffect(() => {
    if (eventData) {
      const isCustomCategory = !eventCategories.includes(eventData.category);

      form.reset({
        title: eventData.title,
        category: isCustomCategory ? 'Other' : eventData.category,
        description: eventData.description,
        startDate: eventData.startDate?.toDate(),
        endDate: eventData.endDate?.toDate(),
        startTime: eventData.startTime || '',
        image: eventData.image,
      });

      setImage(eventData.image);

      if (isCustomCategory) {
        setShowOtherCategory(true);
        setCustomCategory(eventData.category);
      }
    }
  }, [eventData, form]);

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
    const finalCategory = values.category === 'Other' ? customCategory : values.category;
    if (!finalCategory) {
        toast({ title: "Missing Category", description: "Please select or enter a category.", variant: "destructive" });
        return;
    }

    const result = await updateEventAction(eventId, { ...values, image, category: finalCategory });

    if (result.success) {
      toast({ title: "Event Updated", description: "Your event has been successfully updated." });
      router.push('/enterprise/events');
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  }

  if (eventLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!eventData) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Event not found</h2>
        <p className="text-muted-foreground">The event you are trying to edit does not exist.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/enterprise/events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/enterprise/events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Events
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Edit Event
        </h1>
        <p className="text-muted-foreground">
          Update the details for your event.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>Make your changes below and click save.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <FormLabel>End Date (Optional)</FormLabel>
                       <DatePicker date={field.value} setDate={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
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
