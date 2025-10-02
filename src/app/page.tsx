// src/app/page.tsx
"use client";
import dynamic from "next/dynamic";
import DeckGlMap from "@/components/DeckGlMap";
export default function HomePage() {
  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <DeckGlMap />
    </main>
  );
}
