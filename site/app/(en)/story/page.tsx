import type { Metadata } from "next";
import { PlaceholderView } from "@/components/views/PlaceholderView";

export const metadata: Metadata = {
  title: "Story",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StoryPage() {
  return <PlaceholderView />;
}
