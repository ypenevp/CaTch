import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/services/profile";
import useAuthStore from "@/store/AuthStore";

export const profileKeys = {
  all: ["profile"],
  me: () => [...profileKeys.all, "me"],
};

export function useProfile() {
  const isLoggedIn = useAuthStore((s) => !!s.user);
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: ({ signal }) => getProfile({ signal }),
    enabled: isLoggedIn,
  });
}
