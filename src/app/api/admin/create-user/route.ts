import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ 
        error: "Email is required and must be a string",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ 
        error: "Name is required and must be a string",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ 
        error: "Password is required and must be a string",
        code: "MISSING_PASSWORD" 
      }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    if (password.length < 6) {
      return NextResponse.json({ 
        error: "Password must be at least 6 characters long",
        code: "PASSWORD_TOO_SHORT" 
      }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return NextResponse.json({ 
        error: "Name cannot be empty",
        code: "INVALID_NAME" 
      }, { status: 400 });
    }

    const existingUser = await db.select()
      .from(user)
      .where(eq(user.email, trimmedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ 
        error: "User with this email already exists",
        code: "DUPLICATE_EMAIL" 
      }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = randomUUID();
    const accountId = randomUUID();
    const nowTimestamp = new Date();

    const newUser = await db.insert(user)
      .values({
        id: userId,
        name: trimmedName,
        email: trimmedEmail,
        emailVerified: false,
        image: null,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      })
      .returning();

    await db.insert(account)
      .values({
        id: accountId,
        accountId: trimmedEmail,
        providerId: "credential",
        userId: userId,
        password: hashedPassword,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      });

    const { ...userResponse } = newUser[0];
    
    return NextResponse.json(userResponse, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}