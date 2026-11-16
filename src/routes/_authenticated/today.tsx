import { createFileRoute, redirect } from "@tanstack/react-router";
import { localISODate } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/today")({
  beforeLoad: () => {
    throw redirect({ to: "/paper/$date", params: { date: localISODate() }, replace: true });
  },
});
