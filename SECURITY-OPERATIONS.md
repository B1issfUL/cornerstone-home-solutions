# Security audit and provider checklist

## Release decision

GitHub Pages cannot run an API or enforce atomic quotas. The former browser Maps
key, Formspree form ID, public Firestore subscription and unsupported live numeric
claims are removed from the site path. Direct browser access to the former Formspree
and Maps origins is also excluded by the new connect-src allowlist. This is not a
provider-side shutdown: old bundles, browser caches and externally known credentials
or URLs can outlive the release. The owner dashboard is still a separate, direct
Firebase client. No per-user quota or global spending cap is active in this release.

## Before considering provider exposure closed

1. In the Google Cloud project, identify the former site Maps key, check that no other
   app needs it, and revoke it. Disable unused Maps and Places services and monitor
   usage on the affected project. Do not revoke the Firebase browser key as a
   substitute. Remove obsolete Maps and Formspree GitHub secrets once retired.
2. In Formspree, preserve existing submissions according to the approved retention
   policy and ask Formspree support how to close the old submission endpoint without
   deleting the records if the dashboard cannot do so. Origin restrictions and spam
   checks do not enforce a hard per-user request quota.
3. In the production Firestore default database, capture the current rules and
   publish the tested repository rules. Verify anonymous reads are denied, then
   verify the owner dashboard can read and save. Do not change business data for
   testing. Investigate Firebase Auth/App Check, quotas, alerts and backup recovery
   for the existing project before imposing account-wide changes.
4. Configure billing alerts and provider hard caps/quotas where supported and
   suitable for the project. An alert is not a cap. Set thresholds based on an
   owner-approved budget, not an assumed plan. Do not re-enable public APIs until
   the old direct paths are closed and new limits pass deployment tests.

## Re-enable criteria

Use a trusted hosted gateway with fixed upstream routes and credentials restricted
to that gateway. Derive account identities from verified tokens and network identities
from trusted ingress (never arbitrary forwarded headers). Reserve per-identity minute,
daily and monthly counters plus a global daily/monthly budget atomically before any
billable call. Use upstream SKU costs or conservative request budgets, bounded payload
sizes and timeouts, replay protection, privacy-preserving abuse telemetry, and no
automatic paid retries. Reject at limit with 429, fail closed on storage loss, and test
concurrency, rollover, bypass attempts and backend outages. No such host or budget
configuration was provisioned by this Pages release.

## Verification scope and remaining audit items

- Clean install, npm audit and production artifact scan cover the published build.
  Browser checks cover keyboard, responsive layout, motion and public network isolation;
  they are not a full WCAG 2.2 AA conformance or physical-device assessment.
- Emulator tests cover owner write validation and concurrent unauthorized reads.
  They are not a live policy publication or API quota/concurrency test.
- Pages metadata can restrict connections but cannot set response headers such as
  frame-ancestors. Review stronger header controls if hosting changes. Firebase IAM,
  MFA and provider-side billing configuration require account access.
- The bilingual privacy notice and site terms describe email intake and preferences;
  no public payments, marketing signup or tracking tags were added. Confirm legal
  entity, retention/deletion process, vendor terms, asset provenance and jurisdiction
  before claiming compliance. Confirm marketing and unsubscribe practices separately
  before any commercial campaign.
- A normal Git revert of this release restores old provider calls and old public
  contact copy. Do not use a blind rollback: preserve the phone removal and
  fail-closed policy in any repair release.

References: [Maps key security](https://developers.google.com/maps/api-security-best-practices),
[Google Cloud budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets),
[Formspree domain controls](https://help.formspree.io/articles/form-and-project-settings/restrict-to-domain),
[WCAG 2.2](https://www.w3.org/TR/WCAG22/).
