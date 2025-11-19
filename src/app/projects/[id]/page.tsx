"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, QrCode as QrIcon, BarChart2, MoreHorizontal, Download, ExternalLink, Trash2, Copy, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import QRCodeWizard from "@/components/QRCodeWizard";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { QRCodeSVG } from "qrcode.react";
import QRCodeLib from "qrcode";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface QRCode {
  id: number;
  shortCode: string;
  destinationUrl: string;
  scans: number;
  createdAt: string;
  customizationConfig: any;
  utmParams: any;
}

interface Project {
  id: number;
  name: string;
  description: string;
}

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQrId, setSelectedQrId] = useState<number | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQr, setEditingQr] = useState<QRCode | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const projectId = parseInt(id);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push(`/login?redirect=/projects/${id}`);
    }
  }, [session, isPending, router, id]);

  const fetchProjectData = async () => {
    setIsLoading(true);
    try {
      // Parallel fetch
      const [projRes, qrRes] = await Promise.all([
        fetch(`/api/projects?id=${projectId}`),
        fetch(`/api/qr-codes?projectId=${projectId}`)
      ]);

      if (projRes.ok) {
        const projData = await projRes.json();
        setProject(projData);
      }
      
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        setQrCodes(qrData);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load project data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && session?.user) fetchProjectData();
  }, [projectId, session]);

  const fetchAnalytics = async (qrId: number) => {
    setIsAnalyticsLoading(true);
    setSelectedQrId(qrId);
    try {
      const res = await fetch(`/api/scans?qrCodeId=${qrId}&analytics=true`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error("Analytics error:", error);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const handleDeleteQr = async (qrId: number) => {
    if (!confirm("Are you sure you want to delete this QR code? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/qr-codes?id=${qrId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("QR code deleted");
        setQrCodes(qrCodes.filter(q => q.id !== qrId));
        if (selectedQrId === qrId) {
          setSelectedQrId(null);
          setAnalyticsData(null);
        }
      }
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleDownloadQr = async (qr: QRCode) => {
    const redirectBaseUrl = typeof window !== "undefined" ? `${window.location.origin}/r/` : "";
    const qrCodeValue = `${redirectBaseUrl}${qr.shortCode}`;
    
    const size = qr.customizationConfig?.size || 256;
    const fgColor = qr.customizationConfig?.color || "#000000";
    const logoUrl = qr.customizationConfig?.logo;
    
    try {
      // Generate QR code using qrcode library
      const canvas = document.createElement("canvas");
      await QRCodeLib.toCanvas(canvas, qrCodeValue, {
        width: size,
        margin: 1,
        color: {
          dark: fgColor,
          light: "#ffffff"
        },
        errorCorrectionLevel: "H"
      });
      
      // If there's a logo, add it to the center
      if (logoUrl) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const logo = new Image();
          logo.crossOrigin = "anonymous";
          
          logo.onload = () => {
            const logoSize = size * 0.2;
            const x = (size - logoSize) / 2;
            const y = (size - logoSize) / 2;
            
            // Draw white background for logo
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);
            
            // Draw logo
            ctx.drawImage(logo, x, y, logoSize, logoSize);
            
            // Download
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const downloadLink = document.createElement("a");
                downloadLink.download = `qrcode-${qr.shortCode}.png`;
                downloadLink.href = url;
                downloadLink.click();
                URL.revokeObjectURL(url);
                toast.success("QR code downloaded");
              }
            });
          };
          
          logo.onerror = () => {
            // Download without logo if it fails
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const downloadLink = document.createElement("a");
                downloadLink.download = `qrcode-${qr.shortCode}.png`;
                downloadLink.href = url;
                downloadLink.click();
                URL.revokeObjectURL(url);
                toast.success("QR code downloaded");
              }
            });
          };
          
          logo.src = logoUrl;
        }
      } else {
        // Download without logo
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement("a");
            downloadLink.download = `qrcode-${qr.shortCode}.png`;
            downloadLink.href = url;
            downloadLink.click();
            URL.revokeObjectURL(url);
            toast.success("QR code downloaded");
          }
        });
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download QR code");
    }
  };

  const handleCopyShortLink = async (qr: QRCode, e: React.MouseEvent) => {
    e.stopPropagation();
    const shortLink = `${window.location.origin}/r/${qr.shortCode}`;
    try {
      await navigator.clipboard.writeText(shortLink);
      setCopiedId(qr.id);
      toast.success("Short link copied!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  // Show loading state while checking authentication
  if (isPending || !session?.user) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>;
  }

  if (isLoading) return <div className="p-10 text-center">Loading project...</div>;
  if (!project) return <div className="p-10 text-center">Project not found</div>;

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <Link href="/projects" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-2">
              <ArrowLeft className="h-3 w-3" /> Back to Projects
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">{project.description}</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingQr(null)}>
                <Plus className="mr-2 h-4 w-4" /> Create QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden">
               <div className="p-6 h-full">
                  <QRCodeWizard 
                      projectId={projectId} 
                      initialData={editingQr}
                      onSave={() => {
                        setIsCreateOpen(false);
                        fetchProjectData();
                        setEditingQr(null);
                      }}
                      onCancel={() => {
                        setIsCreateOpen(false);
                        setEditingQr(null);
                      }}
                  />
               </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* List of QR Codes */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="font-semibold text-lg px-1">QR Codes ({qrCodes.length})</h2>
            
            {qrCodes.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <p>No QR codes yet.</p>
                <Button variant="link" onClick={() => setIsCreateOpen(true)}>Create your first one</Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {qrCodes.map((qr) => (
                  <Card 
                    key={qr.id} 
                    className={`cursor-pointer transition-all hover:border-primary/50 ${selectedQrId === qr.id ? 'border-primary ring-1 ring-primary/20 shadow-md' : ''}`}
                    onClick={() => fetchAnalytics(qr.id)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-white rounded-md border flex items-center justify-center shrink-0">
                          <QrIcon className="h-6 w-6 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{qr.shortCode}</h3>
                          <p className="text-xs text-muted-foreground truncate">{qr.destinationUrl}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setEditingQr(qr);
                              setIsCreateOpen(true);
                            }}>
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadQr(qr);
                            }}>
                              <Download className="mr-2 h-3 w-3" /> Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`/r/${qr.shortCode}`, '_blank')}>
                              <ExternalLink className="mr-2 h-3 w-3" /> Test Link
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                               e.stopPropagation();
                               handleDeleteQr(qr.id);
                            }}>
                              <Trash2 className="mr-2 h-3 w-3" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Short Link Display */}
                      <div className="bg-muted/50 rounded-md p-2 flex items-center gap-2 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Short Link</p>
                          <p className="text-xs font-mono truncate text-foreground">
                            {typeof window !== 'undefined' && `${window.location.origin}/r/${qr.shortCode}`}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 shrink-0"
                          onClick={(e) => handleCopyShortLink(qr, e)}
                        >
                          {copiedId === qr.id ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Analytics / Details Panel */}
          <div className="lg:col-span-2">
            {selectedQrId ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Analytics</h2>
                  <div className="flex items-center gap-2">
                     <Button variant="outline" size="sm" onClick={() => {
                         // find qr data
                         const qr = qrCodes.find(q => q.id === selectedQrId);
                         if (qr) {
                             setEditingQr(qr);
                             setIsCreateOpen(true);
                         }
                     }}>Edit QR Code</Button>
                  </div>
                </div>

                <AnalyticsDashboard data={analyticsData} loading={isAnalyticsLoading} />

              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                <BarChart2 className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">Select a QR code to view analytics</p>
                <p className="text-sm">Click on any card from the list on the left.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}