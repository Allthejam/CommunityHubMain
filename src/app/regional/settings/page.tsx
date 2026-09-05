'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  Settings as SettingsIcon, 
  Building, 
  MapPin, 
  Mail, 
  Phone, 
  Globe, 
  Save, 
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
  Plus,
  Trash2
} from 'lucide-react';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Badge } from '@/components/ui/badge';

export default function RegionalSettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    if (profileLoading || !userProfile) return;
    if (!user || (userProfile.accountType !== 'regional' && !userProfile.permissions?.isRegionalNetwork)) {
      toast({
        title: 'Access Restricted',
        description: 'Only authorized regional network accounts can access authority settings.',
        variant: 'destructive',
      });
      router.replace('/regional-networks');
    }
  }, [user, userProfile, profileLoading, router, toast]);

  const [orgName, setOrgName] = useState('');
  const [address, setAddress] = useState('');
  const [emails, setEmails] = useState<string[]>(['']);
  const [phones, setPhones] = useState<string[]>(['']);
  const [website, setWebsite] = useState('');
  const [shortBio, setShortBio] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Prevent userProfile background re-renders from overwriting active user edits
  const isInitializedRef = useRef(false);
  const draftKey = user ? `regional_settings_draft_${user.uid}` : null;

  // Initial load only
  useEffect(() => {
    if (userProfile && !isInitializedRef.current) {
      // Check for saved local draft first
      if (draftKey) {
        const localDraft = localStorage.getItem(draftKey);
        if (localDraft) {
          try {
            const parsed = JSON.parse(localDraft);
            setOrgName(parsed.orgName ?? userProfile.organizationName ?? '');
            setAddress(parsed.address ?? userProfile.address ?? '');
            setEmails(Array.isArray(parsed.emails) && parsed.emails.length > 0 ? parsed.emails : [parsed.email || userProfile.contactEmail || userProfile.email || '']);
            setPhones(Array.isArray(parsed.phones) && parsed.phones.length > 0 ? parsed.phones : [parsed.phone || userProfile.contactNumber || '']);
            setWebsite(parsed.website ?? userProfile.website ?? '');
            setShortBio(parsed.shortBio ?? userProfile.shortBio ?? '');
            setDescription(parsed.description ?? userProfile.description ?? '');
            setHasUnsavedChanges(true);
            isInitializedRef.current = true;
            return;
          } catch (e) {
            console.error('Failed to parse draft settings:', e);
          }
        }
      }

      setOrgName(userProfile.organizationName || userProfile.businessName || '');
      setAddress(userProfile.address || '');

      const initialEmails = Array.isArray(userProfile.emails) && userProfile.emails.length > 0 
        ? userProfile.emails 
        : [userProfile.contactEmail || userProfile.email || ''];
      setEmails(initialEmails);

      const initialPhones = Array.isArray(userProfile.phones) && userProfile.phones.length > 0 
        ? userProfile.phones 
        : [userProfile.contactNumber || userProfile.phone || ''];
      setPhones(initialPhones);

      setWebsite(userProfile.website || '');
      setShortBio(userProfile.shortBio || userProfile.summary || '');
      setDescription(userProfile.description || userProfile.mainBio || '');
      isInitializedRef.current = true;
    }
  }, [userProfile, draftKey]);

  // Save to localStorage as draft whenever user makes edits
  const persistDraft = useCallback((data: {
    orgName: string;
    address: string;
    emails: string[];
    phones: string[];
    website: string;
    shortBio: string;
    description: string;
  }) => {
    if (!draftKey || !isInitializedRef.current) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(data));
      setHasUnsavedChanges(true);
    } catch (e) {
      console.error('Failed to store draft locally:', e);
    }
  }, [draftKey]);

  // Field change handlers
  const handleOrgNameChange = (val: string) => {
    setOrgName(val);
    persistDraft({ orgName: val, address, emails, phones, website, shortBio, description });
  };
  const handleAddressChange = (val: string) => {
    setAddress(val);
    persistDraft({ orgName, address: val, emails, phones, website, shortBio, description });
  };

  // Emails Array Handlers
  const handleEmailChange = (index: number, val: string) => {
    const updated = [...emails];
    updated[index] = val;
    setEmails(updated);
    persistDraft({ orgName, address, emails: updated, phones, website, shortBio, description });
  };
  const addEmail = () => {
    const updated = [...emails, ''];
    setEmails(updated);
    persistDraft({ orgName, address, emails: updated, phones, website, shortBio, description });
  };
  const removeEmail = (index: number) => {
    if (emails.length <= 1) return;
    const updated = emails.filter((_, i) => i !== index);
    setEmails(updated);
    persistDraft({ orgName, address, emails: updated, phones, website, shortBio, description });
  };

  // Phones Array Handlers
  const handlePhoneChange = (index: number, val: string) => {
    const updated = [...phones];
    updated[index] = val;
    setPhones(updated);
    persistDraft({ orgName, address, emails, phones: updated, website, shortBio, description });
  };
  const addPhone = () => {
    const updated = [...phones, ''];
    setPhones(updated);
    persistDraft({ orgName, address, emails, phones: updated, website, shortBio, description });
  };
  const removePhone = (index: number) => {
    if (phones.length <= 1) return;
    const updated = phones.filter((_, i) => i !== index);
    setPhones(updated);
    persistDraft({ orgName, address, emails, phones, website: updated, shortBio, description });
  };

  const handleWebsiteChange = (val: string) => {
    setWebsite(val);
    persistDraft({ orgName, address, emails, phones, website: val, shortBio, description });
  };
  const handleShortBioChange = (val: string) => {
    setShortBio(val);
    persistDraft({ orgName, address, emails, phones, website, shortBio: val, description });
  };
  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    persistDraft({ orgName, address, emails, phones, website, shortBio, description: val });
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !db) return;

    setIsSaving(true);
    try {
      const cleanEmails = emails.map(e => e.trim()).filter(Boolean);
      const cleanPhones = phones.map(p => p.trim()).filter(Boolean);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        organizationName: orgName,
        businessName: orgName,
        address: address,
        emails: cleanEmails,
        contactEmail: cleanEmails[0] || '',
        phones: cleanPhones,
        contactNumber: cleanPhones[0] || '',
        website: website,
        shortBio: shortBio,
        summary: shortBio,
        description: description,
        mainBio: description,
      });

      // Clear local draft after successful save
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      setHasUnsavedChanges(false);

      toast({
        title: 'Authority Settings Saved',
        description: 'Updated your Regional Network profile.'
      });
    } catch (error: any) {
      toast({
        title: 'Failed to Save',
        description: error.message || 'An error occurred while saving settings.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardDraft = () => {
    if (draftKey) {
      localStorage.removeItem(draftKey);
    }
    if (userProfile) {
      setOrgName(userProfile.organizationName || userProfile.businessName || '');
      setAddress(userProfile.address || '');
      setEmails(Array.isArray(userProfile.emails) && userProfile.emails.length > 0 ? userProfile.emails : [userProfile.contactEmail || userProfile.email || '']);
      setPhones(Array.isArray(userProfile.phones) && userProfile.phones.length > 0 ? userProfile.phones : [userProfile.contactNumber || userProfile.phone || '']);
      setWebsite(userProfile.website || '');
      setShortBio(userProfile.shortBio || userProfile.summary || '');
      setDescription(userProfile.description || userProfile.mainBio || '');
    }
    setHasUnsavedChanges(false);
    toast({ title: 'Draft Discarded', description: 'Reverted to saved settings.' });
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-8 pb-32">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 p-0 h-auto">
              <Link href="/regional/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-3xl font-extrabold font-headline tracking-tight">
              Authority Profile & Regional Settings
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your official organisation profile, contact information, and regional authority credentials.
            </p>
          </div>

          {hasUnsavedChanges && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 px-3 py-1 text-xs font-semibold animate-pulse">
              ⚠️ Unsaved Draft Preserved
            </Badge>
          )}
        </div>

        <Card className="shadow-md">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg">Regional Authority Profile</CardTitle>
              </div>
              {hasUnsavedChanges && (
                <Button variant="ghost" size="sm" onClick={handleDiscardDraft} className="text-xs text-muted-foreground hover:text-red-600">
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Discard Draft
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organisation / Authority Name *</Label>
                <Input 
                  id="orgName"
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  placeholder="e.g. National Park Scotland, Highland Council"
                  required
                />
              </div>

              {/* Jurisdiction / HQ Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Official Jurisdiction / HQ Address</Label>
                <Input 
                  id="address"
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="e.g. Regional Network Headquarters, Oakridge, DE1 4MO"
                />
              </div>

              {/* Dynamic Emails & Phones Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Official Contact Emails Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-emerald-600" /> Official Email Addresses
                    </Label>
                  </div>
                  
                  <div className="space-y-2">
                    {emails.map((em, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input 
                          type="email"
                          placeholder={idx === 0 ? "Primary: e.g. contact@cairngorms.co.uk" : `Secondary email #${idx + 1}`}
                          value={em}
                          onChange={(e) => handleEmailChange(idx, e.target.value)}
                        />
                        {emails.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeEmail(idx)}
                            className="text-slate-400 hover:text-red-600 shrink-0 h-9 w-9"
                            title="Remove email"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addEmail}
                    className="w-full text-xs border-dashed text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Additional Email
                  </Button>
                </div>

                {/* Contact Phone Numbers Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" /> Contact Phone Numbers
                    </Label>
                  </div>
                  
                  <div className="space-y-2">
                    {phones.map((ph, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input 
                          placeholder={idx === 0 ? "Primary: e.g. 01479 873917" : `Secondary phone #${idx + 1}`}
                          value={ph}
                          onChange={(e) => handlePhoneChange(idx, e.target.value)}
                        />
                        {phones.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removePhone(idx)}
                            className="text-slate-400 hover:text-red-600 shrink-0 h-9 w-9"
                            title="Remove phone number"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addPhone}
                    className="w-full text-xs border-dashed text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Additional Phone Number
                  </Button>
                </div>

              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Official Website URL</Label>
                <Input 
                  id="website"
                  placeholder="https://www.cairngorms.co.uk"
                  value={website}
                  onChange={(e) => handleWebsiteChange(e.target.value)}
                />
              </div>

              {/* Short Bio */}
              <div className="space-y-2">
                <Label htmlFor="shortBio">Short Bio / Summary</Label>
                <Textarea 
                  id="shortBio"
                  rows={2}
                  placeholder="Brief 1-2 sentence summary of your regional authority..."
                  value={shortBio}
                  onChange={(e) => handleShortBioChange(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Used for concise hero card previews and public billboard headers.</p>
              </div>

              {/* Main Bio with Rich Text Editor */}
              <div className="space-y-2">
                <Label htmlFor="mainBio">Main Bio (Detailed Overview)</Label>
                <RichTextEditor 
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder="Describe your regional park authority, council responsibilities, conservation mandate, and public services..."
                />
                <p className="text-[11px] text-muted-foreground">Use rich text formatting (headings, lists, bold text, links) for your official public bio overview.</p>
              </div>

              <Button type="submit" disabled={isSaving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 text-base shadow-md">
                {isSaving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</> : <><Save className="mr-2 h-5 w-5" /> Save Authority Settings</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sticky Floating Save Bar so user never has to scroll down or lose work when switching windows/tabs */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center justify-between gap-4 backdrop-blur-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-white block">You have unsaved changes</span>
                  <span className="text-slate-300">Draft auto-saved to browser. Save to publish to Public Site.</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="ghost" onClick={handleDiscardDraft} className="text-xs text-slate-300 hover:text-white">
                  Discard
                </Button>
                <Button size="sm" onClick={() => handleSaveSettings()} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1.5 h-4 w-4" /> Save Now</>}
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
