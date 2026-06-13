"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs rounded-lg border border-lacuna-border-subtle bg-lacuna-surface-inverse px-3 py-2 text-xs text-lacuna-text-inverse shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

interface LacunaTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>["side"];
  className?: string;
}

/** Opinionated tooltip with lacuna inverse surface styling. */
export function LacunaTooltip({
  content,
  children,
  side = "top",
  className,
}: LacunaTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
