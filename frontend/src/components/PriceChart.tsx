import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { Trade } from '../types/order';
import { formatPrice, formatTimeWithMs, formatQuantity } from '../utils/formatters';

interface PriceChartProps {
  symbol: string;
  trades: Trade[];
  lastPrice?: number;
  isLoading?: boolean;
  error?: string | null;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  symbol,
  trades,
  lastPrice,
  isLoading = false,
  error = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [filterCount, setFilterCount] = useState<'all' | '50' | '20'>('all');

  // Filter trades based on selected window
  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    // Trades in backend are sorted chronological or newest last
    const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
    if (filterCount === '20') return sorted.slice(-20);
    if (filterCount === '50') return sorted.slice(-50);
    return sorted;
  }, [trades, filterCount]);

  // Compute price bounds
  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (chartData.length === 0) return { minPrice: 0, maxPrice: 0, priceRange: 1 };
    const prices = chartData.map((t) => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    // Add small buffer so line doesn't hug canvas borders
    const padding = (max - min) * 0.1 || min * 0.005 || 1;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      priceRange: max - min + padding * 2 || 1,
    };
  }, [chartData]);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Observe container resize to trigger crisp redraws
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw chart onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (chartData.length < 2) return;

    const paddingRight = 65; // space for price axis
    const paddingBottom = 26; // space for time axis
    const chartWidth = width - paddingRight;
    const chartHeight = height - paddingBottom;

    // Helper coordinates
    const getX = (index: number) => (index / (chartData.length - 1)) * chartWidth;
    const getY = (price: number) =>
      chartHeight - ((price - minPrice) / priceRange) * chartHeight;

    // Draw horizontal grid lines & price labels
    const gridLines = 4;
    ctx.strokeStyle = '#1b202c';
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';

    for (let i = 0; i <= gridLines; i++) {
      const y = (i / gridLines) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      const priceVal = maxPrice - (i / gridLines) * priceRange;
      ctx.fillText(formatPrice(priceVal), chartWidth + 6, y + 3);
    }

    // Draw time labels along bottom
    const timeSteps = Math.min(chartData.length, 5);
    ctx.textAlign = 'center';
    for (let i = 0; i < timeSteps; i++) {
      const idx = Math.floor((i / (timeSteps - 1 || 1)) * (chartData.length - 1));
      const x = getX(idx);
      const timeStr = new Date(chartData[idx].timestamp).toTimeString().split(' ')[0];
      ctx.fillText(timeStr, x, height - 8);
    }

    // Draw area fill gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

    ctx.beginPath();
    ctx.moveTo(getX(0), chartHeight);
    chartData.forEach((point, i) => {
      ctx.lineTo(getX(i), getY(point.price));
    });
    ctx.lineTo(getX(chartData.length - 1), chartHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw main price line
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    chartData.forEach((point, i) => {
      if (i === 0) ctx.moveTo(getX(i), getY(point.price));
      else ctx.lineTo(getX(i), getY(point.price));
    });
    ctx.stroke();

    // Draw latest price benchmark line & radar pulse
    const latestIndex = chartData.length - 1;
    const latestX = getX(latestIndex);
    const latestY = getY(chartData[latestIndex].price);

    // Latest price horizontal dotted line
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, latestY);
    ctx.lineTo(chartWidth, latestY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Outer glow dot
    ctx.beginPath();
    ctx.arc(latestX, latestY, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.fill();

    // Inner solid dot
    ctx.beginPath();
    ctx.arc(latestX, latestY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();

    // Draw hover crosshair if active
    if (mousePos && hoverIndex !== null && chartData[hoverIndex]) {
      const hPoint = chartData[hoverIndex];
      const hX = getX(hoverIndex);
      const hY = getY(hPoint.price);

      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = '#94a3b8';

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hX, 0);
      ctx.lineTo(hX, chartHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, hY);
      ctx.lineTo(chartWidth, hY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight point
      ctx.beginPath();
      ctx.arc(hX, hY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
    }
  }, [chartData, minPrice, maxPrice, priceRange, mousePos, hoverIndex, dimensions]);

  // Handle mouse move for crosshair
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || chartData.length < 2) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const paddingRight = 65;
    const chartWidth = container.clientWidth - paddingRight;

    if (x >= 0 && x <= chartWidth) {
      const ratio = x / chartWidth;
      const index = Math.round(ratio * (chartData.length - 1));
      setHoverIndex(Math.max(0, Math.min(chartData.length - 1, index)));
      setMousePos({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setMousePos(null);
  };

  const activeTrade = hoverIndex !== null ? chartData[hoverIndex] : chartData[chartData.length - 1];

  return (
    <section className="flex-1 bg-[#10131c] border border-[#1e2330] rounded flex flex-col overflow-hidden">
      {/* Chart Header Bar */}
      <div className="h-9 px-3 border-b border-[#1c212e] flex items-center justify-between text-xs text-zinc-400 bg-[#0e1119]">
        <div className="flex items-center gap-3">
          <span className="font-bold text-zinc-100 flex items-center gap-1.5">
            <span>Price Stream</span>
            <span className="text-[10px] text-zinc-500 font-normal">({symbol})</span>
          </span>

          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#161a26] text-emerald-400 font-mono border border-emerald-500/20">
            Real Trades Tick Feed
          </span>
        </div>

        {/* Chart Window Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#151924] border border-[#202534] rounded p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setFilterCount('20')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterCount === '20' ? 'bg-[#222838] text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              20T
            </button>
            <button
              type="button"
              onClick={() => setFilterCount('50')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterCount === '50' ? 'bg-[#222838] text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              50T
            </button>
            <button
              type="button"
              onClick={() => setFilterCount('all')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterCount === 'all' ? 'bg-[#222838] text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="flex-1 relative w-full h-full min-h-[280px] bg-[#0c0f16]"
      >
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-[#0c0f16]/80 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-zinc-400">Loading market trades...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
              !
            </div>
            <div className="text-sm font-semibold text-rose-400">Failed to load price data</div>
            <div className="text-xs text-zinc-500 mt-1 max-w-xs">{error}</div>
          </div>
        )}

        {/* Empty State when no trades have executed yet */}
        {!isLoading && !error && chartData.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="w-12 h-12 rounded-xl bg-[#141824] border border-[#222838] flex items-center justify-center text-zinc-500 mb-3 text-lg">
              📈
            </div>
            <div className="text-sm font-semibold text-zinc-300">No Executed Trades Yet</div>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
              Place matching buy and sell orders using the order form. Once matched by the in-memory engine, real executed trade ticks will plot here in real time.
            </p>
            {lastPrice !== undefined && lastPrice > 0 && (
              <div className="mt-3 px-3 py-1 rounded bg-[#161a26] border border-[#23293a] text-xs font-mono text-zinc-400">
                Current Ticker: <span className="text-emerald-400 font-bold">{formatPrice(lastPrice)} USDT</span>
              </div>
            )}
          </div>
        )}

        {/* Tooltip / Crosshair Overlay Header */}
        {chartData.length > 0 && activeTrade && (
          <div className="absolute top-2 left-3 z-10 pointer-events-none flex items-center gap-3 bg-[#11141e]/90 border border-[#202636] px-2.5 py-1 rounded text-xs font-mono">
            <div>
              <span className="text-zinc-500 text-[10px] mr-1">PRICE:</span>
              <span className="text-emerald-400 font-bold">{formatPrice(activeTrade.price)}</span>
            </div>
            <div className="h-3 w-px bg-zinc-800" />
            <div>
              <span className="text-zinc-500 text-[10px] mr-1">QTY:</span>
              <span className="text-zinc-300">{formatQuantity(activeTrade.quantity)}</span>
            </div>
            <div className="h-3 w-px bg-zinc-800" />
            <div>
              <span className="text-zinc-500 text-[10px] mr-1">TIME:</span>
              <span className="text-zinc-400 text-[11px]">{formatTimeWithMs(activeTrade.timestamp)}</span>
            </div>
          </div>
        )}

        {/* Canvas */}
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Chart Footer Notice */}
      <div className="h-6 px-3 bg-[#0d1017] border-t border-[#1c212e] flex items-center justify-between text-[10px] font-mono text-zinc-500 select-none">
        <span>Backend Feed: Lightweight Tick Stream</span>
        <span>No Historical OHLCV Supplied</span>
      </div>
    </section>
  );
};
