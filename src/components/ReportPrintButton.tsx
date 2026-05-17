"use client";

import { Printer } from "lucide-react";

export default function ReportPrintButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      <Printer size={16} aria-hidden />
      Guardar PDF
    </button>
  );
}
