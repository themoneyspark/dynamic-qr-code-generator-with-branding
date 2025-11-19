"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, QrCode, Layers, User, LogOut, Lock } from "lucide-react";
import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Helper to delete cookie
function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

export default function Home() {
  const { data: session, isPending, refetch } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      deleteCookie("bearer_token");
      refetch();
      toast.success("Signed out successfully");
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <QrCode className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">BizHub Tracking</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</Link>
            {session?.user && (
              <Link href="/projects" className="text-sm font-medium text-muted-foreground hover:text-foreground">Projects</Link>
            )}
          </nav>
          <div className="flex items-center gap-4">
            {isPending ? (
              <div className="h-9 w-20 bg-muted animate-pulse rounded" />
            ) : session?.user ? (
              <>
                <Link href="/projects">
                  <Button variant="outline" size="sm">Dashboard</Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{session.user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm">
                  <Lock className="mr-2 h-4 w-4" /> Admin Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 px-4 text-center space-y-8 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto max-w-4xl space-y-6">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20">
              Private Admin Solution
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight lg:text-7xl">
              Dynamic QR Codes with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Smart Tracking</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create branded QR codes that you can update anytime. Track scans, user locations, and device types in real-time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href={session?.user ? "/projects" : "/login"}>
                <Button size="lg" className="h-12 px-8 text-base rounded-full">
                  {session?.user ? "Go to Dashboard" : "Admin Access"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base rounded-full">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-20 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-none shadow-md bg-background/60 backdrop-blur-sm">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                    <Layers className="h-6 w-6" />
                  </div>
                  <CardTitle>Project Management</CardTitle>
                  <CardDescription>Organize your QR codes into campaigns and projects.</CardDescription>
                </CardHeader>
                <CardContent>
                  Keep track of different marketing campaigns separately with our intuitive project dashboard.
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-background/60 backdrop-blur-sm">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <CardTitle>Custom Design</CardTitle>
                  <CardDescription>Brand your QR codes with colors and logos.</CardDescription>
                </CardHeader>
                <CardContent>
                  Make your QR codes stand out. Upload your logo, choose custom colors, and adjust the style to match your brand.
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-background/60 backdrop-blur-sm">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <CardTitle>Deep Analytics</CardTitle>
                  <CardDescription>Know who is scanning your codes.</CardDescription>
                </CardHeader>
                <CardContent>
                  Track scan counts, locations, device types, and timestamps. Understand your audience better.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-background">
          <div className="container mx-auto max-w-4xl text-center space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to boost your marketing?</h2>
            <p className="text-lg text-muted-foreground">
              Professional QR code tracking solution for comprehensive offline-to-online conversion analytics.
            </p>
            <Link href={session?.user ? "/projects" : "/login"}>
              <Button size="lg" className="h-14 px-8 text-lg rounded-full">
                {session?.user ? "Go to Projects" : "Access Dashboard"}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">BizHub Tracking</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BizHub Tracking. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}