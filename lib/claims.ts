import type { IdTokenClaims } from "./oidc";

// Org-Membership-Validation für Multi-Instanz-Betrieb.
//
// Konvention: Pro App in loschke-auth gibt es genau eine Organization,
// deren slug dem OAuth-Client-ID der App entspricht. Login schlägt fehl,
// wenn der User in dieser Org keine approved Membership hat.
//
// Damit ist OIDC_CLIENT_ID die einzige zentrale App-Identität — kein
// zweites Setting nötig. AUTH_REQUIRED_ORG_SLUG bleibt als optionaler
// Override (Edge-Cases: Slug weicht vom Client-ID ab).

export type OrgMembership = {
  id: string;
  slug: string;
  type: string;
  role: string;
};

export type OrgMembershipResult =
  | { reason: "no_check_configured" }
  | { reason: "no_membership"; required: string }
  | { reason: "membership_ok"; org: OrgMembership };

export function getRequiredOrgSlug(): string | null {
  const override = process.env.AUTH_REQUIRED_ORG_SLUG?.trim();
  if (override) return override;
  return process.env.OIDC_CLIENT_ID?.trim() ?? null;
}

export function checkOrgMembership(claims: IdTokenClaims): OrgMembershipResult {
  const required = getRequiredOrgSlug();
  if (!required) return { reason: "no_check_configured" };

  const orgs = claims.organizations ?? [];
  const match = orgs.find((o) => o.slug === required);
  if (!match) return { reason: "no_membership", required };

  return { reason: "membership_ok", org: match };
}
