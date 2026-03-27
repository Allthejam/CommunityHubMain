
import { Briefcase, Building, Code, BarChart, Mail, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const jobOpenings = [
    {
        department: "Management",
        icon: <Building className="h-6 w-6 text-primary" />,
        roles: [
            { title: "Regional Director", location: "Remote" },
            { title: "Community Success Manager", location: "Various Locations" }
        ]
    },
    {
        department: "Administration",
        icon: <Briefcase className="h-6 w-6 text-primary" />,
        roles: [
            { title: "Platform Support Specialist", location: "Remote" },
            { title: "Onboarding Coordinator", location: "Remote" }
        ]
    },
    {
        department: "Information Technology",
        icon: <Code className="h-6 w-6 text-primary" />,
        roles: [
            { title: "Senior Full-Stack Developer", location: "Remote" },
            { title: "DevOps Engineer", location: "Remote" },
            { title: "UI/UX Designer", location: "Remote" }
        ]
    },
    {
        department: "Sales & Marketing",
        icon: <BarChart className="h-6 w-6 text-primary" />,
        roles: [
            { title: "National Sales Executive", location: "Remote" },
            { title: "Digital Marketing Manager", location: "Remote" }
        ]
    }
];

export default function CareersPage() {
    return (
        <div className="space-y-16 py-12">
            <section className="text-center">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-headline">
                    Join Our Mission
                </h1>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                    We're building a team of passionate individuals dedicated to reconnecting communities. If you believe in the power of local, we want to hear from you.
                </p>
            </section>

            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Under Development</AlertTitle>
                <AlertDescription>
                    This page is for demonstration purposes only. The job listings below are examples and cannot be applied for at this time.
                </AlertDescription>
            </Alert>

            <section>
                <h2 className="text-3xl font-bold font-headline text-center mb-8">Current Openings</h2>
                <div className="space-y-8">
                    {jobOpenings.map(job => (
                        <Card key={job.department}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    {job.icon}
                                    {job.department}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {job.roles.map(role => (
                                    <div key={role.title} className="flex justify-between items-center p-3 rounded-lg bg-secondary">
                                        <div>
                                            <p className="font-semibold">{role.title}</p>
                                            <p className="text-sm text-muted-foreground">{role.location}</p>
                                        </div>
                                        <Button variant="outline" disabled>Apply Now</Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
            
            <Separator />

            <section className="text-center">
                 <h2 className="text-3xl font-bold font-headline">Don't See a Fit?</h2>
                 <p className="mt-2 max-w-3xl mx-auto text-muted-foreground">
                    We're always looking for talented people. If you're passionate about our mission, send us your resume and let us know how you can make a difference.
                </p>
                <div className="mt-6">
                    <Button asChild size="lg">
                        <Link href="mailto:careers@communityhub.example.com">
                            <Mail className="mr-2 h-5 w-5" />
                            Contact Us
                        </Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
