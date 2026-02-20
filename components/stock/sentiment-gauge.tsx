'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SentimentGaugeProps {
    score: number; // 0-100
    label: string;
    color: string;
    articleCount?: number;
    news?: Array<{
        title: string;
        sentiment: string;
        sentiment_score: number;
    }>;
}

export function SentimentGauge({ score, label, color, articleCount, news }: SentimentGaugeProps) {
    // Convert score to rotation angle for needle (-90 to 90 degrees)
    const rotation = ((score - 50) / 50) * 90;

    const getGradientClass = (score: number) => {
        if (score >= 70) return 'from-green-500 to-emerald-600';
        if (score >= 55) return 'from-green-400 to-green-500';
        if (score >= 45) return 'from-gray-400 to-gray-500';
        if (score >= 30) return 'from-orange-400 to-orange-500';
        return 'from-red-500 to-red-600';
    };

    const getSentimentEmoji = (score: number) => {
        if (score >= 70) return '🚀';
        if (score >= 55) return '📈';
        if (score >= 45) return '↔️';
        if (score >= 30) return '📉';
        return '🔻';
    };

    const getSentimentBadgeColor = (sentiment: string) => {
        if (sentiment.includes('Bullish') || sentiment === 'Positive') return 'bg-green-500/20 text-green-400 border-green-500/50';
        if (sentiment.includes('Bearish') || sentiment === 'Negative') return 'bg-red-500/20 text-red-400 border-red-500/50';
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    };

    return (
        <Card className="glassmorphism">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Market Sentiment</span>
                    <span className="text-2xl">{getSentimentEmoji(score)}</span>
                </CardTitle>
                {articleCount !== undefined && articleCount > 0 && (
                    <CardDescription>Based on {articleCount} recent news articles</CardDescription>
                )}
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center">
                    {/* Gauge */}
                    <div className="relative w-56 h-28 mb-4">
                        {/* Background arc */}
                        <svg className="w-full h-full" viewBox="0 0 200 100">
                            {/* Gradient background arc */}
                            <defs>
                                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#ef4444" />
                                    <stop offset="25%" stopColor="#f97316" />
                                    <stop offset="50%" stopColor="#6b7280" />
                                    <stop offset="75%" stopColor="#22c55e" />
                                    <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                            </defs>

                            {/* Arc background */}
                            <path
                                d="M 20 90 A 80 80 0 0 1 180 90"
                                fill="none"
                                stroke="url(#gaugeGradient)"
                                strokeWidth="12"
                                strokeLinecap="round"
                                opacity="0.3"
                            />

                            {/* Filled arc based on score */}
                            <path
                                d="M 20 90 A 80 80 0 0 1 180 90"
                                fill="none"
                                stroke="url(#gaugeGradient)"
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={`${(score / 100) * 251} 251`}
                                className="transition-all duration-1000"
                            />

                            {/* Scale markers */}
                            {[0, 25, 50, 75, 100].map((mark, i) => {
                                const angle = ((mark - 50) / 50) * 90 - 90;
                                const radian = (angle * Math.PI) / 180;
                                const x = 100 + 70 * Math.cos(radian);
                                const y = 90 + 70 * Math.sin(radian);
                                return (
                                    <text
                                        key={mark}
                                        x={x}
                                        y={y}
                                        textAnchor="middle"
                                        fontSize="10"
                                        fill="currentColor"
                                        opacity="0.5"
                                    >
                                        {mark}
                                    </text>
                                );
                            })}
                        </svg>

                        {/* Needle */}
                        <div
                            className="absolute bottom-0 left-1/2 origin-bottom transition-transform duration-1000"
                            style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
                        >
                            <div className="w-1 h-20 bg-gradient-to-t from-primary to-primary/50 rounded-full" />
                        </div>

                        {/* Center circle */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                            <div className="w-5 h-5 rounded-full bg-primary border-2 border-background shadow-lg" />
                        </div>
                    </div>

                    {/* Score Display */}
                    <div className="text-center mb-4">
                        <p className={`text-5xl font-bold bg-gradient-to-r ${getGradientClass(score)} bg-clip-text text-transparent`}>
                            {score}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">out of 100</p>
                    </div>

                    {/* Label */}
                    <Badge
                        variant="outline"
                        className={`text-lg px-4 py-2 ${getSentimentBadgeColor(label)}`}
                    >
                        {label}
                    </Badge>

                    {/* Scale Labels */}
                    <div className="flex justify-between w-full mt-6 text-xs text-muted-foreground px-4">
                        <span className="text-red-400">Very Bearish</span>
                        <span className="text-gray-400">Neutral</span>
                        <span className="text-green-400">Very Bullish</span>
                    </div>

                    {/* Recent News Preview */}
                    {news && news.length > 0 && (
                        <div className="w-full mt-6 pt-4 border-t border-border/50">
                            <p className="text-sm font-medium mb-3">Recent Sentiment</p>
                            <div className="space-y-2">
                                {news.slice(0, 3).map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start justify-between gap-2 p-2 bg-muted/30 rounded-lg"
                                    >
                                        <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                                            {item.title}
                                        </p>
                                        <Badge
                                            variant="outline"
                                            className={`text-xs shrink-0 ${getSentimentBadgeColor(item.sentiment)}`}
                                        >
                                            {item.sentiment_score > 0 ? '+' : ''}{(item.sentiment_score * 100).toFixed(0)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default SentimentGauge;
