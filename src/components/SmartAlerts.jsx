import React, { useState, useEffect } from 'react';
import { Bell, X, Pill, Activity, Calendar as CalendarIcon, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import './SmartAlerts.css';

export default function SmartAlerts({ session, onClose }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateAlerts();
  }, []);

  const generateAlerts = async () => {
    const generated = [];

    // 1. Fetch Prescriptions for Medicine Reminders
    const { data: prescriptions } = await supabase
      .from('medical_records')
      .select('*')
      .eq('document_type', 'Prescription');

    if (prescriptions && prescriptions.length > 0) {
      let medAdded = false;
      prescriptions.forEach(record => {
        if (record.extracted_data && record.extracted_data.data) {
          record.extracted_data.data.forEach(med => {
            if (med.medication && !medAdded) {
              generated.push({
                id: `med-${Date.now()}`,
                type: 'medicine',
                title: 'Medicine Reminder',
                message: `Time to take ${med.medication} (${med.dosage}). ${med.foodInstructions || ''}`,
                time: 'Just now',
                icon: Pill
              });
              medAdded = true; // Just add one for demonstration
            }
          });
        }
      });
    }

    // 2. Fetch Appointments for Doctor Follow-ups
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
        title: 'Doctor Follow-up',
        message: `Upcoming appointment with ${apt.doctor_name} on ${apt.date}.`,
        time: 'In 2 days',
        icon: CalendarIcon
      });
    }

    // 3. Static/Smart Preventive Alerts
    generated.push({
      id: 'blood-test-1',
      type: 'blood',
      title: 'Upcoming Blood Test',
      message: 'It has been 6 months since your last complete blood count (CBC). Consider scheduling one.',
      time: '2 hours ago',
      icon: Activity
    });

    generated.push({
      id: 'vaccine-1',
      type: 'vaccination',
      title: 'Vaccination Reminder',
      message: 'Annual flu shot is recommended for this season.',
      time: '1 day ago',
      icon: ShieldCheck
    });

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
              <div key={alert.id} className={`alert-item alert-type-${alert.type}`}>
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
