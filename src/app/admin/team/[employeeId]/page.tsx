
"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    UserCog,
    ArrowLeft,
    Mail,
    Phone,
    Shield,
    Home,
    Car,
    Heart,
    Pencil,
    Printer,
    Send,
    Users,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from 'firebase/firestore';

type UserData = {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
    reportsTo?: string | null;
    status: 'active' | 'pending';
};

type Address = {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    stateCounty?: string;
    postcode?: string;
};

type NextOfKin = {
    name: string;
    relationship: string;
    contactNumber: string;
    email: string;
    address: Address;
};

type StaffProfileData = {
    workEmail?: string;
    phone?: string;
    address?: Address;
    canDrive?: string;
    nextOfKin?: NextOfKin;
};

const TeamMemberCard = ({ member }: { member: UserData }) => (
    <div className="flex items-center gap-3 p-3 border rounded-md">
        <Avatar className="h-10 w-10">
            <AvatarImage src={member.avatar} alt={member.name} />
            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
            <Link href={`/admin/team-management/${member.id}`} className="font-semibold hover:underline">
                {member.name}
            </Link>
            <p className="text-xs text-muted-foreground">{member.role}</p>
        </div>
    </div>
)


export default function EmployeeDetailPage() {
    const params = useParams();
    const { employeeId } = params;
    const { toast } = useToast();
    const db = useFirestore();

    const employeeRef = useMemoFirebase(() => (db && employeeId ? doc(db, "users", employeeId as string) : null), [db, employeeId]);
    const staffProfileRef = useMemoFirebase(() => (db && employeeId ? doc(db, "staff_profiles", employeeId as string) : null), [db, employeeId]);
    
    const { data: employeeData, isLoading: employeeLoading } = useDoc<UserData>(employeeRef);
    const { data: staffProfile, isLoading: profileLoading } = useDoc<StaffProfileData>(staffProfileRef);
    
    const managerRef = useMemoFirebase(() => (db && employeeData?.reportsTo ? doc(db, "users", employeeData.reportsTo) : null), [db, employeeData]);
    const { data: manager, isLoading: managerLoading } = useDoc<UserData>(managerRef);

    const reportsQuery = useMemoFirebase(() => (db && employeeId ? query(collection(db, "users"), where("reportsTo", "==", employeeId)) : null), [db, employeeId]);
    const { data: directReports, isLoading: reportsLoading } = useCollection<UserData>(reportsQuery);

    const loading = employeeLoading || profileLoading || managerLoading || reportsLoading;

    const handleSend = () => {
        toast({
            title: "Action Not Implemented",
            description: "The 'Send' functionality will be configured in a future step.",
        });
    };
    
    const formatAddress = (address?: Address) => {
        if (!address) return 'Not Provided';
        const parts = [
            address.addressLine1,
            address.addressLine2,
            address.city,
            address.stateCounty,
            address.postcode,
        ];
        return parts.filter(Boolean).join(', ');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!employeeData) {
        return (
             <div className="text-center">
                <h1 className="text-2xl font-bold">Employee Not Found</h1>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/admin/team-management">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Team Management
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
             <div className="flex justify-between items-center">
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/admin/team-management">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Team Management
                    </Link>
                </Button>
                 <div className="flex gap-2">
                    <Button variant="outline" asChild>
                         <Link href={`/admin/team-management/edit/${employeeId}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button variant="outline" onClick={handleSend}>
                        <Send className="mr-2 h-4 w-4" />
                        Send
                    </Button>
                </div>
            </div>
             <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <UserCog className="h-8 w-8" />
                Employee Profile
            </h1>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start gap-6">
                    <Avatar className="w-24 h-24">
                        <AvatarImage src={employeeData.avatar} alt={employeeData.name} />
                        <AvatarFallback>{employeeData.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex flex-col sm:flex-row justify-between items-start">
                            <div className="flex items-center gap-3">
                                <CardTitle className="text-2xl mb-1">{employeeData.name}</CardTitle>
                                <Badge variant={employeeData.status === 'active' ? 'default' : 'secondary'}>{employeeData.status}</Badge>
                            </div>
                        </div>
                        <CardDescription className="text-lg text-muted-foreground">{employeeData.role}</CardDescription>
                        <div className="flex flex-col sm:flex-row gap-x-4 gap-y-2 text-sm text-muted-foreground mt-4">
                            <a href={`mailto:${employeeData.email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                <Mail className="h-4 w-4" />
                                <span>{employeeData.email} (Personal)</span>
                            </a>
                            {staffProfile?.workEmail && (
                                <a href={`mailto:${staffProfile.workEmail}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                    <Mail className="h-4 w-4" />
                                    <span>{staffProfile.workEmail} (Work)</span>
                                </a>
                            )}
                            {staffProfile?.phone && (
                                <a href={`tel:${staffProfile.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                    <Phone className="h-4 w-4" />
                                    <span>{staffProfile.phone}</span>
                                </a>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Separator className="my-4" />
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Personal Details</h3>
                            <div className="grid gap-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <Home className="h-4 w-4 mt-1 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Address</p>
                                        <p className="text-muted-foreground">{formatAddress(staffProfile?.address)}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Car className="h-4 w-4 mt-1 text-muted-foreground" />
                                     <div>
                                        <p className="font-medium">Can Drive</p>
                                        <p className="text-muted-foreground">{staffProfile?.canDrive || 'Not Provided'}</p>
                                    </div>
                                </div>
                                 <div className="flex items-start gap-3">
                                    <Shield className="h-4 w-4 mt-1 text-muted-foreground" />
                                     <div>
                                        <p className="font-medium">Role</p>
                                        <p className="text-muted-foreground">{employeeData.role}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                         <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><Heart className="h-5 w-5" />Next of Kin</h3>
                            {staffProfile?.nextOfKin ? (
                                <div className="grid gap-3 text-sm p-4 border rounded-lg">
                                    <p className="font-semibold">{staffProfile.nextOfKin.name} <span className="text-muted-foreground font-normal">({staffProfile.nextOfKin.relationship})</span></p>
                                    <a href={`mailto:${staffProfile.nextOfKin.email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span>{staffProfile.nextOfKin.email}</span>
                                    </a>
                                    <a href={`tel:${staffProfile.nextOfKin.contactNumber}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span>{staffProfile.nextOfKin.contactNumber}</span>
                                    </a>
                                    <div className="flex items-start gap-2">
                                        <Home className="h-4 w-4 mt-1 text-muted-foreground" />
                                        <span>{formatAddress(staffProfile.nextOfKin.address)}</span>
                                    </div>
                                </div>
                            ) : <p className="text-sm text-muted-foreground">Not Provided.</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        Chain of Command
                    </CardTitle>
                    <CardDescription>
                        This employee's position within the team hierarchy.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <h3 className="font-semibold">Reports To</h3>
                        {manager ? (
                            <TeamMemberCard member={manager} />
                        ) : (
                            <p className="text-sm text-muted-foreground">This team member is at the top of their hierarchy.</p>
                        )}
                    </div>
                     <div className="space-y-3">
                        <h3 className="font-semibold">Direct Reports ({directReports?.length || 0})</h3>
                        {directReports && directReports.length > 0 ? (
                            <div className="space-y-2">
                                {directReports.map(report => (
                                    <TeamMemberCard key={report.id} member={report} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">This team member has no direct reports.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
