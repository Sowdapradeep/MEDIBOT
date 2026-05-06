"use client";

import { useState, useEffect, useCallback } from "react";
import { Amplify } from "aws-amplify";
import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  getCurrentUser as amplifyGetCurrentUser,
  fetchAuthSession,
  confirmSignIn as amplifyConfirmSignIn,
} from "aws-amplify/auth";
import { getCognitoConfig } from "../lib/cognito";

interface AuthUser {
  userId: string;
  username: string;
  portalType: string;
}

interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

// Configure Amplify once based on portal type
const config = getCognitoConfig();
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.userPoolId,
      userPoolClientId: config.clientId,
    },
  },
});

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await amplifyGetCurrentUser();
      setUser({
        userId: currentUser.userId,
        username: currentUser.username,
        portalType: config.portalType,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const signIn = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const result = await amplifySignIn({ username, password });

      // Handle OTP challenge for patient portal (phone-based auth)
      if (result.nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_SMS_MFA_CODE") {
        // Caller should handle OTP confirmation separately
        return;
      }

      await checkUser();
    } finally {
      setLoading(false);
    }
  }, [checkUser]);

  const signOut = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch {
      return null;
    }
  }, []);

  return { user, loading, signIn, signOut, getToken };
}
