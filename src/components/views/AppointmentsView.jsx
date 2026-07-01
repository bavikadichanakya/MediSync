import React, { useState, useEffect } from 'react';
import { Calendar, FileOutput, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { generateDoctorHandover } from '../../lib/pdfGenerator';
import { chatWithRecords } from '../../lib/aiService';
import BorderGlow from '../BorderGlow';
import ClickSpark from '../ClickSpark';
import HospitalMap from '../HospitalMap';

export default function AppointmentsView({ session }) {
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState([]);
  const [recommendedDoctor, setRecommendedDoctor] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [appRes, recRes] = await Promise.all([
      supabase.from('appointments').select('*').order('appointment_date', { ascending: true }),
      supabase.from('medical_records').select('*').order('record_date', { ascending: false })
    ]);
    if (appRes.data) setAppointments(appRes.data);
    if (recRes.data) setRecords(recRes.data);
  };

  const handleGeneratePDF = () => {
    generateDoctorHandover(records, appointments, session.user.email);
  };

  const handleAiSearch = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setIsAiSearching(true);
    setAiResults([]);
    setRecommendedDoctor('');
    try {
      const prompt = `I need to find a hospital or doctor for the following reason: ${aiQuery}. Please recommend hospitals using the [HOSPITAL|Name|Distance|Stars|URL] format.`;
      const answer = await chatWithRecords(prompt, records, 'English', false);
      
      const docMatch = answer.match(/\*\*Recommended Doctor\*\*\s*\n(.*?)(?=\n|$)/);
      if (docMatch && docMatch[1]) {
        setRecommendedDoctor(docMatch[1].replace(/[\[\]]/g, '').trim());
      }

      const matches = [...answer.matchAll(/\[HOSPITAL\|(.*?)\|(.*?)\|(.*?)\|(.*?)(\|(.*?)\|(.*?)\|(.*?)?)?\]/g)];
      const results = matches.map(m => ({
        name: m[1],
        distance: m[2],
        stars: parseInt(m[3]) || 5,
        url: m[4],
        lat: parseFloat(m[6]),
        lng: parseFloat(m[7]),
        reviewSummary: m[8] ? m[8].replace(/^"|"$/g, '') : "A highly rated hospital."
      }));
      setAiResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    if (!doctorName || !appointmentDate) return;
    
    setIsSubmitting(true);
    const fullName = specialization ? `${doctorName} - ${specialization}` : doctorName;
    
    const { error } = await supabase.from('appointments').insert([
      {
        user_id: session.user.id,
        doctor_name: fullName,
        appointment_date: new Date(appointmentDate).toISOString(),
        reminder_status: true
      }
    ]);
    
    setIsSubmitting(false);
    if (!error) {
      setIsModalOpen(false);
      setDoctorName('');
      setSpecialization('');
      setAppointmentDate('');
      fetchData();
    } else {
      alert("Error adding appointment.");
    }
  };

  return (
    <div className="dashboard-view appointments-view">
      <div className="view-header">
        <h2>Appointments</h2>
        <div className="flex-center gap-2">
          <ClickSpark>
            <BorderGlow>
              <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ margin: 0 }}>
                <Plus size={18}/> Add Appointment
              </button>
            </BorderGlow>
          </ClickSpark>
          <button className="btn-secondary" onClick={handleGeneratePDF}>
            <FileOutput size={18}/> Generate Handover
          </button>
        </div>
      </div>

      <div className="ai-appointment-finder">
        <form onSubmit={handleAiSearch} className="ai-search-form">
          <input 
            type="text" 
            placeholder="Describe your symptoms to find a doctor..." 
            value={aiQuery} 
            onChange={e => setAiQuery(e.target.value)} 
            disabled={isAiSearching}
          />
          <button type="submit" className="btn-primary" disabled={isAiSearching || !aiQuery.trim()}>
            {isAiSearching ? 'Searching...' : 'Find Doctor with AI'}
          </button>
        </form>

        {recommendedDoctor && aiResults.length > 0 && (
          <div className="ai-summary" style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            <p style={{ margin: 0 }}><strong>Recommended Specialist:</strong> {recommendedDoctor}</p>
          </div>
        )}
        
        {aiResults.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <HospitalMap hospitals={aiResults} />
          </div>
        )}
      </div>

      <div className="appointments-list">
        {appointments.map(app => (
          <div key={app.id} className="appointment-card">
            <div className="app-date">
              <Calendar size={20}/>
              <span>{new Date(app.appointment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</span>
            </div>
            <div className="app-details">
              <h3>Dr. {app.doctor_name}</h3>
              <p>{new Date(app.appointment_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} • Reminder Set</p>
            </div>
          </div>
        ))}
        {appointments.length === 0 && (
          <div className="empty-state">
            <p>No upcoming appointments.</p>
            <button className="btn-outline" onClick={() => setIsModalOpen(true)}>
              <Plus size={16}/> Add Appointment
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>New Appointment</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddAppointment} className="modal-form">
              <div className="form-group">
                <label>Doctor's Name</label>
                <input 
                  type="text" 
                  value={doctorName} 
                  onChange={e => setDoctorName(e.target.value)} 
                  placeholder="e.g. Smith"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Specialization (Optional)</label>
                <input 
                  type="text" 
                  value={specialization} 
                  onChange={e => setSpecialization(e.target.value)} 
                  placeholder="e.g. Cardiologist"
                />
              </div>
              <div className="form-group">
                <label>Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={appointmentDate} 
                  onChange={e => setAppointmentDate(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group mt-4">
                <ClickSpark className="full-width">
                  <BorderGlow className="full-width">
                    <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', margin: 0 }} disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save Appointment'}
                    </button>
                  </BorderGlow>
                </ClickSpark>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
