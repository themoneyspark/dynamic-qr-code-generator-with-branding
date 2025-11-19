import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { scans, qrCodes } from '@/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const qrCodeId = searchParams.get('qrCodeId');
    const analytics = searchParams.get('analytics');

    // Analytics endpoint
    if (analytics === 'true' && qrCodeId) {
      const qrCodeIdInt = parseInt(qrCodeId);
      if (isNaN(qrCodeIdInt)) {
        return NextResponse.json({ 
          error: 'Valid QR Code ID is required for analytics',
          code: 'INVALID_QR_CODE_ID' 
        }, { status: 400 });
      }

      // Get all scans for the QR code
      const allScans = await db.select()
        .from(scans)
        .where(eq(scans.qrCodeId, qrCodeIdInt));

      // Total scans
      const totalScans = allScans.length;

      // Scans by country
      const scansByCountry = allScans.reduce((acc: Record<string, number>, scan) => {
        const country = scan.country || 'Unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {});

      // Scans by city
      const scansByCity = allScans.reduce((acc: Record<string, number>, scan) => {
        const city = scan.city || 'Unknown';
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {});

      // Scans by device type
      const scansByDeviceType = allScans.reduce((acc: Record<string, number>, scan) => {
        const deviceType = scan.deviceType || 'Unknown';
        acc[deviceType] = (acc[deviceType] || 0) + 1;
        return acc;
      }, {});

      // Scans by browser
      const scansByBrowser = allScans.reduce((acc: Record<string, number>, scan) => {
        const browser = scan.browser || 'Unknown';
        acc[browser] = (acc[browser] || 0) + 1;
        return acc;
      }, {});

      // Scans by OS
      const scansByOS = allScans.reduce((acc: Record<string, number>, scan) => {
        const os = scan.os || 'Unknown';
        acc[os] = (acc[os] || 0) + 1;
        return acc;
      }, {});

      // Scans by date (grouped by day)
      const scansByDate = allScans.reduce((acc: Record<string, number>, scan) => {
        const date = scan.scannedAt.split('T')[0]; // Get date part only
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      return NextResponse.json({
        qrCodeId: qrCodeIdInt,
        totalScans,
        scansByCountry,
        scansByCity,
        scansByDeviceType,
        scansByBrowser,
        scansByOS,
        scansByDate
      }, { status: 200 });
    }

    // Single scan by ID
    if (id) {
      const scanId = parseInt(id);
      if (isNaN(scanId)) {
        return NextResponse.json({ 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const scan = await db.select()
        .from(scans)
        .where(eq(scans.id, scanId))
        .limit(1);

      if (scan.length === 0) {
        return NextResponse.json({ 
          error: 'Scan not found',
          code: 'SCAN_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(scan[0], { status: 200 });
    }

    // List all scans with filters and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const country = searchParams.get('country');
    const deviceType = searchParams.get('deviceType');

    let query = db.select().from(scans);

    // Build where conditions
    const conditions = [];

    if (qrCodeId) {
      const qrCodeIdInt = parseInt(qrCodeId);
      if (!isNaN(qrCodeIdInt)) {
        conditions.push(eq(scans.qrCodeId, qrCodeIdInt));
      }
    }

    if (startDate) {
      conditions.push(gte(scans.scannedAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(scans.scannedAt, endDate));
    }

    if (country) {
      conditions.push(eq(scans.country, country));
    }

    if (deviceType) {
      conditions.push(eq(scans.deviceType, deviceType));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(scans.scannedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrCodeId, userAgent, referrer, country, city, deviceType } = body;

    // Validate required fields
    if (!qrCodeId) {
      return NextResponse.json({ 
        error: 'QR Code ID is required',
        code: 'MISSING_QR_CODE_ID' 
      }, { status: 400 });
    }

    const qrCodeIdInt = parseInt(qrCodeId);
    if (isNaN(qrCodeIdInt)) {
      return NextResponse.json({ 
        error: 'QR Code ID must be a valid integer',
        code: 'INVALID_QR_CODE_ID' 
      }, { status: 400 });
    }

    // Verify QR code exists
    const qrCode = await db.select()
      .from(qrCodes)
      .where(eq(qrCodes.id, qrCodeIdInt))
      .limit(1);

    if (qrCode.length === 0) {
      return NextResponse.json({ 
        error: 'QR Code not found',
        code: 'QR_CODE_NOT_FOUND' 
      }, { status: 400 });
    }

    // Create new scan
    const newScan = await db.insert(scans)
      .values({
        qrCodeId: qrCodeIdInt,
        scannedAt: new Date().toISOString(),
        userAgent: userAgent?.trim() || null,
        referrer: referrer?.trim() || null,
        country: country?.trim() || null,
        city: city?.trim() || null,
        deviceType: deviceType?.trim() || null
      })
      .returning();

    return NextResponse.json(newScan[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const scanId = parseInt(id);

    // Check if scan exists
    const existingScan = await db.select()
      .from(scans)
      .where(eq(scans.id, scanId))
      .limit(1);

    if (existingScan.length === 0) {
      return NextResponse.json({ 
        error: 'Scan not found',
        code: 'SCAN_NOT_FOUND' 
      }, { status: 404 });
    }

    // Delete the scan
    const deleted = await db.delete(scans)
      .where(eq(scans.id, scanId))
      .returning();

    return NextResponse.json({ 
      message: 'Scan deleted successfully',
      scan: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}