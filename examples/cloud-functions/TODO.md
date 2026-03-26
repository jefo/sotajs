# TODO: SotaJS Cloud Functions Phase 1

## Core Orchestration (Infrastructure)
- [x] **Public Access (IAM):** Implement `setAccessBindings` in `YandexCloudAdapter` to allow `allUsers` to invoke functions if `makePublic` is true.
- [x] **Service Account Support:** Allow passing `serviceAccountId` during deployment.
- [x] **URL Retrieval:** Return `http_gateway_url` in `DeployFunctionResult`.
- [ ] **Key File Auth:** Support Yandex Service Account JSON keys in `YandexIdentityAdapter`.

## Developer Experience (Application)
- [ ] **Validation:** Add Zod validation for Yandex-specific constraints (name length, memory steps).
- [ ] **Cleanup Command:** Command to delete old versions or unused functions.
- [ ] **Logs Query:** Query to fetch last N lines of function logs.

## Domain
- [ ] **Invariants:** Ensure `CloudFunction` aggregate validates runtime and memory limits before infrastructure call.
