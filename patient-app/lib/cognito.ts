import { Amplify } from "aws-amplify";
import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  getCurrentUser as amplifyGetCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
    },
  },
});

export async function signIn(phone: string, password: string) {
  const result = await amplifySignIn({
    username: phone,
    password,
  });
  return result;
}

export async function signUp(phone: string, password: string, name: string) {
  const result = await amplifySignUp({
    username: phone,
    password,
    options: {
      userAttributes: {
        phone_number: phone,
        name,
      },
    },
  });
  return result;
}

export async function signOut() {
  await amplifySignOut();
}

export async function getCurrentUser() {
  try {
    const user = await amplifyGetCurrentUser();
    return user;
  } catch {
    return null;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch {
    return null;
  }
}
