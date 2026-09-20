"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  Zap,
  Key,
  Check,
  AlertCircle,
  Radio,
  Clock,
  User,
  Bot,
  BellRing,
} from "lucide-react";

import { generateFridayResponse, ChatMessage } from "@/lib/gemini";
import { FridayCoreHalo, FridayState } from "@/components/FridayCoreHalo";
import { DynamicTypography } from "@/components/DynamicTypography";
import { useVoiceEngine, VoiceOption, VOICE_PROFILES } from "@/hooks/useVoiceEngine";

export default function FridayApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "**Sistemas inicializados y en línea.** Hola, soy **F.R.I.D.A.Y.**, tu asistente personal digital. ¿En qué puedo asistirte el día de hoy?",
      timestamp: new Date(),
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [aiState, setAiState] = useState<FridayState>("idle");
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>("clark");
  const [isPriorityMode, setIsPriorityMode] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [activeApiKey, setActiveApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Engine
  const {
    speak,
    stopSpeaking,
    startListening,
    isSpeaking,
    isListening,
    speechSupported,
    micSupported,
  } = useVoiceEngine(selectedVoice, () => {
    setAiState("speaking");
  }, () => {
    setAiState("idle");
  });

  // Initialize API Key from env or localStorage
  useEffect(() => {
    const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    const localKey = localStorage.getItem("friday_gemini_api_key") || "";
    if (localKey) {
      setActiveApiKey(localKey);
      setApiKeyInput(localKey);
    } else if (envKey) {
      setActiveApiKey(envKey);
    }
  }, []);

  const saveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem("friday_gemini_api_key", apiKeyInput.trim());
      setActiveApiKey(apiKeyInput.trim());
      setShowSettings(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiState]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query) return;

    if (isSpeaking) {
      stopSpeaking();
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date(),
      isPriority: isPriorityMode,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setAiState("thinking");

    try {
      const responseText = await generateFridayResponse(
        query,
        messages,
        activeApiKey
      );

      const assistantMsg: ChatMessage = {
        id: `friday-${Date.now()}`,
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
        isPriority: isPriorityMode,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (isPriorityMode) {
        setAiState("priority");
        setTimeout(() => {
          setAiState("speaking");
        }, 1200);
      } else {
        setAiState("speaking");
      }

      if (autoSpeak) {
        speak(responseText);
      } else {
        setAiState("idle");
      }
    } catch (error: any) {
      console.error("Error communicating with F.R.I.D.A.Y.:", error);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "⚠️ **Incapaz de establecer conexión con el núcleo Gemini.** " +
          (error.message ||
            "Por favor verifica tu variable `NEXT_PUBLIC_GEMINI_API_KEY` o proporciona una clave válida en la configuración."),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setAiState("idle");
    }
  };

  const handleMicClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    startListening((transcript) => {
      setInputMessage(transcript);
      handleSendMessage(transcript);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-200/50 text-slate-800 flex flex-col justify-between items-center p-3 sm:p-6 transition-all duration-300">
      {/* HEADER BAR (Neumorfismo blanco y Glassmorphism) */}
      <header className="w-full max-w-5xl neu-glass rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 sticky top-2 z-30">
        {/* Brand Logo & Status */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-amber-600 flex items-center justify-center text-white font-black tracking-tighter text-lg shadow-md">
              F
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-slate-900 flex items-center gap-2">
              F.R.I.D.A.Y.
              <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium tracking-normal border border-amber-200">
                AI 2.5 FLASH
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-light flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Sistema Digital Activo
            </p>
          </div>
        </div>

        {/* Voice Selector & Controls */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Voice Selector Panel */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 text-xs shadow-inner">
            <Radio className="w-3.5 h-3.5 text-amber-600 ml-2 mr-1" />
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value as VoiceOption)}
              className="bg-transparent text-slate-700 font-medium py-1 px-2 focus:outline-none cursor-pointer"
            >
              <option value="clark">Voice: Clark Kent (Cálida)</option>
              <option value="friday">Voice: FRIDAY Clásica</option>
              <option value="professional">Voice: Profesional</option>
            </select>
          </div>

          {/* Priority Toggle */}
          <button
            onClick={() => setIsPriorityMode(!isPriorityMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isPriorityMode
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
            title="Prioridad Alta para respuestas destacadas"
          >
            <BellRing className={`w-3.5 h-3.5 ${isPriorityMode ? "animate-bounce" : ""}`} />
            Prioridad
          </button>

          {/* Auto Speak Toggle */}
          <button
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setAutoSpeak(!autoSpeak);
            }}
            className={`p-2 rounded-xl text-xs border transition-all ${
              autoSpeak
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-400 border-slate-200"
            }`}
            title={autoSpeak ? "Voz Automática Activada" : "Voz Automática Silenciada"}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Settings API Key Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl text-xs bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all neu-button"
            title="Configuración de API Key"
          >
            <Key className="w-4 h-4 text-amber-600" />
          </button>
        </div>
      </header>

      {/* API Key Modal / Settings Panel Banner */}
      {showSettings && (
        <div className="w-full max-w-5xl bg-white/95 backdrop-blur-md rounded-2xl p-4 mb-6 border border-amber-200 shadow-xl transition-all animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-600" /> Configurar GEMINI_API_KEY
            </h3>
            <span className="text-xs text-slate-400">Variable: NEXT_PUBLIC_GEMINI_API_KEY</span>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Ingresa tu clave de API para conectar con Google Gemini. Si utilizas un archivo `.env.local`
            con `NEXT_PUBLIC_GEMINI_API_KEY`, se detectará automáticamente.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              onClick={saveApiKey}
              className="bg-slate-900 text-white text-xs px-4 py-2 rounded-xl font-medium hover:bg-slate-800 transition-all flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Guardar
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="w-full max-w-5xl flex-1 flex flex-col md:flex-row gap-6 items-stretch mb-6">
        {/* LEFT PANEL: VISUAL CORE & AI STATUS HUD */}
        <section className="w-full md:w-80 neu-card rounded-3xl p-6 flex flex-col items-center justify-between text-center min-h-[380px]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200 text-xs font-semibold text-slate-600 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> VISUALIZADOR DE NÚCLEO
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {VOICE_PROFILES[selectedVoice].name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {VOICE_PROFILES[selectedVoice].description}
            </p>
          </div>

          {/* Core Halo Component */}
          <FridayCoreHalo state={aiState} isListening={isListening} />

          {/* Dynamic Typography Output Box */}
          <div className="w-full bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/80 shadow-inner">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">
              ESTADO DEL SISTEMA Y TIPOGRAFÍA DINÁMICA
            </p>
            <div className="min-h-[48px] flex items-center justify-center">
              <DynamicTypography state={aiState} className="text-sm">
                {isListening && "Escuchando tu comando de voz..."}
                {!isListening && aiState === "idle" && "F.R.I.D.A.Y. en estado de reposo. Lista para ayudarte."}
                {!isListening && aiState === "thinking" && "Procesando consulta y generando respuesta..."}
                {!isListening && aiState === "speaking" && "Sintetizando respuesta de audio..."}
                {!isListening && aiState === "priority" && "ALERTA DE PRIORIDAD: Respuesta prioritaria."}
              </DynamicTypography>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: CHAT INTERFACE & MARKDOWN DISPLAY */}
        <section className="flex-1 neu-card rounded-3xl p-4 sm:p-6 flex flex-col justify-between min-h-[480px]">
          {/* Chat Messages Scroll Window */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[500px] mb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                } animate-fadeIn`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {msg.role === "user" ? (
                    <>
                      <span className="text-[11px] font-bold text-slate-500">TÚ</span>
                      <User className="w-3.5 h-3.5 text-slate-400" />
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[11px] font-bold text-slate-800 tracking-wider">
                        F.R.I.D.A.Y.
                      </span>
                    </>
                  )}
                  <span className="text-[10px] text-slate-400 ml-1">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div
                  className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-4 text-sm shadow-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-slate-900 text-slate-50 rounded-tr-none"
                      : msg.isPriority
                      ? "bg-amber-50/90 border-2 border-amber-300 text-slate-900 rounded-tl-none font-medium"
                      : "bg-white/90 border border-slate-200/80 text-slate-800 rounded-tl-none neu-glass"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-slate max-w-none text-sm prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-100">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestions */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 text-xs">
            <button
              onClick={() =>
                handleSendMessage("F.R.I.D.A.Y., hazme un resumen del día y prioridades.")
              }
              className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-700 transition-all text-xs flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-500" /> Resumen del día
            </button>
            <button
              onClick={() =>
                handleSendMessage("¿Cuáles son tus características y cómo me puedes ayudar?")
              }
              className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-700 transition-all text-xs flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-500" /> Tus funciones
            </button>
            <button
              onClick={() =>
                handleSendMessage("Redacta un correo profesional solicitando una reunión de equipo.")
              }
              className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-700 transition-all text-xs flex items-center gap-1"
            >
              <Clock className="w-3 h-3 text-amber-500" /> Correo profesional
            </button>
          </div>

          {/* INPUT CONTROL BAR */}
          <div className="flex items-center gap-2 bg-white/90 p-2 rounded-2xl border border-slate-200/90 shadow-lg">
            {/* STT Microphone Button */}
            <button
              onClick={handleMicClick}
              disabled={!micSupported}
              className={`p-3 rounded-xl transition-all ${
                isListening
                  ? "bg-amber-500 text-white animate-pulse shadow-md shadow-amber-500/30"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              title={
                isListening
                  ? "Detener grabación de voz"
                  : "Presiona para hablar con F.R.I.D.A.Y."
              }
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5 text-amber-600" />
              )}
            </button>

            {/* Text Input */}
            <input
              type="text"
              placeholder={
                isListening ? "Escuchando tu voz..." : "Habla o escribe a F.R.I.D.A.Y..."
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none"
            />

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || aiState === "thinking"}
              className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-5xl text-center text-xs text-slate-400 py-2">
        F.R.I.D.A.Y. Assistant &copy; {new Date().getFullYear()} &bull; Impulsado por Google Gemini SDK (`@google/genai`)
      </footer>
    </div>
  );
}
