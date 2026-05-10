import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function downloadPNG(element: HTMLElement, filename: string = 'architecture-diagram') {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0f172a',
      scale: 2,
      logging: false,
    });
    
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('PNG export failed:', err);
  }
}

export async function downloadPDF(element: HTMLElement, filename: string = 'architecture-diagram') {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0f172a',
      scale: 2,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 297; // A4 landscape width
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`${filename}.pdf`);
  } catch (err) {
    console.error('PDF export failed:', err);
  }
}