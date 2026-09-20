"use client";

import React from "react";

export type FridayState = "idle" | "thinking" | "speaking" | "priority";

interface FridayCoreHaloProps {
  state: FridayState;
  isListening?: boolean;
}

export const FridayCoreHalo: React.FC<FridayCoreHaloProps> = ({
  state,
  isListening = false,
}) => {
  const getHaloStyle = () => {
    if (isListening) {
      return "animate-halo-gold ring-4 ring-amber-300/60 bg-amber-50/50 shadow-[0_0_50px_rgba(251,191,36,0.5)]";
    }
    switch (state) {
      case "thinking":
        return "animate-halo-gold ring-4 ring-amber-400/50 bg-amber-50/40 shadow-[0_0_45px_rgba(245,158,11,0.4)]";
      case "speaking":
        return "animate-halo-white ring-4 ring-slate-200/90 bg-white/80 shadow-[0_0_50px_rgba(255,255,255,1)]";
      case "priority":
        return "ring-4 ring-amber-500/80 bg-amber-100/60 shadow-[0_0_60px_rgba(217,119,6,0.6)] animate-pulse";
      case "idle":
      default:
        return "ring-1 ring-slate-200/80 bg-white/60 shadow-[0_10px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_0_30px_rgba(234,179,8,0.2)]";
    }
  };

  const getCoreColor = () => {
    if (isListening) return "from-amber-400 via-amber-300 to-yellow-100 animate-pulse";
    switch (state) {
      case "thinking":
        return "from-amber-500 via-yellow-400 to-amber-200 animate-spin";
      case "speaking":
        return "from-slate-700 via-amber-500 to-amber-300 animate-pulse";
      case "priority":
        return "from-amber-600 via-amber-500 to-yellow-300";
      case "idle":
      default:
        return "from-slate-200 via-slate-100 to-amber-100";
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center my-6 select-none">
      {/* Outer Halo Rings */}
      <div
        className={`relative w-44 h-44 sm:w-52 sm:h-52 rounded-full flex items-center justify-center transition-all duration-700 ease-in-out ${getHaloStyle()}`}
      >
        {/* Secondary Ambient Ring */}
        <div className="absolute inset-2 rounded-full border border-slate-200/60 backdrop-blur-md flex items-center justify-center">
          {/* Inner Dashed Futuristic Ring */}
          <div
            className={`absolute inset-4 rounded-full border border-dashed border-slate-300/70 transition-transform duration-1000 ${
              state === "thinking" || isListening ? "animate-[spin_10s_linear_infinite]" : ""
            }`}
          />

          {/* Central Core Element */}
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr ${getCoreColor()} p-[2px] shadow-lg transition-all duration-500 flex items-center justify-center`}
          >
            <div className="w-full h-full rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center p-2">
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-inner transition-transform duration-500 ${
                  state === "speaking"
                    ? "scale-125 shadow-[0_0_15px_rgba(234,179,8,0.8)]"
                    : "scale-100"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Audio Wave Visualizer Simulation when speaking or listening */}
        {(state === "speaking" || isListening || state === "thinking") && (
          <div className="absolute -bottom-6 flex items-center gap-1 px-3 py-1 bg-white/80 backdrop-blur-md rounded-full border border-slate-200/80 shadow-sm text-xs text-amber-700 font-medium">
            <span className="w-1.5 h-3 bg-amber-500 rounded-full animate-[bounce_1s_infinite_100ms]" />
            <span className="w-1.5 h-5 bg-amber-400 rounded-full animate-[bounce_1s_infinite_200ms]" />
            <span className="w-1.5 h-2 bg-amber-600 rounded-full animate-[bounce_1s_infinite_300ms]" />
            <span className="w-1.5 h-4 bg-amber-500 rounded-full animate-[bounce_1s_infinite_400ms]" />
            <span className="ml-1 text-[11px] uppercase tracking-wider font-semibold">
              {isListening ? "Escuchando" : state === "thinking" ? "Procesando" : "Respondiendo"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
