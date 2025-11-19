import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { qrCodes, scans } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { userAgent } from 'next/server';

// Helper function to get client IP address
function getClientIp(request: NextRequest): string | null {
  // Try various headers in order of preference
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return request.ip || null;
}

// Helper function to fetch location data from ipstack
async function getLocationFromIp(ipAddress: string) {
  try {
    const apiKey = process.env.IPSTACK_API_KEY;
    if (!apiKey) {
      console.warn('IPSTACK_API_KEY not configured');
      return null;
    }

    const response = await fetch(
      `http://api.ipstack.com/${ipAddress}?access_key=${apiKey}`,
      { 
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    );

    if (!response.ok) {
      console.error('ipstack API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Check for ipstack errors
    if (data.error) {
      console.error('ipstack error:', data.error);
      return null;
    }

    return {
      country: data.country_name || null,
      city: data.city || null,
      region: data.region_name || null,
      latitude: data.latitude ? String(data.latitude) : null,
      longitude: data.longitude ? String(data.longitude) : null,
      timezone: data.time_zone?.id || null,
      isp: data.connection?.isp || null,
    };
  } catch (error) {
    console.error('Error fetching location from ipstack:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return new NextResponse('Invalid code', { status: 400 });
    }

    // 1. Lookup QR Code
    const qrCode = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.shortCode, code))
      .limit(1);

    if (qrCode.length === 0) {
      return new NextResponse('QR Code not found', { status: 404 });
    }

    const targetQr = qrCode[0];

    // 2. Get client IP and location data
    const ua = userAgent(request);
    const referrer = request.headers.get('referer') || null;
    const clientIp = getClientIp(request);
    
    // Fetch location data from ipstack
    let locationData = null;
    if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
      locationData = await getLocationFromIp(clientIp);
    }

    // 3. Log Scan with IP tracking data
    await db.insert(scans).values({
      qrCodeId: targetQr.id,
      scannedAt: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      referrer: referrer,
      ipAddress: clientIp,
      country: locationData?.country || request.geo?.country || null,
      city: locationData?.city || request.geo?.city || null,
      region: locationData?.region || null,
      latitude: locationData?.latitude || null,
      longitude: locationData?.longitude || null,
      timezone: locationData?.timezone || null,
      isp: locationData?.isp || null,
      deviceType: ua.device.type || (ua.isBot ? 'bot' : 'desktop'),
      browser: ua.browser.name || null,
      os: ua.os.name || null,
    });

    // 4. Construct Destination URL with UTM params
    let finalUrl = targetQr.destinationUrl;
    
    if (targetQr.utmParams) {
      const utm = targetQr.utmParams as Record<string, string>;
      const urlObj = new URL(finalUrl);
      
      if (utm.source) urlObj.searchParams.set('utm_source', utm.source);
      if (utm.medium) urlObj.searchParams.set('utm_medium', utm.medium);
      if (utm.campaign) urlObj.searchParams.set('utm_campaign', utm.campaign);
      if (utm.term) urlObj.searchParams.set('utm_term', utm.term);
      if (utm.content) urlObj.searchParams.set('utm_content', utm.content);
      
      finalUrl = urlObj.toString();
    }

    // 5. Redirect
    return NextResponse.redirect(finalUrl);

  } catch (error) {
    console.error('Redirect error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}