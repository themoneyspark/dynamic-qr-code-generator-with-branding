"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Download, Save, Link as LinkIcon } from "lucide-react";

interface QRCodeGeneratorProps {
  projectId?: number;
  initialData?: any;
  onSave?: () => void;
}

export default function QRCodeGenerator({ projectId, initialData, onSave }: QRCodeGeneratorProps) {
  const [destinationUrl, setDestinationUrl] = useState(initialData?.destinationUrl || "");
  const [shortCode, setShortCode] = useState(initialData?.shortCode || "");
  
  // UTM Params
  const [utmSource, setUtmSource] = useState(initialData?.utmParams?.source || "");
  const [utmMedium, setUtmMedium] = useState(initialData?.utmParams?.medium || "");
  const [utmCampaign, setUtmCampaign] = useState(initialData?.utmParams?.campaign || "");

  // Customization
  const [fgColor, setFgColor] = useState(initialData?.customizationConfig?.color || "#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [size, setSize] = useState(initialData?.customizationConfig?.size || 256);
  const [logoUrl, setLogoUrl] = useState(initialData?.customizationConfig?.logo || "");
  const [includeLogo, setIncludeLogo] = useState(!!initialData?.customizationConfig?.logo);

  const [isSaving, setIsSaving] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");

  // Generate a random short code if not provided
  useEffect(() => {
    if (!shortCode && !initialData) {
      setShortCode(Math.random().toString(36).substring(2, 8));
    }
  }, []);

  // Compute final URL for preview (this would normally be the redirect URL, but for QR preview we might want to show the direct link or the redirect link)
  // In a dynamic QR code system, the QR code ENCODES the redirect URL (e.g., domain.com/r/shortcode).
  // The destination URL is where the user eventually lands.
  const redirectBaseUrl = typeof window !== "undefined" ? `${window.location.origin}/r/` : "https://example.com/r/";
  const qrCodeValue = `${redirectBaseUrl}${shortCode}`;

  const handleSave = async () => {
    if (!projectId) {
      toast.error("Project ID is missing");
      return;
    }
    if (!destinationUrl) {
      toast.error("Destination URL is required");
      return;
    }
    if (!shortCode) {
      toast.error("Short code is required");
      return;
    }

    setIsSaving(true);

    const payload = {
      projectId,
      destinationUrl,
      shortCode,
      customizationConfig: {
        color: fgColor,
        logo: includeLogo ? logoUrl : null,
        size,
      },
      utmParams: {
        source: utmSource,
        medium: utmMedium,
        campaign: utmCampaign,
      },
    };

    try {
      const url = initialData ? `/api/qr-codes?id=${initialData.id}` : "/api/qr-codes";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save QR code");
      }

      toast.success(initialData ? "QR Code updated!" : "QR Code created!");
      if (onSave) onSave();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-code-canvas") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `qrcode-${shortCode}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } else {
        // Fallback for SVG if we aren't using canvas directly or need to convert SVG to image
        const svg = document.querySelector("#qr-code-wrapper svg") as SVGElement;
        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();
            img.onload = () => {
                canvas.width = size;
                canvas.height = size;
                ctx?.drawImage(img, 0, 0);
                const pngFile = canvas.toDataURL("image/png");
                const downloadLink = document.createElement("a");
                downloadLink.download = `qrcode-${shortCode}.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
            };
            // Safer Base64 encoding that handles UTF-8 characters correctly
            img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
        }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Set up your destination and tracking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Destination URL</Label>
              <div className="flex">
                <div className="bg-muted px-3 py-2 rounded-l-md border border-r-0 flex items-center text-muted-foreground">
                   <LinkIcon className="h-4 w-4" />
                </div>
                <Input 
                  id="url" 
                  placeholder="https://example.com/my-page" 
                  value={destinationUrl} 
                  onChange={(e) => setDestinationUrl(e.target.value)} 
                  className="rounded-l-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortCode">Short Code (Slug)</Label>
              <div className="flex items-center gap-2">
                 <span className="text-sm text-muted-foreground">{redirectBaseUrl}</span>
                 <Input 
                    id="shortCode" 
                    value={shortCode} 
                    onChange={(e) => setShortCode(e.target.value)} 
                    className="w-40"
                 />
                 <Button variant="ghost" size="sm" onClick={() => setShortCode(Math.random().toString(36).substring(2, 8))}>
                    Generate
                 </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UTM Tracking</CardTitle>
            <CardDescription>Add parameters to track scan sources in Google Analytics.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="utm_source">Source</Label>
              <Input 
                id="utm_source" 
                placeholder="e.g. flyer, billboard" 
                value={utmSource} 
                onChange={(e) => setUtmSource(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="utm_medium">Medium</Label>
              <Input 
                id="utm_medium" 
                placeholder="e.g. qr_code, print" 
                value={utmMedium} 
                onChange={(e) => setUtmMedium(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="utm_campaign">Campaign</Label>
              <Input 
                id="utm_campaign" 
                placeholder="e.g. summer_sale" 
                value={utmCampaign} 
                onChange={(e) => setUtmCampaign(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Design</CardTitle>
            <CardDescription>Customize the look of your QR code.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Foreground Color</Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="color" 
                            value={fgColor} 
                            onChange={(e) => setFgColor(e.target.value)} 
                            className="h-10 w-16 p-1 cursor-pointer"
                        />
                        <Input 
                            value={fgColor} 
                            onChange={(e) => setFgColor(e.target.value)} 
                            className="w-28"
                        />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label>Size (px)</Label>
                    <div className="flex items-center gap-4">
                        <Slider 
                            value={[size]} 
                            min={128} 
                            max={512} 
                            step={16} 
                            onValueChange={(vals) => setSize(vals[0])} 
                            className="flex-1"
                        />
                        <span className="text-sm w-12">{size}px</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 p-4 border rounded-md">
                <Switch 
                    id="include-logo" 
                    checked={includeLogo}
                    onCheckedChange={setIncludeLogo}
                />
                <div className="flex-1">
                    <Label htmlFor="include-logo" className="text-base">Include Logo</Label>
                    <p className="text-sm text-muted-foreground">Add a center logo to your QR code</p>
                </div>
            </div>

            {includeLogo && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Logo URL</Label>
                    <Input 
                        placeholder="https://example.com/logo.png" 
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Provide a direct link to a square PNG or JPEG image.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-8 space-y-6">
            <Card className="overflow-hidden border-primary/20 shadow-lg">
                <CardHeader className="bg-muted/30 pb-4">
                    <CardTitle className="text-center">Preview</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8 bg-white">
                    <div id="qr-code-wrapper" className="p-4 bg-white rounded-lg shadow-sm border">
                        <QRCodeSVG
                            value={qrCodeValue}
                            size={size}
                            fgColor={fgColor}
                            bgColor={bgColor}
                            level="H"
                            imageSettings={includeLogo && logoUrl ? {
                                src: logoUrl,
                                x: undefined,
                                y: undefined,
                                height: size * 0.2,
                                width: size * 0.2,
                                excavate: true,
                            } : undefined}
                        />
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground text-center break-all">
                        Redirects to:<br/>
                        <span className="font-mono text-xs text-foreground">{destinationUrl || "..."}</span>
                    </p>
                </CardContent>
                <div className="p-4 bg-muted/30 flex flex-col gap-3">
                    <Button onClick={handleSave} disabled={isSaving} className="w-full">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? "Update QR Code" : "Create QR Code"}
                    </Button>
                    <Button variant="outline" onClick={downloadQRCode} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download PNG
                    </Button>
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
}