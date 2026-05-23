/**
 * Session Cookie API
 * 
 * Sets an HttpOnly cookie that middleware can read for route protection.
 * This bridges client-side Zustand storage to server-side middleware auth.
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { accessToken, isAuthenticated } = await request.json();
    
    const response = NextResponse.json({ success: true });
    
    // Set session cookie (HttpOnly for security)
    response.cookies.set('complyos-session', JSON.stringify({
      authenticated: isAuthenticated,
      timestamp: Date.now(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('complyos-session');
  return response;
}
