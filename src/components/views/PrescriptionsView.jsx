import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Pill, Sun, Sunrise, Moon, Bell, BellRing, Clock } from 'lucide-react';
import UploadButton from '../UploadButton';
import ClickSpark from '../ClickSpark';
import BorderGlow from '../BorderGlow';

export default function PrescriptionsView({ session }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('document_type', 'Prescription')
      .order('record_date', { ascending: false });
      
    if (!error && data) {
      setPrescriptions(data);
    }
  };

  // Group all extracted medications by time of day
  const getDailySchedule = () => {
    const schedule = {
      morning: [],
      afternoon: [],
      night: []
    };

    prescriptions.forEach(record => {
      if (record.extracted_data && record.extracted_data.data) {
        record.extracted_data.data.forEach(med => {
          // ensure it's a medication object (from prescriptions)
          if (med.medication) {
            const medData = {
              name: med.medication,
              dosage: med.dosage,
              food: med.foodInstructions,
              duration: med.duration,
              recordTitle: record.title
            };
            
            if (med.morning) schedule.morning.push(medData);
            if (med.afternoon) schedule.afternoon.push(medData);
            if (med.night) schedule.night.push(medData);
          }
        });
      }
    });

    return schedule;
  };

  const schedule = getDailySchedule();

  const renderMedicationCard = (med, idx) => (
    <div key={idx} className="medication-card interactive-card">
      <div className="med-header">
        <h4><Pill size={16} /> {med.name}</h4>
        <span className="med-dose">{med.dosage}</span>
      </div>
      <div className="med-details">
        {med.food && <span className="med-tag food-tag">{med.food}</span>}
        {med.duration && <span className="med-tag duration-tag"><Clock size={12}/> {med.duration}</span>}
      </div>
      <div className="med-source">From: {med.recordTitle}</div>
    </div>
  );

  return (
    <div className="dashboard-view prescriptions-view">
      <div className="view-header" style={{ marginBottom: '1rem' }}>
        <h2>Prescription Scanner & Pill Reminder</h2>
        <div className="flex-center gap-2">
          <ClickSpark>
            <BorderGlow>
              <button 
                className={`btn-${notificationsEnabled ? 'secondary' : 'primary'}`} 
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                style={{ margin: 0, padding: '0.6rem 1rem' }}
              >
                {notificationsEnabled ? <><BellRing size={18}/> Reminders On</> : <><Bell size={18}/> Enable Reminders</>}
              </button>
            </BorderGlow>
          </ClickSpark>
          <UploadButton session={session} onUploadComplete={fetchPrescriptions} />
        </div>
      </div>
      
      <p className="text-muted" style={{ marginBottom: '2rem' }}>
        Upload a prescription, and our AI will automatically extract the medications and build your daily schedule.
      </p>

      {prescriptions.length === 0 ? (
        <div className="empty-state">
          <Pill size={48} className="text-muted mb-4 mx-auto" />
          <p>No prescriptions found. Upload a prescription image to get started.</p>
        </div>
      ) : (
        <div className="schedule-container">
          
          <div className="schedule-column morning-col">
            <div className="col-header">
              <Sunrise size={24} className="time-icon text-yellow" />
              <h3>Morning</h3>
            </div>
            <div className="col-content">
              {schedule.morning.length === 0 ? (
                <p className="empty-time">No pills scheduled.</p>
              ) : (
                schedule.morning.map((med, idx) => renderMedicationCard(med, idx))
              )}
            </div>
          </div>

          <div className="schedule-column afternoon-col">
            <div className="col-header">
              <Sun size={24} className="time-icon text-orange" />
              <h3>Afternoon</h3>
            </div>
            <div className="col-content">
              {schedule.afternoon.length === 0 ? (
                <p className="empty-time">No pills scheduled.</p>
              ) : (
                schedule.afternoon.map((med, idx) => renderMedicationCard(med, idx))
              )}
            </div>
          </div>

          <div className="schedule-column night-col">
            <div className="col-header">
              <Moon size={24} className="time-icon text-blue" />
              <h3>Night</h3>
            </div>
            <div className="col-content">
              {schedule.night.length === 0 ? (
                <p className="empty-time">No pills scheduled.</p>
              ) : (
                schedule.night.map((med, idx) => renderMedicationCard(med, idx))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
