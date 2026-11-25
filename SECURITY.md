# Security policy

## Reporting a vulnerability

Please do not put the details of a security problem in a public issue.

This repository has no private reporting channel yet: GitHub's private vulnerability reporting is
turned off, and no security contact address has been published. To report a problem, open an issue
that says you have a security report and asks for a private way to send it. Leave out what the
problem is and how to trigger it. The maintainer will reply with a private channel.

Please include the version of `@mcurcio/patchbay` you tested, what an attacker can do, and the
smallest code that shows the problem.

## What is in scope

The published package `@mcurcio/patchbay`: its components, hooks and stylesheets. patchbay runs in
the browser and makes no network requests; the issues most likely to matter are markup injection
through a component (for example a prop rendered as HTML) and what `usePersistentState` and
`useTheme` read back from `localStorage`.

Storybook, the tests and the repository's tooling are not published and are out of scope.

## Supported versions

Only the newest release is supported. Fixes are released from `main`; older releases are not
patched.
