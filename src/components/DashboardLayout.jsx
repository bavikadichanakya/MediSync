import React, { useState } from 'react';
import Ferrofluid from './Ferrofluid';
import { supabase } from '../lib/supabaseClient';
import { Activity, Folder, Calendar as CalendarIcon, LogOut, User, Scan, TrendingUp, Pill, Bell, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import TimelineView from './views/TimelineView';
import TrendsView from './views/TrendsView';
import FolderView from './views/FolderView';
import AppointmentsView from './views/AppointmentsView';
import ProfileView from './views/ProfileView';
import AIOrganizerView from './views/AIOrganizerView';
import PrescriptionsView from './views/PrescriptionsView';
import SmartAlerts from './SmartAlerts';
import AIChatbot from './AIChatbot';
import BorderGlow from './BorderGlow';
import './DashboardLayout.css';
import './views/Views.css';

export default function DashboardLayout({ session }) {
  const email = session?.user?.email || 'User';
  const [activeTab, setActiveTab] = useState('timeline');
  const [showAlerts, setShowAlerts] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [highlightedRecordId, setHighlightedRecordId] = useState(null);
  
  const handleAlertClick = (alert) => {
    setShowAlerts(false);
    if (alert.recordId) {
      setHighlightedRecordId(alert.recordId);
      setActiveTab('timeline');
    } else if (alert.type === 'appointment') {
      setActiveTab('appointments');
    }
  };

  const renderView = () => {
    switch(activeTab) {
      case 'timeline': return <TimelineView session={session} highlightedRecordId={highlightedRecordId} />;
      case 'prescriptions': return <PrescriptionsView session={session} />;
      case 'trends': return <TrendsView session={session} />;
      case 'folders': return <FolderView session={session} />;
      case 'appointments': return <AppointmentsView session={session} />;
      case 'profile': return <ProfileView session={session} />;
      case 'ai-organizer': return <AIOrganizerView session={session} />;
      default: return <TimelineView session={session} />;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Dynamic OGL Background Effect */}
      <Ferrofluid
        colors={["#EAB308", "#96c8ff", "#03010A"]}
        speed={0.5}
        scale={1.2}
        turbulence={1.5}
        fluidity={0.2}
        rimWidth={0.2}
        sharpness={3}
        shimmer={1}
        glow={2}
        flowDirection="down"
        opacity={1}
        mouseInteraction={true}
        mouseStrength={1}
        mouseRadius={0.4}
      />
      
      <div className="dashboard-layout">
        {/* Sidebar Navigation */}
        <aside className={`dashboard-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <h2 className="nav-text">MediSync</h2>
            <button className="sidebar-toggle" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} title="Toggle Sidebar">
              {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
          </div>
          <nav className="sidebar-nav">
            <BorderGlow className="no-inner-glow" borderRadius={16} glowRadius={3} glowIntensity={0.4} edgeSensitivity={15} fillOpacity={0} style={{ width: '100%', display: 'flex' }}>
              <button 
                className={`nav-btn full-width ${activeTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setActiveTab('timeline')}
                title="Timeline"
              >
                <Activity size={20}/> <span className="nav-text">Timeline</span>
              </button>
            </BorderGlow>
            <BorderGlow className="no-inner-glow" borderRadius={16} glowRadius={3} glowIntensity={0.4} edgeSensitivity={15} fillOpacity={0} style={{ width: '100%', display: 'flex' }}>
              <button 
                className={`nav-btn full-width ${activeTab === 'prescriptions' ? 'active' : ''}`}
                onClick={() => setActiveTab('prescriptions')}
                title="Prescriptions"
              >
                <Pill size={20}/> <span className="nav-text">Prescriptions</span>
              </button>
            </BorderGlow>
            <BorderGlow className="no-inner-glow" borderRadius={16} glowRadius={3} glowIntensity={0.4} edgeSensitivity={15} fillOpacity={0} style={{ width: '100%', display: 'flex' }}>
              <button 
                className={`nav-btn full-width ${activeTab === 'trends' ? 'active' : ''}`}
                onClick={() => setActiveTab('trends')}
                title="Trends"
              >
                <TrendingUp size={20}/> <span className="nav-text">Trends</span>
              </button>
            </BorderGlow>
            <BorderGlow className="no-inner-glow" borderRadius={16} glowRadius={3} glowIntensity={0.4} edgeSensitivity={15} fillOpacity={0} style={{ width: '100%', display: 'flex' }}>
              <button 
                className={`nav-btn full-width ${activeTab === 'folders' ? 'active' : ''}`}
                onClick={() => setActiveTab('folders')}
                title="Folders"
              >
                <Folder size={20}/> <span className="nav-text">Folders</span>
              </button>
            </BorderGlow>
            <BorderGlow className="no-inner-glow" borderRadius={16} glowRadius={3} glowIntensity={0.4} edgeSensitivity={15} fillOpacity={0} style={{ width: '100%', display: 'flex' }}>
              <button 
                className={`nav-btn full-width ${activeTab === 'appointments' ? 'active' : ''}`}
                onClick={() => setActiveTab('appointments')}
                title="Appointments"
              >
                <CalendarIcon size={20}/> <span className="nav-text">Appointments</span>
              </button>
            </BorderGlow>
            <BorderGlow className="no-inner-glow" borderRadius={16} glowRadius={3} glowIntensity={0.4} edgeSensitivity={15} fillOpacity={0} style={{ width: '100%', display: 'flex' }}>
              <button 
                className={`nav-btn full-width ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
                title="Profile"
              >
                <User size={20}/> <span className="nav-text">Profile</span>
              </button>
            </BorderGlow>
            <BorderGlow className="no-inner-glow" borderRadius={16} glowRadius={3} glowIntensity={0.4} edgeSensitivity={15} fillOpacity={0} style={{ width: '100%', display: 'flex' }}>
              <button 
                className={`nav-btn full-width ${activeTab === 'ai-organizer' ? 'active' : ''}`}
                onClick={() => setActiveTab('ai-organizer')}
                title="AI Organizer"
              >
                <Scan size={20}/> <span className="nav-text">AI Organizer</span>
              </button>
            </BorderGlow>
          </nav>
          
          <div className="sidebar-footer">
            <p className="user-email nav-text">{email}</p>
            <button className="btn-signout" onClick={() => supabase.auth.signOut()} title="Sign Out">
              <LogOut size={16}/> <span className="nav-text">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main">
          {renderView()}
        </main>
      </div>

      {/* Global Notification Bell */}
      <div className="bell-trigger">
        <button className="bell-btn" onClick={() => setShowAlerts(!showAlerts)}>
          <Bell size={20} />
          <span className="bell-indicator"></span>
        </button>
        {showAlerts && <SmartAlerts session={session} onClose={() => setShowAlerts(false)} onAlertClick={handleAlertClick} />}
      </div>

      {/* Floating AI Assistant */}
      <AIChatbot session={session} />
    </div>
  );
}
