import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useOnboardingCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setNeedsOnboarding(false);
        setChecking(false);
        return;
      }

      const { data } = await supabase
        .from("onboarding_responses")
        .select("completed")
        .eq("user_id", user.id)
        .maybeSingle();

      setNeedsOnboarding(!data?.completed);
      setChecking(false);
    };

    if (!authLoading) check();
  }, [user, authLoading]);

  return { needsOnboarding, checking };
};
