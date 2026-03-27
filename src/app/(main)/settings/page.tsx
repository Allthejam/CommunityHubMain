
"use client";

import { useState, useEffect } from "react";
import { Settings, Bell, Shield, Palette, Sparkles, Save, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { saveAllUserSettingsAction } from "@/lib/actions/userSettingsActions";
import { saveSubscriptionAction, deleteSubscriptionAction } from "@/lib/actions/pushActions";
import { Input } from "@/components/ui/input";
import { doc } from 'firebase/firestore';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { addDays, format, isBefore } from "date-fns";
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

const adCategories = [
    "Sports & Fitness", "Technology & Gaming", "Food & Drink", "Travel & Outdoors",
    "Arts & Culture", "Music & Concerts", "Film & Television", "Reading & Literature",
    "Health & Wellness", "Fashion & Beauty", "Home & Garden", "Business & Finance",
    "Science & Nature", "Education & Learning", "Photography & Video", "DIY & Crafts",
    "Pets & Animals", "Cars & Vehicles", "Family & Parenting", "History & Heritage",
    "Shopping & Retail", "Real Estate", "Environment & Sustainability", "Charity & Volunteering"
];

const MIN_CATEGORIES = 6;

// Helper to convert hex to HSL string
const hexToHslString = (hex: string): string => {
    if (!hex) return "";
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Helper to convert HSL string to hex
const hslStringToHex = (hslStr: string): string => {
    if (!hslStr) return "#ffffff";
    const [h, s, l] = hslStr.split(" ").map(val => parseFloat(val.replace('%', '')));
    const sNorm = s / 100;
    const lNorm = l / 100;
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = lNorm - c / 2;
    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) { [r, g, b] = [c, x, 0]; }
    else if (h >= 60 && h < 120) { [r, g, b] = [x, c, 0]; }
    else if (h >= 120 && h < 180) { [r, g, b] = [0, c, x]; }
    else if (h >= 180 && h < 240) { [r, g, b] = [0, x, c]; }
    else if (h >= 240 && h < 300) { [r, g, b] = [x, 0, c]; }
    else if (h >= 300 && h < 360) { [r, g, b] = [c, 0, x]; }
    
    const toHex = (c: number) => Math.round((c + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
  
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function SettingsPage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSnoozeDialogOpen, setIsSnoozeDialogOpen] = useState(false);
  
  const [isPushSubscribing, setIsPushSubscribing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBlocked, setPushBlocked] = useState(false);

  const [settings, setSettings] = useState({
    standardNotifications: true,
    emergencyNotifications: true,
    emergencyNotificationsSnoozedUntil: null as Date | null,
    publicProfile: true,
    adPersonalization: false,
    selectedCategories: [] as string[],
    darkMode: false,
    theme: {
        background: "",
        card: "",
        primary: "",
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'denied') {
        setPushBlocked(true);
        setPushEnabled(false);
      } else if (Notification.permission === 'granted') {
          // Check if there's an active service worker subscription
          navigator.serviceWorker.ready.then(reg => {
              reg.pushManager.getSubscription().then(sub => {
                  if (sub) {
                      setPushEnabled(true);
                  } else {
                      setPushEnabled(false);
                  }
              })
          });
      }
    }
  }, []);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !userProfile) {
        setIsLoading(false);
        return;
    };
    
    const dbSettings = (userProfile as any)?.settings || {};
    const mailingLists = (userProfile as any)?.mailingLists || {};
    
    let emergencyNotifications = mailingLists.emergency !== false;
    let snoozedUntil = dbSettings.emergencyNotificationsSnoozedUntil?.toDate ? dbSettings.emergencyNotificationsSnoozedUntil.toDate() : null;

    if (snoozedUntil && isBefore(new Date(), snoozedUntil)) {
        emergencyNotifications = false;
    } else if (snoozedUntil) {
        snoozedUntil = null;
        emergencyNotifications = true;
    }

    setSettings(prev => ({ 
        ...prev, 
        ...dbSettings,
        standardNotifications: mailingLists.standard !== false,
        emergencyNotifications,
        emergencyNotificationsSnoozedUntil: snoozedUntil,
        theme: {
            ...prev.theme,
            ...(dbSettings.theme || {})
        }
    }));

    setIsLoading(false);
  }, [user, userProfile, authLoading, profileLoading]);
  
  const applyTheme = (theme: typeof settings.theme) => {
    const root = document.documentElement;
    root.style.setProperty('--background', theme.background || null);
    root.style.setProperty('--card', theme.card || null);
    root.style.setProperty('--primary', theme.primary || null);
  };
  
  useEffect(() => {
      if (settings.theme) {
          applyTheme(settings.theme);
      }
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

  const handlePushSubscriptionChange = async (checked: boolean) => {
    if (!user) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      toast({ title: 'Unsupported Browser', description: 'Push notifications are not supported on this browser.', variant: 'destructive' });
      return;
    }
  
    if (checked) {
      // --- Subscribe Flow ---
      setIsPushSubscribing(true);
      try {
        if (Notification.permission === 'denied') {
          toast({ title: 'Notifications Blocked', description: 'Please enable notifications for this site in your browser or device settings.', variant: 'destructive', duration: 10000 });
          setPushBlocked(true);
          setIsPushSubscribing(false);
          return;
        }
  
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
  
        if (!subscription) {
          if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
              setPushBlocked(permission === 'denied');
              throw new Error('Permission was not granted.');
            }
          }
  
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
          });
        }
  
        await saveSubscriptionAction({ userId: user.uid, subscription: subscription.toJSON() });
        setPushEnabled(true);
        setPushBlocked(false);
        toast({ title: 'Notifications Enabled!' });
      } catch (error: any) {
        console.error('Error subscribing to push notifications:', error);
        toast({
          title: 'Subscription Failed',
          description: error.message === 'Permission was not granted.' ? 'You need to grant permission to receive notifications.' : 'Could not enable notifications. Please try again.',
          variant: 'destructive',
        });
        setPushEnabled(false);
      } finally {
        setIsPushSubscribing(false);
      }
    } else {
      // --- Unsubscribe Flow ---
      setIsPushSubscribing(true);
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await deleteSubscriptionAction({ userId: user.uid, endpoint: subscription.endpoint });
        }
        setPushEnabled(false);
        toast({ title: 'Notifications Disabled' });
      } catch (error: any) {
        console.error('Error unsubscribing:', error);
        toast({ title: 'Error', description: 'Could not disable notifications.', variant: 'destructive' });
      } finally {
        setIsPushSubscribing(false);
      }
    }
  };
  
  const handleCategoryChange = (category: string) => {
    setSettings(prev => ({
        ...prev,
        selectedCategories: prev.selectedCategories.includes(category)
            ? prev.selectedCategories.filter(c => c !== category)
            : [...prev.selectedCategories, category]
    }));
  };
  
  const handleThemeColorChange = (property: 'background' | 'card' | 'primary', hexColor: string) => {
    const hslString = hexToHslString(hexColor);
    setSettings(prev => ({
        ...prev,
        theme: {
            ...prev.theme,
            [property]: hslString
        }
    }));
  };

  const handleSaveSettings = async (section: string, dataToSave: Partial<any>) => {
      if (!user) return;
      setIsSaving(true);
      
      const result = await saveAllUserSettingsAction(user.uid, dataToSave);

      if (result.success) {
          toast({
              title: "Settings Saved",
              description: `Your ${section} preferences have been updated.`,
          });
      } else {
           toast({
              title: "Error",
              description: result.error,
              variant: "destructive",
          });
      }
      setIsSaving(false);
  };
  
  const handleRestoreDefaultTheme = async () => {
    const defaultTheme = { background: "", card: "", primary: "" };
    setSettings(prev => ({ ...prev, theme: defaultTheme }));
    await handleSaveSettings('theme', { 'settings.theme': defaultTheme });
  }

  const handleSnoozeEmergency = () => {
    const snoozeUntil = addDays(new Date(), 7);
    setSettings(s => ({ ...s, emergencyNotifications: false, emergencyNotificationsSnoozedUntil: snoozeUntil }));
  };

  const handleUnSnoozeEmergency = () => {
    setSettings(s => ({ ...s, emergencyNotifications: true, emergencyNotificationsSnoozedUntil: null }));
  };

  const isAdSaveDisabled = settings.adPersonalization && settings.selectedCategories.length < MIN_CATEGORIES;
  const isCustomTheme = !!(settings.theme?.background || settings.theme?.card || settings.theme?.primary);

  if (isLoading || authLoading || profileLoading) {
      return (
        <div className="flex justify-center items-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Settings className="h-8 w-8" />
          My Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and notification preferences.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Privacy</CardTitle>
              <CardDescription>Control your privacy settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                      <Label htmlFor="show-profile" className="font-medium">Public Profile</Label>
                      <p className="text-sm text-muted-foreground">Allow others to see your profile.</p>
                  </div>
                  <Switch
                    id="show-profile"
                    checked={settings.publicProfile}
                    onCheckedChange={(checked) => setSettings(s => ({...s, publicProfile: checked}))}
                  />
              </div>
          </CardContent>
          <CardFooter>
              <Button onClick={() => handleSaveSettings('privacy', { 'settings.publicProfile': settings.publicProfile })} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                  Save Privacy Settings
              </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                      <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">Switch between light and dark themes.</p>
                  </div>
                  <Switch
                    id="dark-mode"
                    checked={settings.darkMode}
                    onCheckedChange={(checked) => setSettings(s => ({...s, darkMode: checked}))}
                    disabled={isCustomTheme}
                  />
              </div>
              {isCustomTheme && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Dark Mode Disabled</AlertTitle>
                  <AlertDescription>
                    Dark mode may not work correctly with a custom theme. Restore the default theme to enable dark mode.
                  </AlertDescription>
                </Alert>
              )}
          </CardContent>
           <CardFooter>
              <Button onClick={() => handleSaveSettings('appearance', { 'settings.darkMode': settings.darkMode })} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                  Save Appearance
              </Button>
          </CardFooter>
        </Card>
      </div>
      
       <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Theme Customization</CardTitle>
              <CardDescription>Personalize the color scheme of the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 p-4 rounded-lg border">
                    <Label htmlFor="bg-color">Background</Label>
                    <Input id="bg-color" type="color" className="w-16 h-10 p-1" 
                           value={hslStringToHex(settings.theme?.background || (settings.darkMode ? 'hsl(220 15% 10%)' : 'hsl(220 20% 96%)'))}
                           onChange={(e) => handleThemeColorChange('background', e.target.value)}
                    />
                </div>
                 <div className="flex items-center gap-4 p-4 rounded-lg border">
                    <Label htmlFor="card-color">Cards</Label>
                    <Input id="card-color" type="color" className="w-16 h-10 p-1"
                           value={hslStringToHex(settings.theme?.card || (settings.darkMode ? 'hsl(220 15% 15%)' : 'hsl(0 0% 100%)'))}
                           onChange={(e) => handleThemeColorChange('card', e.target.value)}
                    />
                </div>
                 <div className="flex items-center gap-4 p-4 rounded-lg border">
                    <Label htmlFor="primary-color">Buttons</Label>
                    <Input id="primary-color" type="color" className="w-16 h-10 p-1"
                           value={hslStringToHex(settings.theme?.primary || (settings.darkMode ? 'hsl(263.4 70% 50.4%)' : 'hsl(262.1 83.3% 57.8%)'))}
                           onChange={(e) => handleThemeColorChange('primary', e.target.value)}
                    />
                </div>
            </div>
          </CardContent>
          <CardFooter className="gap-2">
              <Button onClick={() => handleSaveSettings('theme', { 'settings.theme': settings.theme })} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                  Save Theme
              </Button>
               <Button variant="outline" onClick={handleRestoreDefaultTheme}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Restore Default
                </Button>
          </CardFooter>
        </Card>

      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
              <CardDescription>Choose how you want to be notified.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex flex-col p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                        <Label htmlFor="push-notifications" className="font-medium">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Get alerts directly on your device, even when the app is closed.</p>
                    </div>
                    <Switch
                        id="push-notifications"
                        checked={pushEnabled}
                        onCheckedChange={handlePushSubscriptionChange}
                        disabled={pushBlocked || isPushSubscribing}
                    />
                  </div>
                  {isPushSubscribing && <div className="flex justify-end pt-2"><Loader2 className="h-4 w-4 animate-spin" /></div>}
                  {pushBlocked && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Push Notifications Blocked</AlertTitle>
                        <AlertDescription>
                            To enable notifications, you need to go to your browser or device settings for this site and change the permission from "Blocked" to "Allowed".
                        </AlertDescription>
                    </Alert>
                  )}
                    <div className="pt-4 mt-4 border-t space-y-4">
                       <div className="flex items-center justify-between">
                          <div>
                              <Label htmlFor="standard-notifications" className="font-medium">Standard & Urgent Notifications</Label>
                              <p className="text-sm text-muted-foreground">General community updates & important info.</p>
                          </div>
                          <Switch
                            id="standard-notifications"
                            checked={settings.standardNotifications}
                            onCheckedChange={(checked) => setSettings(s => ({...s, standardNotifications: checked}))}
                          />
                      </div>
                       <div className="flex items-start justify-between">
                          <div className="flex-1 pr-4">
                              <Label htmlFor="emergency-notifications" className="font-medium text-destructive">Emergency Alert Notifications</Label>
                              <p className="text-sm text-muted-foreground">Critical, need-to-know safety information.</p>
                          </div>
                          <AlertDialog open={isSnoozeDialogOpen} onOpenChange={setIsSnoozeDialogOpen}>
                              <Switch
                                id="emergency-notifications"
                                checked={settings.emergencyNotifications}
                                onCheckedChange={(checked) => {
                                  if (!checked) {
                                    setIsSnoozeDialogOpen(true);
                                  } else {
                                    handleUnSnoozeEmergency();
                                  }
                                }}
                              />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Disabling emergency alerts means you will not receive critical, life-saving information. This action is not recommended.
                                  <br/><br/>
                                  This setting will automatically turn back on after 7 days for your safety.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => {
                                    handleSnoozeEmergency();
                                    setIsSnoozeDialogOpen(false);
                                }}>
                                  I understand, disable for 7 days
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                      {!settings.emergencyNotifications && settings.emergencyNotificationsSnoozedUntil && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md">
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                          <p>Emergency notifications are temporarily disabled and will automatically resume on {format(settings.emergencyNotificationsSnoozedUntil, 'PPP')}.</p>
                        </div>
                      )}
                    </div>
              </div>
          </CardContent>
          <CardFooter>
               <Button onClick={() => handleSaveSettings('notifications', { 
                   'mailingLists.standard': settings.standardNotifications,
                   'mailingLists.emergency': settings.emergencyNotificationsSnoozedUntil ? false : settings.emergencyNotifications, // if snoozed, it's off
                   'settings.emergencyNotificationsSnoozedUntil': settings.emergencyNotificationsSnoozedUntil
                })} disabled={isSaving}>
                   {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                   Save Notification Settings
                </Button>
          </CardFooter>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Advertising Preferences</CardTitle>
                <CardDescription>Help us show you more relevant ads by selecting the categories you're interested in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                        <Label htmlFor="ad-personalization" className="font-medium">Ad Personalization</Label>
                        <p className="text-sm text-muted-foreground">Allow ads based on your activity and selected interests. You will see all ads if this is off.</p>
                    </div>
                    <Switch
                        id="ad-personalization"
                        checked={settings.adPersonalization}
                        onCheckedChange={(checked) => setSettings(s => ({...s, adPersonalization: checked}))}
                    />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {adCategories.map(category => (
                        <div key={category} className="flex items-center space-x-2">
                            <Checkbox 
                                id={`cat-${category}`} 
                                checked={settings.selectedCategories.includes(category)}
                                onCheckedChange={() => handleCategoryChange(category)}
                                disabled={!settings.adPersonalization}
                            />
                            <Label 
                                htmlFor={`cat-${category}`}
                                className={cn("font-normal text-sm", !settings.adPersonalization && "text-muted-foreground")}
                            >
                                {category}
                            </Label>
                        </div>
                    ))}
                </div>
            </CardContent>
             <CardFooter className="flex-col sm:flex-row items-center gap-4">
                <Button disabled={isAdSaveDisabled || isSaving} onClick={() => handleSaveSettings('advertising', { 
                    'settings.adPersonalization': settings.adPersonalization, 
                    'settings.selectedCategories': settings.selectedCategories 
                })}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    Save advertising preferences
                </Button>
                {settings.adPersonalization && (
                    <p className={cn(
                        "text-sm",
                        settings.selectedCategories.length < MIN_CATEGORIES ? "text-destructive" : "text-green-600"
                    )}>
                        {settings.selectedCategories.length}/{MIN_CATEGORIES} minimum categories selected.
                    </p>
                )}
            </CardFooter>
        </Card>
    </div>
  );
}
