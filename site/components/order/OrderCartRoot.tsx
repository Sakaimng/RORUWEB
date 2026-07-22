"use client";

import { OrderCartProvider } from "@/components/order/OrderCartProvider";
import { OrderTrackingPortal } from "@/components/order/OrderTrackingPortal";
import type { ReactNode } from "react";

export function OrderCartRoot({ children }: { children: ReactNode }) {
  return (
    <OrderCartProvider>
      {children}
      <OrderTrackingPortal />
    </OrderCartProvider>
  );
}
