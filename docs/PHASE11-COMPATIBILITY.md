# Phase 11 Hardening Compatibility Matrix

| Capability | Status | Enforcement / measurement |
| --- | --- | --- |
| SQLite operation timing | Supported | `measureOperation` server timings |
| SQLite query-plan inspection | Supported | Fixed `EXPLAIN QUERY PLAN` profiling |
| Performance p50/p95/max | Supported | Bounded recent `AuditLog` samples |
| Performance budgets | Supported | Explicit engineering targets in code/admin UI |
| Performance sample retention | Bounded | Pruned to recent 2,000 samples |
| Command/query history | Paginated | 25 rows per stream/page, page capped |
| Admin users | Bounded | Maximum 100 recent users |
| Admin audit log | Bounded | Maximum 100 recent audit records |
| Platform-control cache | Supported | 5-second server TTL, write invalidation, transaction bypass |
| Authentication rate limit | Supported | IP-scoped process-local limiter |
| CLI/KQL/security rate limit | Supported | Authenticated user-scoped limiter |
| Admin/instructor mutation rate limit | Supported | Authenticated actor-scoped limiter |
| JSON body byte limits | Supported | Content-Length + actual UTF-8 byte checks |
| Unsafe method origin checks | Supported | Origin/Referer + Sec-Fetch-Site |
| Firebase session cookie | `SameSite=Strict` | HttpOnly + production Secure |
| Sign-in CSRF token | Supported | HttpOnly strict cookie + timing-safe compare |
| Content Security Policy | Supported | Firebase/Google-compatible allowlist, deny-by-default |
| Clickjacking defense | Supported | CSP `frame-ancestors 'none'` + X-Frame-Options DENY |
| HSTS | Production only | One-year includeSubDomains |
| MIME sniff prevention | Supported | `nosniff` |
| Sensitive browser permissions | Restricted | camera/mic/geolocation/payment/USB disabled |
| Keyboard skip navigation | Supported, tested | Skip link → `#main-content` |
| Focus visibility | Supported, tested | Explicit `:focus-visible` outline |
| Reduced motion | Supported, tested | `prefers-reduced-motion: reduce` rules |
| Distributed rate limiting | Not yet | Phase 12 deployment concern; current limiter is process-local |
| Nonce-based strict CSP | Not yet | Current framework-compatible CSP permits inline runtime content |
