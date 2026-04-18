"use client";

import dynamic from "next/dynamic";

const RetellHome = dynamic(() => import("@/components/RetellHome"), {
  ssr: false,
  loading: () => (
    <main style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#a39a8e" }}>
      Loading…
    </main>
  ),
});

export default function Page() {
  return <RetellHome />;
}
