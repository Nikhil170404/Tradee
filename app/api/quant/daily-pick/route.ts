import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Proxy to Python service - get Nifty 50 screened data
    // The "best_overall" category contains our daily picks
    const response = await fetch(`${PYTHON_SERVICE_URL}/screener/nifty50`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Python service responded with ${response.status}`);
    }

    const data = await response.json();

    // Extract the best stock signal
    // Could be from 'best_overall' list
    const bestStock = data.categories?.best_overall?.[0];

    if (!bestStock) {
      return NextResponse.json({ error: 'No pick available' }, { status: 404 });
    }

    return NextResponse.json({
      pick: bestStock,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Daily Pick Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily pick' },
      { status: 500 }
    );
  }
}
