import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { qrCodes, projects } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const shortCode = searchParams.get('shortCode');
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Single record by ID
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const record = await db
        .select()
        .from(qrCodes)
        .where(eq(qrCodes.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json(
          { error: 'QR code not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // Single record by shortCode
    if (shortCode) {
      const record = await db
        .select()
        .from(qrCodes)
        .where(eq(qrCodes.shortCode, shortCode))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json(
          { error: 'QR code not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List with filters
    let query = db.select().from(qrCodes);

    const conditions = [];

    // Filter by projectId
    if (projectId) {
      if (isNaN(parseInt(projectId))) {
        return NextResponse.json(
          { error: 'Valid project ID is required', code: 'INVALID_PROJECT_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(qrCodes.projectId, parseInt(projectId)));
    }

    // Search by shortCode or destinationUrl
    if (search) {
      conditions.push(
        or(
          like(qrCodes.shortCode, `%${search}%`),
          like(qrCodes.destinationUrl, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(qrCodes.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, destinationUrl, shortCode, customizationConfig, utmParams } = body;

    // Validate required fields
    if (!projectId || isNaN(parseInt(projectId))) {
      return NextResponse.json(
        { error: 'Valid project ID is required', code: 'MISSING_PROJECT_ID' },
        { status: 400 }
      );
    }

    if (!destinationUrl || typeof destinationUrl !== 'string' || destinationUrl.trim() === '') {
      return NextResponse.json(
        { error: 'Destination URL is required and must be non-empty', code: 'MISSING_DESTINATION_URL' },
        { status: 400 }
      );
    }

    if (!shortCode || typeof shortCode !== 'string' || shortCode.trim() === '') {
      return NextResponse.json(
        { error: 'Short code is required and must be non-empty', code: 'MISSING_SHORT_CODE' },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, parseInt(projectId)))
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Check for duplicate shortCode
    const existingCode = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.shortCode, shortCode.trim()))
      .limit(1);

    if (existingCode.length > 0) {
      return NextResponse.json(
        { error: 'Short code already exists', code: 'DUPLICATE_SHORT_CODE' },
        { status: 409 }
      );
    }

    // Create new QR code
    const newQrCode = await db
      .insert(qrCodes)
      .values({
        projectId: parseInt(projectId),
        destinationUrl: destinationUrl.trim(),
        shortCode: shortCode.trim(),
        customizationConfig: customizationConfig || null,
        utmParams: utmParams || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newQrCode[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existing = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'QR code not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { destinationUrl, customizationConfig, utmParams } = body;

    // Validate destinationUrl if provided
    if (destinationUrl !== undefined) {
      if (typeof destinationUrl !== 'string' || destinationUrl.trim() === '') {
        return NextResponse.json(
          { error: 'Destination URL must be non-empty if provided', code: 'INVALID_DESTINATION_URL' },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: any = {};
    
    if (destinationUrl !== undefined) {
      updates.destinationUrl = destinationUrl.trim();
    }
    
    if (customizationConfig !== undefined) {
      updates.customizationConfig = customizationConfig;
    }
    
    if (utmParams !== undefined) {
      updates.utmParams = utmParams;
    }

    // Perform update
    const updated = await db
      .update(qrCodes)
      .set(updates)
      .where(eq(qrCodes.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existing = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'QR code not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete the record
    const deleted = await db
      .delete(qrCodes)
      .where(eq(qrCodes.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'QR code deleted successfully',
        deletedRecord: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}