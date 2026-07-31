# Security Policy

## Supported versions

Fanlisting Revival is developed on the `main` branch, and security fixes land in
the latest release. If you're self-hosting, running the most recent version is
the best way to stay covered.

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅        |
| < 1.0   | ❌        |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
pull requests, or discussions.**

Instead, report them privately through GitHub's **[Private Vulnerability
Reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)**
on this repository (the **Security → Report a vulnerability** button). That
keeps the details confidential until a fix is available.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (a proof of concept if you have one).
- Any suggested remediation.

You can expect an initial response within a few days. Once the issue is
confirmed and fixed, a new release will be published and — with your permission
— you'll be credited in the advisory.

## Scope & self-hosting notes

Fanlisting Revival is self-hosted software, so some of your security posture
depends on how you deploy it. Before reporting, please confirm you're running a
production-appropriate configuration (see the README's "Deploying & hosting"
section):

- `NODE_ENV=production`, a strong unique `SESSION_SECRET`, and `APP_URL` set.
- Served over HTTPS (the app sets secure cookies and `trust proxy` in
  production).
- SMTP configured, so email is delivered rather than logged.

Issues that require an insecure/misconfigured deployment (e.g. a default
`SESSION_SECRET`, or serving over plain HTTP) are configuration problems rather
than vulnerabilities in the software itself.
