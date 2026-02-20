'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TechnicalIndicatorsProps {
    ticker: string;
    data: {
        rsi: number | null;
        macd: { macd: number; signal: number; histogram: number } | null;
        sma20: number | null;
        sma50: number | null;
        sma200: number | null;
        bollingerBands: { upper: number; lower: number; middle: number } | null;
        adx?: number | null;
        volumeRatio?: number | null;
    };
    currentPrice?: number;
}

export function TechnicalIndicators({ ticker, data, currentPrice }: TechnicalIndicatorsProps) {
    const getRSIStatus = (rsi: number) => {
        if (rsi < 30) return { label: 'Oversold', color: 'text-green-500', bgColor: 'bg-green-500/10', signal: 'BUY' };
        if (rsi < 40) return { label: 'Slightly Oversold', color: 'text-green-400', bgColor: 'bg-green-500/5', signal: 'NEUTRAL' };
        if (rsi > 70) return { label: 'Overbought', color: 'text-red-500', bgColor: 'bg-red-500/10', signal: 'SELL' };
        if (rsi > 60) return { label: 'Slightly Overbought', color: 'text-orange-400', bgColor: 'bg-orange-500/5', signal: 'NEUTRAL' };
        return { label: 'Neutral', color: 'text-gray-400', bgColor: 'bg-gray-500/5', signal: 'NEUTRAL' };
    };

    const getMACDSignal = (macd: { macd: number; signal: number; histogram: number }) => {
        if (macd.histogram > 0 && macd.macd > macd.signal) {
            return { label: 'Bullish', color: 'text-green-500', icon: TrendingUp };
        }
        if (macd.histogram < 0 && macd.macd < macd.signal) {
            return { label: 'Bearish', color: 'text-red-500', icon: TrendingDown };
        }
        return { label: 'Neutral', color: 'text-gray-400', icon: Minus };
    };

    const getPriceVsMA = (price: number, ma: number) => {
        const diff = ((price - ma) / ma) * 100;
        if (diff > 0) {
            return { label: `Above (+${diff.toFixed(2)}%)`, color: 'text-green-500' };
        }
        return { label: `Below (${diff.toFixed(2)}%)`, color: 'text-red-500' };
    };

    const rsiStatus = data.rsi ? getRSIStatus(data.rsi) : null;
    const macdSignal = data.macd ? getMACDSignal(data.macd) : null;

    return (
        <Card className="glassmorphism">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Technical Indicators</span>
                    {rsiStatus && (
                        <Badge variant="outline" className={`${rsiStatus.color} border-current`}>
                            RSI: {rsiStatus.signal}
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>Key technical analysis metrics for {ticker}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {/* RSI */}
                    <div className={`p-4 rounded-lg ${rsiStatus?.bgColor || 'bg-muted/50'}`}>
                        <p className="text-sm text-muted-foreground mb-1">RSI (14)</p>
                        <p className={`text-3xl font-bold ${rsiStatus?.color || ''}`}>
                            {data.rsi?.toFixed(2) || 'N/A'}
                        </p>
                        {rsiStatus && (
                            <p className={`text-sm mt-1 ${rsiStatus.color}`}>
                                {rsiStatus.label}
                            </p>
                        )}
                        {data.rsi && (
                            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${data.rsi < 30 ? 'bg-green-500' :
                                            data.rsi > 70 ? 'bg-red-500' :
                                                'bg-gray-400'
                                        }`}
                                    style={{ width: `${data.rsi}%` }}
                                />
                            </div>
                        )}
                    </div>

                    {/* MACD */}
                    <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground mb-1">MACD</p>
                        <p className="text-2xl font-bold">
                            {data.macd?.macd.toFixed(2) || 'N/A'}
                        </p>
                        {data.macd && macdSignal && (
                            <>
                                <div className="flex items-center gap-1 mt-1">
                                    <macdSignal.icon className={`h-4 w-4 ${macdSignal.color}`} />
                                    <span className={`text-sm ${macdSignal.color}`}>{macdSignal.label}</span>
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                    <p>Signal: {data.macd.signal.toFixed(2)}</p>
                                    <p>Histogram: {data.macd.histogram.toFixed(4)}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ADX */}
                    {data.adx !== undefined && (
                        <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground mb-1">ADX (Trend Strength)</p>
                            <p className="text-2xl font-bold">
                                {data.adx?.toFixed(2) || 'N/A'}
                            </p>
                            {data.adx && (
                                <p className={`text-sm mt-1 ${data.adx > 25 ? 'text-green-500' : 'text-gray-400'
                                    }`}>
                                    {data.adx > 50 ? 'Very Strong Trend' :
                                        data.adx > 25 ? 'Strong Trend' :
                                            'Weak/No Trend'}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Moving Averages */}
                    <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground mb-2">Moving Averages</p>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm">SMA 20</span>
                                <span className="font-semibold">
                                    {data.sma20 ? formatCurrency(data.sma20, ticker) : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm">SMA 50</span>
                                <span className="font-semibold">
                                    {data.sma50 ? formatCurrency(data.sma50, ticker) : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm">SMA 200</span>
                                <span className="font-semibold">
                                    {data.sma200 ? formatCurrency(data.sma200, ticker) : 'N/A'}
                                </span>
                            </div>
                        </div>
                        {currentPrice && data.sma50 && (
                            <p className={`text-xs mt-2 ${getPriceVsMA(currentPrice, data.sma50).color}`}>
                                Price vs SMA50: {getPriceVsMA(currentPrice, data.sma50).label}
                            </p>
                        )}
                    </div>

                    {/* Bollinger Bands */}
                    {data.bollingerBands && (
                        <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground mb-2">Bollinger Bands</p>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-red-400">Upper</span>
                                    <span>{formatCurrency(data.bollingerBands.upper, ticker)}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                    <span className="text-blue-400">Middle</span>
                                    <span>{formatCurrency(data.bollingerBands.middle, ticker)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-green-400">Lower</span>
                                    <span>{formatCurrency(data.bollingerBands.lower, ticker)}</span>
                                </div>
                            </div>
                            {currentPrice && (
                                <p className={`text-xs mt-2 ${currentPrice > data.bollingerBands.upper ? 'text-red-400' :
                                        currentPrice < data.bollingerBands.lower ? 'text-green-400' :
                                            'text-gray-400'
                                    }`}>
                                    {currentPrice > data.bollingerBands.upper ? '⚠️ Above upper band (Overbought)' :
                                        currentPrice < data.bollingerBands.lower ? '⬆️ Below lower band (Oversold)' :
                                            'Within bands'}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Volume Ratio */}
                    {data.volumeRatio !== undefined && (
                        <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground mb-1">Volume Ratio</p>
                            <p className="text-2xl font-bold">
                                {data.volumeRatio?.toFixed(2) || 'N/A'}x
                            </p>
                            {data.volumeRatio && (
                                <p className={`text-sm mt-1 ${data.volumeRatio > 1.5 ? 'text-green-500' :
                                        data.volumeRatio < 0.5 ? 'text-red-400' :
                                            'text-gray-400'
                                    }`}>
                                    {data.volumeRatio > 1.5 ? 'High Volume' :
                                        data.volumeRatio > 1.0 ? 'Above Average' :
                                            data.volumeRatio > 0.5 ? 'Below Average' :
                                                'Low Volume'}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default TechnicalIndicators;
