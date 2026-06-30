import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Save, User, UserCheck, Activity, HeartPulse, CheckCircle2, AlertTriangle, Stethoscope, Beaker } from 'lucide-react';
import BorderGlow from '../BorderGlow';
import ClickSpark from '../ClickSpark';
import { generateHealthSummary } from '../../lib/aiService';

export default function ProfileView({ session }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  const [aiSummary, setAiSummary] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [records, setRecords] = useState([]);
  
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    gender: '',
    blood_group: '',
    emergency_contacts: '',
    allergies: '',
    existing_diseases: ''
  });

  useEffect(() => {
    let ignore = false;
    async function getProfile() {
      setLoading(true);
      const { user } = session;

      const { data, error } = await supabase
        .from('profiles')
        .select(`name, age, gender, blood_group, emergency_contacts, allergies, existing_diseases`)
        .eq('id', user.id)
        .single();

      if (!ignore) {
        if (error) {
          console.warn(error);
        } else if (data) {
          setProfile({
            name: data.name || '',
            age: data.age || '',
            gender: data.gender || '',
            blood_group: data.blood_group || '',
            emergency_contacts: data.emergency_contacts || '',
            allergies: data.allergies || '',
            existing_diseases: data.existing_diseases || ''
          });
        }
      }

      // Fetch records for AI Summary
      const { data: recordsData } = await supabase
        .from('medical_records')
        .select('*')
        .order('record_date', { ascending: false });
        
      if (!ignore && recordsData) {
        setRecords(recordsData);
      }

      setLoading(false);
    }

    getProfile();

    return () => {
      ignore = true;
    };
  }, [session]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { user } = session;
    const updates = {
      id: user.id,
      ...profile,
      age: profile.age ? parseInt(profile.age) : null,
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      // clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    }
    setSaving(false);
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const summary = await generateHealthSummary(profile, records);
      setAiSummary(summary);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to generate AI Summary.' });
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="view-container">
        <div className="view-header">
          <h2><User className="icon-pulse" /> My Profile</h2>
        </div>
        <div className="loading-state">Loading profile data...</div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2><User className="icon-pulse" /> My Profile</h2>
        <p className="view-subtitle">Manage your personal and medical information</p>
      </div>

      <div className="view-content">
        
        {/* AI Health Summary Section */}
        <div className="health-summary-section mb-6">
          {!aiSummary ? (
            <ClickSpark>
              <BorderGlow borderRadius={16} glowRadius={3}>
                <button 
                  className="btn-primary flex-center gap-2" 
                  style={{ width: '100%', margin: 0, padding: '1.5rem', fontSize: '1.1rem' }}
                  onClick={handleGenerateSummary}
                  disabled={generatingSummary}
                >
                  {generatingSummary ? (
                    <><Activity className="animate-spin" size={24} /> Analyzing Medical History...</>
                  ) : (
                    <><HeartPulse size={24} /> Generate AI Health Summary</>
                  )}
                </button>
              </BorderGlow>
            </ClickSpark>
          ) : (
            <div className="glass-panel health-summary-card">
              <div className="summary-header">
                <div className="flex-center gap-2">
                  <HeartPulse className="text-blue" size={24} />
                  <h3>AI Health Summary</h3>
                </div>
                <div className="health-score-container">
                  <div className={`score-value score-${aiSummary.score >= 80 ? 'good' : aiSummary.score >= 60 ? 'fair' : 'poor'}`}>
                    {aiSummary.score}/100
                  </div>
                  <span className="score-status">{aiSummary.status}</span>
                </div>
              </div>
              
              <div className="summary-grid">
                <div className="summary-col improving">
                  <h4><CheckCircle2 size={16} className="text-green" /> Things Improving</h4>
                  <ul>
                    {aiSummary.improving.map((item, i) => <li key={i}>{item}</li>)}
                    {aiSummary.improving.length === 0 && <li className="text-muted">Insufficient data</li>}
                  </ul>
                </div>
                
                <div className="summary-col monitoring">
                  <h4><AlertTriangle size={16} className="text-orange" /> Things to Monitor</h4>
                  <ul>
                    {aiSummary.monitoring.map((item, i) => <li key={i}>{item}</li>)}
                    {aiSummary.monitoring.length === 0 && <li className="text-muted">None currently identified</li>}
                  </ul>
                </div>
              </div>

              <div className="summary-footer">
                <div className="footer-item">
                  <Beaker size={16} className="text-blue" />
                  <div>
                    <span className="footer-label">Next Suggested Test</span>
                    <strong>{aiSummary.nextTest}</strong>
                  </div>
                </div>
                <div className="footer-item">
                  <Stethoscope size={16} className="text-blue" />
                  <div>
                    <span className="footer-label">Recommended Specialist</span>
                    <strong>{aiSummary.specialist}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel p-6">
          {message && (
            <div className={`message-banner ${message.type}`}>
              {message.type === 'success' ? <UserCheck size={18} /> : null}
              {message.text}
            </div>
          )}

          <form onSubmit={updateProfile} className="profile-form">
            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={profile.name}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  className="glass-input"
                />
              </div>

              <div className="input-group">
                <label htmlFor="age">Age</label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  value={profile.age}
                  onChange={handleChange}
                  placeholder="e.g. 30"
                  className="glass-input"
                  min="0"
                  max="150"
                />
              </div>

              <div className="input-group">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={profile.gender}
                  onChange={handleChange}
                  className="glass-input"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="blood_group">Blood Group</label>
                <select
                  id="blood_group"
                  name="blood_group"
                  value={profile.blood_group}
                  onChange={handleChange}
                  className="glass-input"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>

            <div className="input-group full-width mt-4">
              <label htmlFor="emergency_contacts">Emergency Contacts</label>
              <textarea
                id="emergency_contacts"
                name="emergency_contacts"
                value={profile.emergency_contacts}
                onChange={handleChange}
                placeholder="Name: Jane Doe, Phone: 555-1234, Relation: Spouse"
                className="glass-input"
                rows="2"
              />
            </div>

            <div className="input-group full-width mt-4">
              <label htmlFor="allergies">Allergies</label>
              <textarea
                id="allergies"
                name="allergies"
                value={profile.allergies}
                onChange={handleChange}
                placeholder="e.g. Penicillin, Peanuts (List any known allergies)"
                className="glass-input"
                rows="2"
              />
            </div>

            <div className="input-group full-width mt-4">
              <label htmlFor="existing_diseases">Existing Diseases / Conditions</label>
              <textarea
                id="existing_diseases"
                name="existing_diseases"
                value={profile.existing_diseases}
                onChange={handleChange}
                placeholder="e.g. Asthma, Type 2 Diabetes"
                className="glass-input"
                rows="2"
              />
            </div>

            <div className="form-actions mt-6">
              <ClickSpark className="mt-6 full-width">
                <BorderGlow className="full-width">
                  <button 
                    type="submit" 
                    className="btn-primary flex-center gap-2 full-width"
                    style={{ margin: 0 }}
                    disabled={saving}
                  >
                    {saving ? (
                      <><Activity className="animate-spin" size={18} /> Saving...</>
                    ) : (
                      <><Save size={18} /> Save Profile</>
                    )}
                  </button>
                </BorderGlow>
              </ClickSpark>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
