// src/app/page.tsx
"use client";
import dynamic from "next/dynamic";

// Dynamically import the component, disabling server-side rendering
const DeckGlMap = dynamic(() => import("../components/DeckGlMap"), {
  ssr: false,
  loading: () => <p>Loading map...</p>, // Optional loading state
});

export default function HomePage() {
  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <DeckGlMap />
    </main>
  );
}
