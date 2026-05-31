import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, SquareArrowUp, MoreVertical, Zap } from "lucide-react";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

export default function GetTheAppPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <Smartphone className="mx-auto h-12 w-12 text-primary" />
                <h1 className="mt-4 text-4xl font-bold tracking-tight font-headline">
                    Get The App
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                   Install our Progressive Web App (PWA) directly to your device for a better experience.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>For iOS (iPhone/iPad)</CardTitle>
                        <CardDescription>Using the Safari browser:</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                            <li>Open this website in the <span className="font-semibold">Safari</span> browser.</li>
                            <li>Tap the 'Share' button (<SquareArrowUp className="inline-block h-4 w-4 -mt-1 mx-1" />) in the toolbar.</li>
                            <li>Scroll down and tap <span className="font-semibold">'Add to Home Screen'</span>.</li>
                            <li>Confirm by tapping 'Add'.</li>
                        </ol>
                         <p className="text-sm font-semibold pt-2 border-t">Important: To receive push notifications on iOS, you must add the app to your Home Screen.</p>
                         <div className="relative h-64 sm:h-80 w-full mt-4">
                            <Image
                                src="https://i.postimg.cc/6q7CW500/i-OS-instructions.jpg"
                                alt="iOS installation instructions"
                                fill
                                style={{objectFit: 'contain'}}
                                data-ai-hint="ios instructions"
                            />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>For Android</CardTitle>
                        <CardDescription>Using the Chrome browser:</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                            <li>Open this website in the <span className="font-semibold">Chrome</span> browser.</li>
                            <li>A small banner may appear asking you to "Add to Home Screen" or "Install." Tap it.</li>
                            <li>If no banner appears, tap the three-dot menu (<MoreVertical className="inline-block h-4 w-4 -mt-1 mx-1" />) in the top-right corner.</li>
                            <li>Tap <span className="font-semibold">'Install app'</span> or <span className="font-semibold">'Add to Home Screen'</span>.</li>
                        </ol>
                        <div className="relative h-64 sm:h-80 w-full mt-4">
                             <Image
                                src="https://i.postimg.cc/NMC1vr1F/On-Android.jpg"
                                alt="Android installation instructions"
                                fill
                                style={{objectFit: 'contain'}}
                                data-ai-hint="android instructions"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Separator className="my-16" />

            <section className="space-y-8 text-center">
                <div className="relative h-64 sm:h-80 w-full max-w-sm mx-auto">
                    <Image
                        src="https://i.postimg.cc/0NLyM3kh/Gemini-Generated-Image-ifji5cifji5cifji.jpg"
                        alt="A phone screen showing app shortcuts."
                        fill
                        style={{objectFit: 'contain'}}
                        data-ai-hint="app shortcuts"
                    />
                </div>

                <div className="flex items-center justify-center gap-4">
                    <Separator className="w-1/4" />
                    <Zap className="h-8 w-8 text-primary" />
                    <Separator className="w-1/4" />
                </div>

                <h2 className="text-3xl font-bold font-headline">Direct Action Shortcuts</h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Stop digging through menus. Start doing. Conventional apps make you open them, wait for a splash screen, and then find your way to where you want to be. Our App is built differently. We’ve designed it with Direct Action Shortcuts so you can get exactly where you need to go in half the time.
                </p>

                <Card className="text-left max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>How to use it:</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ol className="list-decimal list-inside space-y-4 text-lg">
                            <li><span className="font-semibold text-foreground">Long-Press:</span> <span className="text-muted-foreground">Touch and hold our App icon on your home screen.</span></li>
                            <li><span className="font-semibold text-foreground">Select:</span> <span className="text-muted-foreground">A menu will instantly appear.</span></li>
                            <li><span className="font-semibold text-foreground">Go:</span> <span className="text-muted-foreground">Tap Community Feed, The Highstreet, or Community Chat to jump straight into the action.</span></li>
                        </ol>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}