import type { Metadata } from "next";
import { BookingSection } from "@/components/BookingSection";
import { PageOverlayShell } from "@/components/PageOverlayShell";

export const metadata: Metadata = {
  title: "RORUBARU | Appointment",
  description:
    "Book an appointment at RORUBARU, Hong Kong's original hand roll bar.",
};

export default function ReservePage() {
  return (
    <PageOverlayShell contentClassName="roru-home-overlay-panel--fill">
      <div className="roru-events-page roru-reserve-page">
        <BookingSection />
      </div>
    </PageOverlayShell>
  );
}
