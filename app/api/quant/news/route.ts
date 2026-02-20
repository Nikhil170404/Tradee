import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const type = searchParams.get('type');
        const ticker = searchParams.get('ticker') || 'RELIANCE.NS'; // Default to a major stock

        let endpoint = `/sentiment/news/${ticker}`;

        if (type === 'general') {
            endpoint = '/sentiment/news/general';
        }

        // Proxy to Python service
        const response = await fetch(`${PYTHON_SERVICE_URL}${endpoint}`, {
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            throw new Error(`Python service responded with ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('News Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch news' },
            { status: 500 }
        );
    }
}
