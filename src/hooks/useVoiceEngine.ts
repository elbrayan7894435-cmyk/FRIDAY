"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type VoiceOption = "clark" | "friday" | "professional";

export interface VoiceProfile {
  id: VoiceOption;
  name: string;
  description: string;
  pitch: number;
  rate: number;
  lang: string;
}

export const VOICE_PROFILES: Record<VoiceOption, VoiceProfile> = {
  clark: {
    id: "clark",
    name: "Clark Kent (Cálida)",
    description: "Tono cálido, servicial, seguro y cercano.",
    pitch: 0.9,
    rate: 0.95,
    lang: "es-ES",
  },
  friday: {
    id: "friday",
    name: "FRIDAY Clásica",
    description: "Tono digital suave, ágil, sofisticado y pulido.",
    pitch: 1.15,
    rate: 1.05,
    lang: "es-ES",
  },
  professional: {
    id: "professional",
    name: "Profesional",
    description: "Tono claro, preciso, articulado y formal.",
    pitch: 1.0,
    rate: 1.0,
    lang: "es-ES",
  },
};

export function useVoiceEngine(
  selectedVoiceId: VoiceOption,
  onSpeechStart?: () => void,
  onSpeechEnd?: () => void
) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micSupported, setMicSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!("speechSynthesis" in window)) {
        setSpeechSupported(false);
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setMicSupported(false);
      }
    }
  }, []);

  // Clean Markdown formatting from spoken text
  const cleanMarkdownForSpeech = (text: string): string => {
    return text
      .replace(/```[\s\S]*?```/g, " código adjunto ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#+\s+/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[-*]\s+/g, "")
      .trim();
  };

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel(); // Stop current speech

      const cleanedText = cleanMarkdownForSpeech(text);
      if (!cleanedText) return;

      const profile = VOICE_PROFILES[selectedVoiceId] || VOICE_PROFILES.clark;
      const utterance = new SpeechSynthesisUtterance(cleanedText);

      utterance.pitch = profile.pitch;
      utterance.rate = profile.rate;

      // Select suitable system voice if available
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice =
        voices.find((v) => v.lang.startsWith("es") && v.name.includes("Google")) ||
        voices.find((v) => v.lang.startsWith("es")) ||
        voices[0];

      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        if (onSpeechStart) onSpeechStart();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        if (onSpeechEnd) onSpeechEnd();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        if (onSpeechEnd) onSpeechEnd();
      };

      window.speechSynthesis.speak(utterance);
    },
    [selectedVoiceId, onSpeechStart, onSpeechEnd]
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      if (onSpeechEnd) onSpeechEnd();
    }
  }, [onSpeechEnd]);

  const startListening = useCallback(
    (onResult: (transcript: string) => void) => {
      if (typeof window === "undefined") return;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert("Tu navegador no soporta entrada de voz por micrófono (Web Speech API).");
        return;
      }

      if (isListening) {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setIsListening(false);
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "es-ES";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            onResult(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setIsListening(false);
      }
    },
    [isListening]
  );

  return {
    speak,
    stopSpeaking,
    startListening,
    isSpeaking,
    isListening,
    speechSupported,
    micSupported,
  };
}
