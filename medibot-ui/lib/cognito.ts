/**
 * Cognito configuration that reads NEXT_PUBLIC_PORTAL_TYPE
 * and connects to the correct user pool.
 *
 * Portal types: "patient" | "doctor" | "admin"
 *
 * Each portal sets NEXT_PUBLIC_PORTAL_TYPE in its .env.local file.
 * This module maps that to the correct Cognito User Pool.
 */

export type PortalType = "patient" | "doctor" | "admin";

interface CognitoConfig {
  portalType: PortalType;
  userPoolId: string;
  clientId: string;
  region: string;
}

// Pool configuration per portal type
const POOL_CONFIG: Record<PortalType, { poolIdEnv: string; clientIdEnv: string }> = {
  patient: {
    poolIdEnv: "NEXT_PUBLIC_COGNITO_PATIENT_POOL_ID",
    clientIdEnv: "NEXT_PUBLIC_COGNITO_PATIENT_CLIENT_ID",
  },
  doctor: {
    poolIdEnv: "NEXT_PUBLIC_COGNITO_DOCTOR_POOL_ID",
    clientIdEnv: "NEXT_PUBLIC_COGNITO_DOCTOR_CLIENT_ID",
  },
  admin: {
    poolIdEnv: "NEXT_PUBLIC_COGNITO_ADMIN_POOL_ID",
    clientIdEnv: "NEXT_PUBLIC_COGNITO_ADMIN_CLIENT_ID",
  },
};

export function getCognitoConfig(): CognitoConfig {
  const portalType = (process.env.NEXT_PUBLIC_PORTAL_TYPE || "patient") as PortalType;

  if (!POOL_CONFIG[portalType]) {
    throw new Error(`Invalid NEXT_PUBLIC_PORTAL_TYPE: ${portalType}. Must be patient, doctor, or admin.`);
  }

  const config = POOL_CONFIG[portalType];

  // Fallback to generic env vars if portal-specific ones aren't set
  const userPoolId =
    process.env[config.poolIdEnv] ||
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
    "";

  const clientId =
    process.env[config.clientIdEnv] ||
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ||
    "";

  return {
    portalType,
    userPoolId,
    clientId,
    region: process.env.NEXT_PUBLIC_AWS_REGION || "ap-south-1",
  };
}
