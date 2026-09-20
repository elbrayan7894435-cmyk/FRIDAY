"use client";

import React from "react";
import { FridayState } from "./FridayCoreHalo";

interface DynamicTypographyProps {
  state: FridayState;
  text?: string;
  className?: string;
  children?: React.ReactNode;
}

export const DynamicTypography: React.FC<DynamicTypographyProps> = ({
  state,
  text,
  className = "",
  children,
}) => {
  // Map AI State to required font weights, styles and transitions
  const getTypographyClasses = () => {
    switch (state) {
      case "idle":
        // Reposo: fina y ligera
        return "font-extralight text-slate-600 tracking-wide transition-all duration-500 ease-out";
      case "thinking":
        // Pensando/Procesando: itálica animada
        return "italic font-light text-amber-700 tracking-wider animate-pulse transition-all duration-300";
      case "speaking":
        // Respondiendo: peso medio fluido
        return "font-medium text-slate-800 leading-relaxed tracking-normal transition-all duration-300";
      case "priority":
        // Notificación de prioridad: negrita elegante
        return "font-bold text-slate-900 tracking-tight transition-all duration-300";
      default:
        return "font-normal text-slate-700";
    }
  };

  return (
    <span className={`${getTypographyClasses()} ${className}`}>
      {text || children}
    </span>
  );
};
