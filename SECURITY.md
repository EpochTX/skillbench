# Security Policy

## Supported versions

Security fixes are provided for the latest published minor release.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability that could expose user data, bypass redaction, or cause SkillBench to execute analyzed content. Use GitHub's private vulnerability reporting for this repository. If private reporting is not yet enabled, contact the maintainer through the address published in the repository's Security tab.

Include a minimal reproduction, affected version, expected impact, and suggested mitigation when available. You can expect an acknowledgement within five business days.

## Handling secrets

Never submit a real API key, token, private key, cookie, `.env` file, or credential-bearing instruction in an issue, pull request, test fixture, screenshot, or security report. Replace values with synthetic strings that cannot authenticate. If a real credential is exposed accidentally, revoke it before reporting.

SkillBench treats every scanned file as untrusted text. The default analyzer performs static analysis only: it does not execute commands, scripts, hooks, JavaScript, Python, or shell content found in an instruction file.
