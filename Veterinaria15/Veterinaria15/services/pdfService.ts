import { Pet, Client, Company, Prescription } from "../types";

const API_BASE_URL = 'http://localhost:3001/api/v1';

/**
 * Requests a prescription PDF from the backend.
 * In a production architecture, PDF generation should happen on the server
 * to protect business logic, ensure consistent formatting, and reduce client-side load.
 * This function constructs a URL to a backend endpoint that will generate and serve the PDF.
 *
 * @param prescription The prescription object.
 * @param pet The pet object.
 * @param client The client object.
 * @param company The company object.
 */
export const requestPrescriptionPdf = (prescription: Prescription, pet: Pet, client: Client, company: Company) => {
    // The backend endpoint can fetch necessary data with the ID, so we don't need to pass everything.
    const pdfUrl = `${API_BASE_URL}/prescriptions/${prescription.id}/pdf`;
    
    console.log(`Requesting PDF from backend endpoint: ${pdfUrl}`);
    
    // Open the URL in a new tab, which will trigger the browser's download prompt
    // or display the PDF if the browser is configured to do so.
    window.open(pdfUrl, '_blank');
};
