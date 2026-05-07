"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartContainerProps {
  children: React.ReactNode;
  height?: number;
  className?: string;
}

/**
 * Prevents Recharts SSR issues by only rendering charts client-side.
 * Also uses ResizeObserver to ensure the container has positive dimensions
 * before rendering, preventing the width(-1)/height(-1) warning.
 */
export function ChartContainer({ children, height = 240, className }: ChartContainerProps) {
  const [mounted, setMounted] = useState(false);
  const [hasSize, setHasSize] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !ref.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0) {
        setHasSize(true);
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [mounted]);

  if (!mounted || !hasSize) {
    return (
      <div ref={!mounted ? undefined : ref} style={{ height, minWidth: 1 }} className={`w-full ${className ?? ""}`}>
        <Skeleton
          style={{ height }}
          className={`w-full rounded-lg bg-[#122131]/60`}
        />
      </div>
    );
  }

  return (
    <div ref={ref} style={{ height, minWidth: 1 }} className={`w-full ${className ?? ""}`}>
      {children}
    </div>
  );
}
