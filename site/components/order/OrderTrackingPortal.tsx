import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { OrderTrackingSheet } from "@/components/order/OrderTrackingSheet";
import { useOrderCart } from "@/components/order/OrderCartProvider";

export function OrderTrackingPortal() {
  const {
    activeOrderTracking,
    trackingSheetOpen,
    closeOrderTracking,
    completeOrderTracking,
  } = useOrderCart();
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRoot(document.body);
  }, []);

  if (!root || !activeOrderTracking || !trackingSheetOpen) return null;

  return createPortal(
    <div className="order-portals">
      <OrderTrackingSheet
        order={activeOrderTracking}
        onDismiss={closeOrderTracking}
        onComplete={completeOrderTracking}
      />
    </div>,
    root,
  );
}
