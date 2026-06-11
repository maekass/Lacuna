"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { Menu, X } from "lucide-react";
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const sheetVariants = cva(
  "fixed z-50 flex flex-col border-lacuna-border bg-lacuna-surface shadow-xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
  {
    variants: {
      side: {
        left: "inset-y-0 left-0 h-full w-[min(20rem,85vw)] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right:
          "inset-y-0 right-0 h-full w-[min(20rem,85vw)] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      },
    },
    defaultVariants: {
      side: "left",
    },
  },
);

function SheetOverlay({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-lacuna-plum/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

interface SheetContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

function SheetContent({
  side,
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-lacuna-border-subtle px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-sm font-semibold text-lacuna-text-primary", className)}
      {...props}
    />
  );
}

function SheetBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto p-4", className)} {...props} />;
}

interface SheetHamburgerProps {
  label?: string;
  className?: string;
}

function SheetHamburger({ label = "Open menu", className }: SheetHamburgerProps) {
  return (
    <SheetTrigger
      className={cn(
        "touch-target inline-flex items-center gap-2 rounded-xl border border-lacuna-border bg-lacuna-surface px-4 py-2.5 text-sm font-medium text-lacuna-text-primary shadow-sm transition-colors hover:bg-lacuna-surface-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-lacuna-lavender",
        className,
      )}
      aria-label={label}
    >
      <Menu className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </SheetTrigger>
  );
}

interface MobileSheetNavProps {
  title: string;
  triggerLabel: string;
  children: ReactNode;
  side?: "left" | "right";
}

/** Side drawer with hamburger trigger for small viewports. */
export function MobileSheetNav({
  title,
  triggerLabel,
  children,
  side = "left",
}: MobileSheetNavProps) {
  return (
    <Sheet>
      <SheetHamburger label={triggerLabel} />
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetClose
            className="touch-target rounded-md p-1 text-lacuna-text-muted hover:bg-lacuna-surface-subtle hover:text-lacuna-text-primary"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </SheetClose>
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetHamburger,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
