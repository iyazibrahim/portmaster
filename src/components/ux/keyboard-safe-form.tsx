"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scrollable form shell that keeps focused fields visible above the virtual keyboard.
 */
export function KeyboardSafeForm({
  children,
  className,
  onSubmit,
}: {
  children: ReactNode;
  className?: string;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const padRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    function onFocusIn(e: FocusEvent) {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (
        target.tagName !== "INPUT" &&
        target.tagName !== "TEXTAREA" &&
        target.tagName !== "SELECT"
      ) {
        return;
      }
      window.setTimeout(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 80);
    }

    form.addEventListener("focusin", onFocusIn);
    return () => form.removeEventListener("focusin", onFocusIn);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    const pad = padRef.current;
    if (!vv || !pad) return;

    function sync() {
      if (!vv || !pad) return;
      const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      pad.style.height = keyboard > 0 ? `${keyboard + 16}px` : "0px";
    }

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  return (
    <form
      ref={formRef}
      className={cn("flex w-full flex-col gap-4", className)}
      onSubmit={onSubmit}
    >
      {children}
      <div ref={padRef} aria-hidden className="shrink-0" />
    </form>
  );
}
