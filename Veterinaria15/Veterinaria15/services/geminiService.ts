import { MedicalRecord } from "../types";

const API_BASE_URL = 'http://localhost:3001/api/v1'; // Point to the backend

export const generateMedicalSummary = async (records: MedicalRecord[]): Promise<string> => {
  // Now, the frontend sends the data to our secure backend endpoint.
  try {
    const response = await fetch(`${API_BASE_URL}/ai/generate-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate summary');
    }
    
    const data = await response.json();
    return data.summary;

  } catch (error) {
    console.error("Error fetching medical summary from backend:", error);
    if (error instanceof Error) {
        // Return the error message to be displayed in the UI.
        return `Error al generar resumen: ${error.message}`;
    }
    return "Ocurrió un error desconocido al contactar el servicio de IA.";
  }
};
