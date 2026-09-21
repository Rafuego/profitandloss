"use client";

// Shared single-view page: only the Pods board, no nav, no detail panels.
// Gated by PODS_PASSWORD (or the full APP_PASSWORD) in middleware.ts.
import App from "@/components/App";

export default function PodsOnly() {
  return <App lockedView="pods" />;
}
