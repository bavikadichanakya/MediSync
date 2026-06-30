import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

export default function MetricChart({ title, data, threshold, unit = '', inverse = false }) {
  if (!data || data.length === 0) {
    return (
      <div className="metric-chart-container" style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>{title}</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '2rem 0' }}>No trend data available.</p>
      </div>
    );
  }

  const values = data.map(d => Number(d.value)).filter(v => !isNaN(v));
  if (values.length === 0) {
    return null;
  }

  const dataMax = Math.max(...values);
  const dataMin = Math.min(...values);

  // Extend domain to make graph look better
  const yDomain = [
    Math.min(dataMin, threshold) * 0.8, 
    Math.max(dataMax, threshold) * 1.1
  ];

  const getGradientOffset = () => {
    if (dataMax <= threshold) {
      return inverse ? 0 : 1; 
    }
    if (dataMin >= threshold) {
      return inverse ? 1 : 0; 
    }
    return (dataMax - threshold) / (dataMax - dataMin);
  };

  const off = getGradientOffset();
  const id = title.replace(/\s+/g, '-').toLowerCase();

  // Use theme colors
  const goodColor = '#fbbf24'; // Theme Accent / Golden
  const badColor = '#ef4444'; // Red for spikes

  return (
    <div className="metric-chart-container" style={{ 
      padding: '1.5rem', 
      background: 'rgba(15,15,15,0.5)', 
      borderRadius: '24px', 
      border: '1px solid rgba(255,255,255,0.05)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{title}</h3>
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '99px' }}>
          Normal: {inverse ? '>' : '<'} {threshold} {unit}
        </span>
      </div>
      
      <div className="metric-chart-wrapper" style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id={`splitColor-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset={off} stopColor={inverse ? goodColor : badColor} stopOpacity={0.8} />
                <stop offset={off} stopColor={inverse ? badColor : goodColor} stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id={`splitStroke-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset={off} stopColor={inverse ? goodColor : badColor} stopOpacity={1} />
                <stop offset={off} stopColor={inverse ? badColor : goodColor} stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.3)" 
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} 
              tickMargin={10}
              tickFormatter={(dateStr) => {
                const d = new Date(dateStr);
                return `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear().toString().slice(2)}`;
              }}
            />
            <YAxis 
              domain={yDomain} 
              stroke="rgba(255,255,255,0.3)" 
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} 
              tickFormatter={(val) => Math.round(val)}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(15,15,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
              itemStyle={{ color: '#fff', fontWeight: 600 }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontSize: '12px' }}
              formatter={(value) => [`${value} ${unit}`, title]}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <ReferenceLine y={threshold} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={`url(#splitStroke-${id})`} 
              fill={`url(#splitColor-${id})`} 
              strokeWidth={3}
              activeDot={{ r: 6, fill: '#fff', strokeWidth: 0, boxShadow: '0 0 10px rgba(255,255,255,0.5)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
