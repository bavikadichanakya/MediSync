import React, { useState, useEffect } from 'react';
import { Bell, X, Pill, Activity, Calendar as CalendarIcon, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import './SmartAlerts.css';

export default function SmartAlerts({ session, onClose, onAlertClick }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateAlerts();
  }, []);

  const generateAlerts = async () => {
    const generated = [];

    const { data: records } = await supabase
      .from('medical_records')
      .select('*')
      .order('record_date', { ascending: false });

    if (records && records.length > 0) {
      let medAdded = false;
      records.forEach(record => {
        if (record.extracted_data && record.extracted_data.data) {
          
          // 1. Check for abnormal lab findings
          if (record.document_type === 'Lab Report' || record.document_type === 'Other') {
            const abnormalItems = record.extracted_data.data.filter(d => d.isAbnormal);
            if (abnormalItems.length > 0) {
              const testNames = abnormalItems.map(a => a.testName).join(', ');
              generated.push({
                id: `abnormal-${record.id}`,
                type: 'blood',
                title: 'Abnormal Lab Results',
                message: `Abnormal values detected for: ${testNames}. Review your report.`,
                time: record.record_date,
                icon: Activity,
                recordId: record.id
              });
            }
          }

          // 2. Check for medications (limit to 1 for alert brevity)
          if (record.document_type === 'Prescription') {
            record.extracted_data.data.forEach(med => {
              if (med.medication && !medAdded) {
                generated.push({
                  id: `med-${record.id}-${Date.now()}`,
                  type: 'medicine',
                  title: 'Medicine Reminder',
                  message: `Time to take ${med.medication} (${med.dosage || 'as prescribed'}). ${med.foodInstructions || ''}`,
                  time: record.record_date,
                  icon: Pill,
                  recordId: record.id
                });
                medAdded = true;
              }
            });
          }
        }
      });
    }

    // 3. Fetch Appointments for Doctor Follow-ups
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(1);

    if (appointments && appointments.length > 0) {
      const apt = appointments[0];
      generated.push({
        id: `apt-${apt.id}`,
        type: 'appointment',
        title: 'Upcoming Appointment',
        message: `Appointment with ${apt.doctor_name} on ${apt.date}.`,
        time: 'Soon',
        icon: CalendarIcon,
        recordId: null // Appointments don't link to a timeline record
      });
    }

    setAlerts(generated);
    setLoading(false);
  };

  return (
    <div className="smart-alerts-container">
      <div className="alerts-header">
        <h3><Bell size={18} className="text-yellow" /> Smart Alerts <span className="alerts-badge">{alerts.length}</span></h3>
        <button className="close-alerts" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="alerts-content">
        {loading ? (
          <p className="text-center text-muted py-4">Checking alerts...</p>
        ) : alerts.length === 0 ? (
          <p className="text-center text-muted py-4">You're all caught up!</p>
        ) : (
          alerts.map(alert => {
            const Icon = alert.icon;
            return (
              <div 
                key={alert.id} 
                className={`alert-item alert-type-${alert.type} ${alert.recordId ? 'clickable' : ''}`}
                onClick={() => onAlertClick && onAlertClick(alert)}
              >
                <div className="alert-icon-wrapper">
                  <Icon size={20} />
                </div>
                <div className="alert-info">
                  <h4>{alert.title}</h4>
                  <p>{alert.message}</p>
                  <span className="alert-time">{alert.time}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
