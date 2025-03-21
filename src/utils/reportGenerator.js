const PDFDocument = require('pdfkit');
const fs = require('fs');
const { createCanvas } = require('canvas');
const { Chart } = require('chart.js');
const Listing = require('../models/Listing');
const User = require('../models/User');

const generateMonthlyReport = async (landlordId, month, year) => {
  try {
    // Fetch the landlord's listings
    const listings = await Listing.find({ landlord: landlordId });

    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 });
    const reportPath = `reports/${landlordId}_${month}_${year}_report.pdf`;
    doc.pipe(fs.createWriteStream(reportPath));

    // Add a cover page
    doc.fontSize(25).text('Monthly Rental Performance Report', 50, 50);
    doc.fontSize(12).text(`Landlord: ${landlordId}`, 50, 100);
    doc.text(`Report Period: ${month}/${year}`, 50, 120);
    doc.addPage();

    // Add a summary section
    doc.fontSize(18).text('Summary', 50, 50);
    listings.forEach((listing, index) => {
      doc.fontSize(12).text(`Listing ${index + 1}: ${listing.title}`, 50, 80 + (index * 50));
      doc.text(`Total Views: ${listing.views}`, 70, 100 + (index * 50));
      doc.text(`Contact Landlord Clicks: ${listing.contactClicks || 0}`, 70, 120 + (index * 50));
    });

    // Add a chart for most active days
    const mostActiveDays = calculateMostActiveDays(listings);
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: mostActiveDays.labels,
        datasets: [{
          label: 'Views',
          data: mostActiveDays.data,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        }],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    // Add the chart image to the PDF
    doc.addPage();
    doc.fontSize(18).text('Most Active Days', 50, 50);
    doc.image(canvas.toBuffer(), 50, 80, { width: 400 });

    // Finalize the PDF
    doc.end();

    return reportPath;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

// Helper function to calculate most active days
const calculateMostActiveDays = (listings) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const viewsByDay = [0, 0, 0, 0, 0, 0, 0];

  listings.forEach((listing) => {
    listing.viewTimestamps.forEach((view) => {
      const day = new Date(view.timestamp).getDay();
      viewsByDay[day] += 1;
    });
  });

  return {
    labels: days,
    data: viewsByDay,
  };
};

module.exports = { generateMonthlyReport };