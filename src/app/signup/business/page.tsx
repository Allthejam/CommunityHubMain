'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SignUpForm from '@/components/signup-form'

export default function BusinessSignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
           <Button variant="ghost" size="sm" className="justify-start p-0 h-auto mb-4" asChild>
                <Link href="/signup/account-type">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to account selection
                </Link>
            </Button>
          <CardTitle>Create a Business Account</CardTitle>
          <CardDescription>
            Promote your business, post events, and engage with local customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm accountType="business" />
        </CardContent>
      </Card>
    </div>
  )
}
