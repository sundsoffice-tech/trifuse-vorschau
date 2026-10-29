"use client";

export function PrintButton({ className = "btn btn-secondary" }: { className?: string }) {
  return <button type="button" className={className} onClick={() => window.print()}>Drucken / PDF</button>;
}
