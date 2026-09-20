import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION =
  "Actúa como F.R.I.D.A.Y., un asistente personal digital de alta tecnología, inteligente, elegante y con voz amigable inspirada en el tono cálido, seguro y servicial de Clark Kent en Smallville. Tono cercano, ágil, sin alucinaciones y con respuestas completas en Markdown.";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isPriority?: boolean;
}

export async function generateFridayResponse(
  prompt: string,
  history: ChatMessage[] = [],
  apiKeyOverride?: string
): Promise<string> {
  const apiKey =
    apiKeyOverride ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    (typeof window !== "undefined" ? (window as unknown as { NEXT_PUBLIC_GEMINI_API_KEY?: string }).NEXT_PUBLIC_GEMINI_API_KEY : "") ||
    "";

  if (!apiKey) {
    throw new Error(
      "No se encontró la API Key de Gemini. Asegúrate de configurar NEXT_PUBLIC_GEMINI_API_KEY."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  // Format historical messages for context
  const contents = history.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));

  // Append new prompt
  contents.push({
    role: "user",
    parts: [{ text: prompt }],
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    if (response.text) {
      return response.text;
    }

    throw new Error("Respuesta vacía del servicio Gemini.");
  } catch (err: unknown) {
    console.error("Gemini API error:", err);
    // If model gemini-2.5-flash fails or isn't available on free key, fallback gracefully to gemini-2.0-flash or standard flash
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });
      if (fallbackResponse.text) {
        return fallbackResponse.text;
      }
    } catch (fallbackErr) {
      console.error("Fallback Gemini API error:", fallbackErr);
    }
    throw err;
  }
}
