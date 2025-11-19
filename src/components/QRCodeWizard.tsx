import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, ArrowRight, Check, Palette, Globe, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface QRCodeWizardProps {
  projectId?: number;
  initialData?: any;
  onSave?: () => void;
  onCancel?: () => void;
}

export default function QRCodeWizard({ projectId, initialData, onSave, onCancel }: QRCodeWizardProps) {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  // Data State
  const [formData, setFormData] = useState({
    destinationUrl: initialData?.destinationUrl || "",
    shortCode: initialData?.shortCode || "",
    utmSource: initialData?.utmParams?.source || "",
    utmMedium: initialData?.utmParams?.medium || "",
    utmCampaign: initialData?.utmParams?.campaign || "",
    fgColor: initialData?.customizationConfig?.color || "#000000",
    bgColor: "#ffffff",
    size: initialData?.customizationConfig?.size || 256,
    logoUrl: initialData?.customizationConfig?.logo || "",
    includeLogo: !!initialData?.customizationConfig?.logo,
  });

  // Generate random short code if missing
  useEffect(() => {
    if (!formData.shortCode && !initialData) {
      setFormData(prev => ({ ...prev, shortCode: Math.random().toString(36).substring(2, 8) }));
    }
  }, []);

  // Derived state
  const redirectBaseUrl = typeof window !== "undefined" ? `${window.location.origin}/r/` : "https://example.com/r/";
  const qrCodeValue = `${redirectBaseUrl}${formData.shortCode}`;

  const handleNext = () => {
    if (step === 1) {
        if (!formData.destinationUrl) {
            toast.error("Please enter a destination URL");
            return;
        }
        // Basic URL validation
        try {
            new URL(formData.destinationUrl);
        } catch (e) {
            toast.error("Please enter a valid URL (e.g., https://example.com)");
            return;
        }
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => setStep(prev => prev - 1);

  const handleSave = async () => {
    if (!projectId) return;
    setIsSaving(true);

    const payload = {
      projectId,
      destinationUrl: formData.destinationUrl,
      shortCode: formData.shortCode,
      customizationConfig: {
        color: formData.fgColor,
        logo: formData.includeLogo ? formData.logoUrl : null,
        size: formData.size,
      },
      utmParams: {
        source: formData.utmSource,
        medium: formData.utmMedium,
        campaign: formData.utmCampaign,
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

  // Step Indicators
  const steps = [
    { number: 1, title: "Content", icon: Globe },
    { number: 2, title: "Design", icon: Palette },
    { number: 3, title: "Review", icon: Check },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Steps Header */}
      <div className="flex items-center justify-center mb-8 px-4 pt-2">
        {steps.map((s, index) => (
          <React.Fragment key={s.number}>
            <div className="flex flex-col items-center gap-2 z-10">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                step >= s.number 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "bg-background border-muted-foreground/30 text-muted-foreground"
              )}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-xs font-medium transition-colors duration-300",
                step >= s.number ? "text-primary" : "text-muted-foreground"
              )}>{s.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "h-[2px] w-16 -mt-6 -mx-2 transition-colors duration-300",
                step > s.number ? "bg-primary" : "bg-muted"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-1">
        {step === 1 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-base">Destination URL <span className="text-red-500">*</span></Label>
                <div className="flex">
                  <div className="bg-muted px-3 py-2 rounded-l-md border border-r-0 flex items-center text-muted-foreground">
                     <Globe className="h-4 w-4" />
                  </div>
                  <Input 
                    id="url" 
                    placeholder="https://example.com/landing-page" 
                    value={formData.destinationUrl} 
                    onChange={(e) => setFormData({...formData, destinationUrl: e.target.value})} 
                    className="rounded-l-none h-11"
                    autoFocus
                  />
                </div>
                <p className="text-sm text-muted-foreground">Where should users go when they scan the QR code?</p>
              </div>

              <div className="space-y-2 pt-4">
                <Label htmlFor="shortCode">Short Code</Label>
                <div className="flex items-center gap-2">
                   <div className="bg-muted/50 px-3 py-2 rounded-md border text-muted-foreground text-sm truncate max-w-[200px]">
                      {redirectBaseUrl}
                   </div>
                   <Input 
                      id="shortCode" 
                      value={formData.shortCode} 
                      onChange={(e) => setFormData({...formData, shortCode: e.target.value})} 
                      className="w-32 font-mono"
                   />
                   <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, shortCode: Math.random().toString(36).substring(2, 8)})}>
                      <QrCode className="h-4 w-4" />
                   </Button>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t mt-6">
                <h3 className="font-medium flex items-center gap-2">
                    UTM Tracking (Optional)
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Analytics</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="utm_source">Source</Label>
                        <Input 
                            id="utm_source" 
                            placeholder="google, flyer, newsletter" 
                            value={formData.utmSource} 
                            onChange={(e) => setFormData({...formData, utmSource: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="utm_medium">Medium</Label>
                        <Input 
                            id="utm_medium" 
                            placeholder="cpc, banner, email" 
                            value={formData.utmMedium} 
                            onChange={(e) => setFormData({...formData, utmMedium: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="utm_campaign">Campaign Name</Label>
                        <Input 
                            id="utm_campaign" 
                            placeholder="summer_sale_2024" 
                            value={formData.utmCampaign} 
                            onChange={(e) => setFormData({...formData, utmCampaign: e.target.value})}
                        />
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-6">
                <div className="space-y-4">
                    <Label className="text-base">Colors</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Foreground</Label>
                            <div className="flex items-center gap-2">
                                <div className="relative overflow-hidden w-10 h-10 rounded-md border shadow-sm">
                                    <Input 
                                        type="color" 
                                        value={formData.fgColor} 
                                        onChange={(e) => setFormData({...formData, fgColor: e.target.value})} 
                                        className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer"
                                    />
                                </div>
                                <Input 
                                    value={formData.fgColor} 
                                    onChange={(e) => setFormData({...formData, fgColor: e.target.value})} 
                                    className="font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                    <Label className="text-base">Logo Overlay</Label>
                    <div className="flex items-center gap-4 mb-4">
                        <Switch 
                            id="include-logo" 
                            checked={formData.includeLogo}
                            onCheckedChange={(checked) => setFormData({...formData, includeLogo: checked})}
                        />
                        <Label htmlFor="include-logo" className="font-normal">Add a logo to the center</Label>
                    </div>
                    
                    {formData.includeLogo && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label>Logo URL</Label>
                            <Input 
                                placeholder="https://example.com/logo.png" 
                                value={formData.logoUrl}
                                onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-4 border-t pt-6">
                    <Label className="text-base">Size & Resolution</Label>
                    <div className="flex items-center gap-4">
                        <Slider 
                            value={[formData.size]} 
                            min={128} 
                            max={1024} 
                            step={32} 
                            onValueChange={(vals) => setFormData({...formData, size: vals[0]})} 
                            className="flex-1"
                        />
                        <span className="text-sm font-mono w-16 text-right">{formData.size}px</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-muted/20 rounded-xl border-2 border-dashed p-8">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <QRCodeSVG
                        value={qrCodeValue}
                        size={256} // Fixed preview size
                        fgColor={formData.fgColor}
                        bgColor={formData.bgColor}
                        level="H"
                        imageSettings={formData.includeLogo && formData.logoUrl ? {
                            src: formData.logoUrl,
                            x: undefined,
                            y: undefined,
                            height: 50,
                            width: 50,
                            excavate: true,
                        } : undefined}
                    />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">Live Preview</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
             <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Ready to go!</h3>
                <p className="text-muted-foreground">Review your QR code before saving.</p>
             </div>

             <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-primary/10">
                <QRCodeSVG
                    id="final-qr-preview"
                    value={qrCodeValue}
                    size={formData.size > 300 ? 300 : formData.size} // Cap preview size
                    fgColor={formData.fgColor}
                    bgColor={formData.bgColor}
                    level="H"
                    imageSettings={formData.includeLogo && formData.logoUrl ? {
                        src: formData.logoUrl,
                        x: undefined,
                        y: undefined,
                        height: (formData.size > 300 ? 300 : formData.size) * 0.2,
                        width: (formData.size > 300 ? 300 : formData.size) * 0.2,
                        excavate: true,
                    } : undefined}
                />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg text-sm">
                <div className="bg-muted/30 p-4 rounded-lg border">
                    <span className="text-muted-foreground block mb-1">Destination</span>
                    <a href={formData.destinationUrl} target="_blank" rel="noreferrer" className="font-medium hover:underline truncate block">
                        {formData.destinationUrl}
                    </a>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg border">
                    <span className="text-muted-foreground block mb-1">Short Link</span>
                    <span className="font-mono">{redirectBaseUrl}{formData.shortCode}</span>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-8 pt-4 border-t flex justify-between items-center">
        <Button variant="ghost" onClick={step === 1 ? onCancel : handleBack} disabled={isSaving}>
            {step === 1 ? "Cancel" : "Back"}
        </Button>
        
        <div className="flex items-center gap-2">
            {step < 3 ? (
                <Button onClick={handleNext}>
                    Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            ) : (
                <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Project
                </Button>
            )}
        </div>
      </div>
    </div>
  );
}