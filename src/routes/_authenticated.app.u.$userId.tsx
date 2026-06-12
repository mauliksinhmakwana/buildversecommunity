import { createFileRoute } from "@tanstack/react-router";
import { UserProfileView } from "@/components/UserProfileView";

export const Route = createFileRoute("/_authenticated/app/u/$userId")({
  component: PublicProfile,
});

function PublicProfile() {
  const { userId } = Route.useParams();
  return <UserProfileView userId={userId} />;
}
