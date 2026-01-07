// Your exact implementation:
const { jsPDF } = window.jspdf;
const pdf = new jsPDF({
  orientation: "portrait",
  unit: "px", 
  format: "a4"
});

// For each image:
pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);

// Direct download:
pdf.save("TGDSC_Watermarked.pdf");