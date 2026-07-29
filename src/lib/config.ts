export const GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw4C3oqko-KfChiwtrlHjXuVxTiiG8kkeF3wKJnlTNr2DH-R0rEmsJnngSCmXt3R2z5/exec";

export const AB_FITNESS_UPI_ID = "8587882431@nyes";

export async function callABFitnessBackend(payload: any) {
  const response = await fetch(
    GOOGLE_APPS_SCRIPT_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    }
  );

  const rawText = await response.text();

  console.log("AB FITNESS BACKEND RESPONSE:", rawText);

  let result;

  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(
      "Backend returned an invalid response."
    );
  }

  console.log("AB GYM BACKEND:", result);

  if (!result.success) {
    throw new Error(
      result.message || "Backend request failed."
    );
  }

  return result;
}

