import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import MetricChart from '../MetricChart';

export default function TrendsView({ session }) {
  const [metrics, setMetrics] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrendData();
  }, [session]);

  const fetchTrendData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('user_id', session.user.id)
        .order('record_date', { ascending: true });

      if (error) throw error;

      // Parse structured data and group by metric name
      const groupedData = {};

      data.forEach(record => {
        if (!record.extracted_data || !record.extracted_data.data) return;
        
        const date = record.record_date;

        record.extracted_data.data.forEach(item => {
          const name = item.testName || item.medication;
          const valueStr = item.value || item.dosage;
          const unit = item.unit || item.frequency || '';

          if (!name || !valueStr) return;

          // Try to parse numerical value (e.g. "120" or "120.5" out of "120 mg/dL")
          const value = parseFloat(String(valueStr).replace(/[^\d.-]/g, ''));
          
          if (!isNaN(value)) {
            // Standardize some names
            let standardizedName = name;
            if (name.toLowerCase().includes('cholesterol')) standardizedName = 'Cholesterol';
            if (name.toLowerCase().includes('sugar') || name.toLowerCase().includes('glucose')) standardizedName = 'Sugar';
            if (name.toLowerCase().includes('hba1c') || name.toLowerCase().includes('a1c')) standardizedName = 'HbA1c';
            if (name.toLowerCase().includes('vitamin d')) standardizedName = 'Vitamin D';
            if (name.toLowerCase().includes('weight')) standardizedName = 'Weight';
            if (name.toLowerCase().includes('bmi')) standardizedName = 'BMI';
            if (name.toLowerCase().includes('bp systolic') || name.toLowerCase() === 'systolic') standardizedName = 'Systolic BP';
            if (name.toLowerCase().includes('bp diastolic') || name.toLowerCase() === 'diastolic') standardizedName = 'Diastolic BP';

            if (!groupedData[standardizedName]) {
              groupedData[standardizedName] = { data: [], unit: unit };
            }
            
            groupedData[standardizedName].data.push({
              date,
              value
            });
          }
        });
      });

      setMetrics(groupedData);
    } catch (err) {
      console.error("Error fetching trend data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Define thresholds (normal limits)
  const THRESHOLDS = {
    'Cholesterol': { limit: 200, unit: 'mg/dL', inverse: false }, // Spike red above 200
    'Sugar': { limit: 100, unit: 'mg/dL', inverse: false }, // Fasting sugar, spike above 100
    'HbA1c': { limit: 5.7, unit: '%', inverse: false }, // Spike above 5.7
    'Vitamin D': { limit: 30, unit: 'ng/mL', inverse: true }, // Spike red *below* 30 (deficient)
    'Weight': { limit: 80, unit: 'kg', inverse: false }, // Arbitrary generic limit for demo
    'BMI': { limit: 25, unit: '', inverse: false }, // Overweight threshold
    'Systolic BP': { limit: 120, unit: 'mmHg', inverse: false },
    'Diastolic BP': { limit: 80, unit: 'mmHg', inverse: false },
  };

  if (isLoading) {
    return (
      <div className="view-container flex-center">
        <p className="text-muted">Loading trends...</p>
      </div>
    );
  }

  const availableMetrics = Object.keys(metrics).filter(key => metrics[key].data.length > 0);

  return (
    <div className="view-container">
      <div className="view-header">
        <h2><TrendingUp className="icon-pulse" /> Medical Trends Dashboard</h2>
        <p className="view-subtitle">Visualize your health data over time, extracted directly from your medical records.</p>
      </div>

      <div className="trends-content" style={{ display: 'grid', gap: '2rem', marginTop: '2rem', paddingBottom: '4rem' }}>
        {availableMetrics.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3>No Trend Data Found</h3>
            <p className="text-muted">Upload lab reports and prescriptions in the AI Organizer to populate this dashboard.</p>
          </div>
        ) : (
          availableMetrics.map(metricName => {
            const chartData = metrics[metricName].data;
            // Sort by date just to be sure
            chartData.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            const config = THRESHOLDS[metricName] || { limit: 100, unit: metrics[metricName].unit, inverse: false };

            return (
              <MetricChart
                key={metricName}
                title={metricName}
                data={chartData}
                threshold={config.limit}
                unit={config.unit}
                inverse={config.inverse}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
