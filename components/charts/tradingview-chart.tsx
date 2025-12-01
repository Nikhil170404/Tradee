'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

interface ChartData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingViewChartProps {
  data: ChartData[];
  height?: number;
  showVolume?: boolean;
  sma20?: Array<{ time: string | number; value: number }>;
  sma50?: Array<{ time: string | number; value: number }>;
  sma200?: Array<{ time: string | number; value: number }>;
}

export default function TradingViewChart({
  data,
  height = 500,
  showVolume = true,
  sma20,
  sma50,
  sma200,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      crosshair: {
        vertLine: {
          color: '#6b7280',
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          color: '#6b7280',
          labelBackgroundColor: '#3b82f6',
        },
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Convert timestamps to seconds for lightweight-charts
    const formattedData = data.map((d) => ({
      time: Math.floor(new Date(d.time).getTime() / 1000),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeries.setData(formattedData);

    // Add SMA lines
    if (sma20 && sma20.length > 0) {
      const sma20Series = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
        title: 'SMA 20',
      });
      const sma20Data = sma20
        .filter((d) => d.value !== null)
        .map((d) => ({
          time: Math.floor(new Date(d.time).getTime() / 1000),
          value: d.value,
        }));
      sma20Series.setData(sma20Data);
    }

    if (sma50 && sma50.length > 0) {
      const sma50Series = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
        title: 'SMA 50',
      });
      const sma50Data = sma50
        .filter((d) => d.value !== null)
        .map((d) => ({
          time: Math.floor(new Date(d.time).getTime() / 1000),
          value: d.value,
        }));
      sma50Series.setData(sma50Data);
    }

    if (sma200 && sma200.length > 0) {
      const sma200Series = chart.addLineSeries({
        color: '#8b5cf6',
        lineWidth: 2,
        title: 'SMA 200',
      });
      const sma200Data = sma200
        .filter((d) => d.value !== null)
        .map((d) => ({
          time: Math.floor(new Date(d.time).getTime() / 1000),
          value: d.value,
        }));
      sma200Series.setData(sma200Data);
    }

    // Add volume series
    if (showVolume && data.some((d) => d.volume)) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#6b7280',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      const volumeData = data
        .filter((d) => d.volume)
        .map((d) => ({
          time: Math.floor(new Date(d.time).getTime() / 1000),
          value: d.volume!,
          color: d.close >= d.open ? '#10b98180' : '#ef444480',
        }));

      volumeSeries.setData(volumeData);
    }

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height, showVolume, sma20, sma50, sma200]);

  return (
    <div className="relative w-full">
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
