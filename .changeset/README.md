# Changesets

Add a changeset to every pull request that changes the published package:

```bash
npm run changeset
```

Use a patch for compatible fixes and a minor while below 1.0 for features or breaking API changes. Documentation, tests, CI, and other non-release changes do not need a changeset.
