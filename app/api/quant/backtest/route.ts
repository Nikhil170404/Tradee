import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Backtesting can take time

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ticker, startDate, endDate, initialCapital } = body;

        // Validate inputs
        if (!ticker || !startDate || !endDate) {
            return NextResponse.json(
                { error: 'Missing required fields: ticker, startDate, endDate' },
                { status: 400 }
            );
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return NextResponse.json(
                { error: 'Dates must be in YYYY-MM-DD format' },
                { status: 400 }
            );
        }

        // Validate capital
        const capital = initialCapital || 100000;
        if (capital < 1000 || capital > 100000000) {
            return NextResponse.json(
                { error: 'Capital must be between 1,000 and 100,000,000' },
                { status: 400 }
            );
        }

        const response = await fetch(
            `${PYTHON_SERVICE_URL}/backtest?ticker=${encodeURIComponent(ticker)}&start_date=${startDate}&end_date=${endDate}&initial_capital=${capital}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Backtest failed' }));
            throw new Error(error.detail || 'Backtest failed');
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Backtest Proxy Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to run backtest' },
            { status: 500 }
        );
    }
}

// GET endpoint for simple testing
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const initialCapital = searchParams.get('initialCapital');

    if (!ticker || !startDate || !endDate) {
        return NextResponse.json(
            { error: 'Missing required params: ticker, startDate, endDate' },
            { status: 400 }
        );
    }

    // Forward to POST handler
    const mockRequest = {
        json: async () => ({
            ticker,
            startDate,
            endDate,
            initialCapital: initialCapital ? parseFloat(initialCapital) : 100000,
        }),
    } as NextRequest;

    return POST(mockRequest);
}
