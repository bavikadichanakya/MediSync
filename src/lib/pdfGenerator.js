import { jsPDF } from "jspdf";

export function generateDoctorHandover(records, appointments, userEmail) {
  const doc = new jsPDF();
  let yPos = 20;

  // Helper to add text and manage page breaks
  const addText = (text, size = 12, isBold = false) => {
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, 20, yPos);
    yPos += size * 0.4 + 2; // Approximate line height
  };

  // Title
  addText("MediSync Doctor Handover Report", 22, true);
  yPos += 5;
  
  const dateStr = new Date().toLocaleDateString();
  addText(`Patient Email: ${userEmail}`, 12);
  addText(`Generated On: ${dateStr}`, 12);
  yPos += 10;

  // Upcoming Appointments
  addText("Upcoming Appointments", 16, true);
  yPos += 3;
  if (appointments && appointments.length > 0) {
    appointments.forEach(app => {
      const date = new Date(app.appointment_date).toLocaleString();
      addText(`• Dr. ${app.doctor_name} on ${date}`, 12);
    });
  } else {
    addText("No upcoming appointments.", 12);
  }
  yPos += 10;

  // Recent Medical Records
  addText("Recent Medical History", 16, true);
  yPos += 3;

  if (records && records.length > 0) {
    // Sort records descending by date just in case
    const sortedRecords = [...records].sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
    
    // Only take the 5 most recent records to keep the handover concise
    const recentRecords = sortedRecords.slice(0, 5);

    recentRecords.forEach(record => {
      addText(`[${record.record_date}] ${record.title}`, 14, true);
      
      const data = record.extracted_data;
      if (data) {
        if (data.summary) {
          addText(`Summary: ${data.summary}`, 12);
        }
        
        // Output lab anomalies if any
        if (data.data && Array.isArray(data.data)) {
          const anomalies = data.data.filter(item => item.isAbnormal);
          if (anomalies.length > 0) {
            yPos += 2;
            addText("Flagged Anomalies:", 12, true);
            anomalies.forEach(anomaly => {
              addText(`  ! ${anomaly.testName}: ${anomaly.value} ${anomaly.unit || ''} (Normal: ${anomaly.referenceRange || 'Unknown'})`, 12);
            });
          }
        }
      } else {
        addText("No structured data extracted.", 12);
      }
      yPos += 5;
    });
  } else {
    addText("No recent medical records found.", 12);
  }

  // Footer
  yPos += 10;
  addText("--- End of Report ---", 10);
  addText("Generated securely via MediSync.", 10);

  // Save the PDF
  doc.save(`MediSync_Handover_${dateStr.replace(/\//g, '-')}.pdf`);
}
