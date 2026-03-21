# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security issues by emailing: mbugus94@gmail.com

Please include:
- A description of the vulnerability
- Steps to reproduce (if applicable)
- Possible impact
- Suggested fix (if you have one)

### Response Timeline

- We will acknowledge receipt of your report within 48 hours
- We will provide a more detailed response within 7 days
- We will work with you to understand and resolve the issue

### Security Best Practices

When using this project:

1. **Keep dependencies updated** - Run `npm audit` or check for security advisories
2. **Use strong secrets** - Generate cryptographically secure random keys
3. **Validate inputs** - Never trust user input
4. **Sanitize outputs** - Prevent injection attacks
5. **Enable security headers** - Use helmet or similar middleware
6. **Rate limit APIs** - Prevent abuse and brute force attacks

### Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed and fixed. Users will be notified through:
- GitHub releases
- Security advisories
- Changelog updates

Thank you for helping keep this project secure!
