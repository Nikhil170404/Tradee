'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Briefcase, Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface PortfolioHolding {
  id: string;
  ticker: string;
  quantity: number;
  avgPrice: number;
  currentPrice?: number;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHolding, setNewHolding] = useState({
    ticker: '',
    quantity: '',
    avgPrice: '',
  });

  const handleAddHolding = () => {
    if (newHolding.ticker && newHolding.quantity && newHolding.avgPrice) {
      const holding: PortfolioHolding = {
        id: Date.now().toString(),
        ticker: newHolding.ticker.toUpperCase(),
        quantity: parseFloat(newHolding.quantity),
        avgPrice: parseFloat(newHolding.avgPrice),
      };
      setHoldings([...holdings, holding]);
      setNewHolding({ ticker: '', quantity: '', avgPrice: '' });
      setShowAddForm(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('protrader_holdings');
    if (saved) {
      try {
        setHoldings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse holdings', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('protrader_holdings', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    let isMounted = true;
    const fetchPrices = async () => {
      if (holdings.length === 0) return;
      const updatedHoldings = await Promise.all(
        holdings.map(async (h) => {
          try {
            const res = await fetch(`/api/market/quote?ticker=${h.ticker}`);
            if (res.ok) {
              const data = await res.json();
              if (data.price) {
                return { ...h, currentPrice: data.price };
              }
            }
          } catch (error) {
            console.error(`Error fetching price for ${h.ticker}`, error);
          }
          return h;
        })
      );

      const hasChanges = updatedHoldings.some((uh, idx) => uh.currentPrice !== holdings[idx].currentPrice);
      if (hasChanges && isMounted) {
        setHoldings(updatedHoldings);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [holdings.length]);

  const totalInvested = holdings.reduce(
    (sum, h) => sum + h.quantity * h.avgPrice,
    0
  );

  const currentValue = holdings.reduce(
    (sum, h) => sum + h.quantity * (h.currentPrice || h.avgPrice),
    0
  );

  const totalPnL = currentValue - totalInvested;
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Portfolio Tracker</h1>
            <p className="text-muted-foreground">
              Track your investments and monitor performance
            </p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Holding
          </Button>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glassmorphism">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Invested
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <p className="text-3xl font-bold">{formatCurrency(totalInvested)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <p className="text-3xl font-bold">{formatCurrency(currentValue)}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Live prices via API
              </p>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Gain/Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {totalPnL >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-positive" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
                <p className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-positive' : 'text-destructive'}`}>
                  {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                </p>
              </div>
              <p className={`text-sm mt-1 ${totalPnL >= 0 ? 'text-positive' : 'text-destructive'}`}>
                {totalPnL >= 0 ? '+' : ''}{formatPercentage(totalPnLPercent)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add Holding Form */}
        {showAddForm && (
          <Card className="glassmorphism border-primary">
            <CardHeader>
              <CardTitle>Add New Holding</CardTitle>
              <CardDescription>Enter details of your stock purchase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  placeholder="Ticker (e.g., AAPL)"
                  value={newHolding.ticker}
                  onChange={(e) =>
                    setNewHolding({ ...newHolding, ticker: e.target.value })
                  }
                />
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={newHolding.quantity}
                  onChange={(e) =>
                    setNewHolding({ ...newHolding, quantity: e.target.value })
                  }
                />
                <Input
                  type="number"
                  placeholder="Avg Price"
                  value={newHolding.avgPrice}
                  onChange={(e) =>
                    setNewHolding({ ...newHolding, avgPrice: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleAddHolding}>Add Holding</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Holdings List */}
        <Card className="glassmorphism">
          <CardHeader>
            <CardTitle>Your Holdings ({holdings.length})</CardTitle>
            <CardDescription>Manage your portfolio positions</CardDescription>
          </CardHeader>
          <CardContent>
            {holdings.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No holdings yet. Add your first investment to get started!
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Holding
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {holdings.map((holding) => (
                  <div
                    key={holding.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{holding.ticker}</h3>
                      <p className="text-sm text-muted-foreground">
                        {holding.quantity} shares @ {formatCurrency(holding.avgPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">
                        {formatCurrency(holding.quantity * (holding.currentPrice || holding.avgPrice))}
                      </p>
                      <div className={`text-sm font-medium flex items-center justify-end gap-1 ${((holding.currentPrice || holding.avgPrice) - holding.avgPrice) >= 0
                          ? 'text-positive'
                          : 'text-destructive'
                        }`}>
                        {((holding.currentPrice || holding.avgPrice) - holding.avgPrice) >= 0
                          ? <TrendingUp className="h-3 w-3" />
                          : <TrendingDown className="h-3 w-3" />}
                        {formatCurrency(Math.abs((holding.currentPrice || holding.avgPrice) - holding.avgPrice))} (
                        {formatPercentage((((holding.currentPrice || holding.avgPrice) - holding.avgPrice) / holding.avgPrice) * 100)}
                        )
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="glassmorphism bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-400">
              <strong>Note:</strong> This is a manual portfolio tracker. To get live prices and
              automatic P&L calculation, configure your API keys in the .env.local file and connect
              to Supabase for persistent storage.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
