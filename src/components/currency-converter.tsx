
'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const currencies = [
    { value: "USD", label: "USA ($)", flag: "🇺🇸" },
    { value: "EUR", label: "Europe (€)", flag: "🇪🇺" },
    { value: "AUD", label: "Australia ($)", flag: "🇦🇺" },
    { value: "BRL", label: "Brazil (R$)", flag: "🇧🇷" },
    { value: "AED", label: "UAE (د.إ)", flag: "🇦🇪" },
    { value: "JPY", label: "Japan (¥)", flag: "🇯🇵" },
];

const symbols: { [key: string]: string } = { USD: '$', EUR: '€', AUD: 'A$', BRL: 'R$', AED: 'د.إ', JPY: '¥' };

export function CurrencyConverter() {
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const [amount, setAmount] = React.useState('100.00');
    const [selectedCurrency, setSelectedCurrency] = React.useState('USD');
    const [convertedPrice, setConvertedPrice] = React.useState('0.00');
    const [rate, setRate] = React.useState('0.0000');
    const [flag, setFlag] = React.useState('🇬🇧');
    const [isSaving, setIsSaving] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [aiInsight, setAiInsight] = React.useState("Live market data active.");

    const runConversion = React.useCallback(async (currency: string, inputAmount: string) => {
        const numAmount = parseFloat(inputAmount) || 0;
        try {
            const response = await fetch(`https://open.er-api.com/v6/latest/GBP`);
            const data = await response.json();
            const currentRate = data.rates[currency];
            
            setRate(currentRate.toFixed(4));
            setConvertedPrice(`${symbols[currency]}${(numAmount * currentRate).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
            const currencyInfo = currencies.find(c => c.value === currency);
            if (currencyInfo) {
                setFlag(currencyInfo.flag);
            }
            
        } catch (err) {
            console.error("Rate fetch error:", err);
            toast({ title: 'Error', description: 'Could not fetch exchange rates.', variant: 'destructive' });
        }
    }, [toast]);
    
    React.useEffect(() => {
        const loadPreferences = async () => {
            if (!user || !db) {
                setIsLoading(false);
                runConversion(selectedCurrency, amount);
                return;
            };
            
            const docRef = doc(db, `users/${user.uid}/appData/preferences`);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const data = snap.data();
                const currency = data.currency || 'USD';
                const lastAmount = data.lastAmount || '100.00';
                setAmount(lastAmount);
                setSelectedCurrency(currency);
                runConversion(currency, lastAmount);
            } else {
                runConversion(selectedCurrency, amount);
            }
            setIsLoading(false);
        };
        loadPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, db]);

    React.useEffect(() => {
        runConversion(selectedCurrency, amount);
    }, [selectedCurrency, amount, runConversion]);

    const handleSave = async () => {
        if (!user || !db) return;
        setIsSaving(true);
        try {
            const docRef = doc(db, 'users', user.uid, 'appData', 'preferences');
            await setDoc(docRef, {
                currency: selectedCurrency,
                lastAmount: amount,
                timestamp: new Date().toISOString()
            }, { merge: true });
            
            toast({ title: 'Preferences Saved', description: 'Your currency settings have been saved.' });
        } catch (e) {
            console.error("Firestore Error:", e);
            toast({ title: 'Error', description: 'Could not save preferences.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }
    
    const isUKBusiness = userProfile?.accountType === 'business' && userProfile?.country === 'United Kingdom';

    return (
        <div className="widget-card overflow-hidden rounded-2xl border bg-card">
            <div className="bg-primary p-4 flex justify-between items-center text-primary-foreground">
                <div>
                    <h1 className="text-xs font-black uppercase tracking-widest">Sterling UK £</h1>
                    <p className="text-[10px] font-medium opacity-80">Base: GBP £ (UK)</p>
                </div>
                <div className="text-2xl drop-shadow-sm">{flag}</div>
            </div>

            <div className="p-4 space-y-4">
                {isLoading || isProfileLoading ? <div className="h-40 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div> :
                isUKBusiness ? (
                     <div className="h-40 flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                        <Lock className="h-8 w-8 mb-2" />
                        <p className="text-sm font-medium">This feature is not available for UK-based business accounts.</p>
                     </div>
                ) : (
                <>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="test-price" className="text-xs font-bold text-slate-400 uppercase ml-1">UK Amount</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                            <Input type="number" id="test-price" value={amount} step="0.01" onChange={e => setAmount(e.target.value)}
                                className="w-full pl-6 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary transition-all outline-none"/>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-400 uppercase ml-1">Market</Label>
                        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                            <SelectTrigger className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer hover:border-primary transition-colors">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {currencies.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="my-3 border-t"></div>

                <div className="bg-primary/10 rounded-2xl p-5 text-primary shadow-inner relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest mb-1">Live Conversion</p>
                            <div className="text-3xl font-black tabular-nums">{convertedPrice}</div>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-primary/70 uppercase">Rate</p>
                            <p id="rate-val" className="text-xs font-mono font-medium">{rate}</p>
                        </div>
                    </div>
                </div>
                 <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <div className="text-[11px] leading-relaxed text-slate-600 font-medium italic text-center">
                        {aiInsight}
                    </div>
                </div>

                <Button onClick={handleSave} className="w-full text-xs font-black uppercase tracking-widest" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Save Preferences
                </Button>
                </>
                )}
            </div>
        </div>
    )
}
