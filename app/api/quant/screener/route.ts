import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get('force_refresh') === 'true';

    // Proxy to Python service
    const response = await fetch(`${PYTHON_SERVICE_URL}/screener/nifty50?force_refresh=${forceRefresh}`, {
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Python service responded with ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Screener Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screener data from Python service' },
      { status: 500 }
    );
  }
}
