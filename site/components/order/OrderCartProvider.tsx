import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CartLine,
  DeliveryAddress,
  DeliveryInstructions,
  FulfillmentMode,
  OrderTiming,
  PlacedOrderSnapshot,
} from "@/lib/order-types";
import { cartTotals, defaultDeliveryInstructions, minScheduleValue } from "@/lib/order-utils";

const STORAGE_KEY = "roru-order-draft-v1";
const TRACKING_STORAGE_KEY = "roru-order-tracking-v1";

type Persisted = {
  lines: CartLine[];
  fulfillment: FulfillmentMode;
  address: DeliveryAddress | null;
  timing: OrderTiming;
  deliveryInstructions?: DeliveryInstructions;
};

type OrderCartContextValue = {
  lines: CartLine[];
  fulfillment: FulfillmentMode;
  address: DeliveryAddress | null;
  timing: OrderTiming;
  deliveryInstructions: DeliveryInstructions;
  totals: ReturnType<typeof cartTotals>;
  itemCount: number;
  cartOpen: boolean;
  checkoutOpen: boolean;
  activeOrderTracking: PlacedOrderSnapshot | null;
  trackingSheetOpen: boolean;
  setFulfillment: (mode: FulfillmentMode) => void;
  setAddress: (address: DeliveryAddress | null) => void;
  setTiming: (timing: OrderTiming) => void;
  setDeliveryInstructions: (instructions: DeliveryInstructions) => void;
  addItem: (catalogId: string) => void;
  decrementItem: (catalogId: string) => void;
  removeItem: (catalogId: string) => void;
  clearCart: () => void;
  startOrderTracking: (snapshot: PlacedOrderSnapshot) => void;
  openOrderTracking: () => void;
  closeOrderTracking: () => void;
  completeOrderTracking: () => void;
  openCart: () => void;
  closeCart: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
};

const OrderCartContext = createContext<OrderCartContextValue | null>(null);

function readPersisted(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

function readPersistedTracking(): PlacedOrderSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TRACKING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlacedOrderSnapshot;
  } catch {
    return null;
  }
}

function defaultTiming(): OrderTiming {
  return { mode: "asap" };
}

export function OrderCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [fulfillment, setFulfillmentState] = useState<FulfillmentMode>("delivery");
  const [address, setAddressState] = useState<DeliveryAddress | null>(null);
  const [timing, setTimingState] = useState<OrderTiming>(defaultTiming);
  const [deliveryInstructions, setDeliveryInstructionsState] =
    useState<DeliveryInstructions>(defaultDeliveryInstructions);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeOrderTracking, setActiveOrderTracking] =
    useState<PlacedOrderSnapshot | null>(null);
  const [trackingSheetOpen, setTrackingSheetOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readPersisted();
    if (saved) {
      setLines(saved.lines);
      setFulfillmentState(saved.fulfillment);
      setAddressState(saved.address);
      setTimingState(saved.timing);
      setDeliveryInstructionsState(
        saved.deliveryInstructions ?? defaultDeliveryInstructions(),
      );
    }
    const savedTracking = readPersistedTracking();
    if (savedTracking) {
      setActiveOrderTracking(savedTracking);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: Persisted = {
      lines,
      fulfillment,
      address,
      timing,
      deliveryInstructions,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [lines, fulfillment, address, timing, deliveryInstructions, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (activeOrderTracking) {
      sessionStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(activeOrderTracking));
    } else {
      sessionStorage.removeItem(TRACKING_STORAGE_KEY);
    }
  }, [activeOrderTracking, hydrated]);

  const setFulfillment = useCallback((mode: FulfillmentMode) => {
    setFulfillmentState(mode);
    if (mode === "pickup") {
      setAddressState(null);
    }
  }, []);

  const setAddress = useCallback((next: DeliveryAddress | null) => {
    setAddressState(next);
  }, []);

  const setTiming = useCallback((next: OrderTiming) => {
    setTimingState(next);
  }, []);

  const setDeliveryInstructions = useCallback((next: DeliveryInstructions) => {
    setDeliveryInstructionsState(next);
  }, []);

  const addItem = useCallback((catalogId: string) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.catalogId === catalogId);
      if (existing) {
        return prev.map((line) =>
          line.catalogId === catalogId
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...prev, { catalogId, quantity: 1 }];
    });
    setCartOpen(true);
  }, []);

  const decrementItem = useCallback((catalogId: string) => {
    setLines((prev) =>
      prev
        .map((line) =>
          line.catalogId === catalogId
            ? { ...line, quantity: line.quantity - 1 }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((catalogId: string) => {
    setLines((prev) => prev.filter((line) => line.catalogId !== catalogId));
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    setCartOpen(false);
    setCheckoutOpen(false);
  }, []);

  const startOrderTracking = useCallback((snapshot: PlacedOrderSnapshot) => {
    setActiveOrderTracking(snapshot);
    setTrackingSheetOpen(true);
    setLines([]);
    setCartOpen(false);
    setCheckoutOpen(false);
  }, []);

  const openOrderTracking = useCallback(() => {
    setTrackingSheetOpen(true);
  }, []);

  const closeOrderTracking = useCallback(() => {
    setTrackingSheetOpen(false);
  }, []);

  const completeOrderTracking = useCallback(() => {
    setActiveOrderTracking(null);
    setTrackingSheetOpen(false);
  }, []);

  const totals = useMemo(
    () => cartTotals(lines, fulfillment, address),
    [lines, fulfillment, address],
  );

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );

  const value = useMemo<OrderCartContextValue>(
    () => ({
      lines,
      fulfillment,
      address,
      timing,
      deliveryInstructions,
      totals,
      itemCount,
      cartOpen,
      checkoutOpen,
      activeOrderTracking,
      trackingSheetOpen,
      setFulfillment,
      setAddress,
      setTiming,
      setDeliveryInstructions,
      addItem,
      decrementItem,
      removeItem,
      clearCart,
      startOrderTracking,
      openOrderTracking,
      closeOrderTracking,
      completeOrderTracking,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      openCheckout: () => {
        setCartOpen(false);
        setCheckoutOpen(true);
      },
      closeCheckout: () => setCheckoutOpen(false),
    }),
    [
      lines,
      fulfillment,
      address,
      timing,
      deliveryInstructions,
      totals,
      itemCount,
      cartOpen,
      checkoutOpen,
      activeOrderTracking,
      trackingSheetOpen,
      setFulfillment,
      setAddress,
      setTiming,
      setDeliveryInstructions,
      addItem,
      decrementItem,
      removeItem,
      clearCart,
      startOrderTracking,
      openOrderTracking,
      closeOrderTracking,
      completeOrderTracking,
    ],
  );

  return (
    <OrderCartContext.Provider value={value}>{children}</OrderCartContext.Provider>
  );
}

export function useOrderCart() {
  const ctx = useContext(OrderCartContext);
  if (!ctx) {
    throw new Error("useOrderCart must be used within OrderCartProvider");
  }
  return ctx;
}

export { minScheduleValue };
