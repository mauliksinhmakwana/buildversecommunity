import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { UserProfileView } from "@/components/UserProfileView";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: Profile,
});

function Profile() {
  const { user } = useAuth();
  if (!user) return null;
  return <UserProfileView userId={user.id} />;
}
