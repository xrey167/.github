# Auto-update

The app ships with a feature-gated scaffold for [tauri-plugin-updater].
Default builds **do not** auto-update — you must provision release
infrastructure first.

## What's already in the codebase

- `tauri-plugin-updater` is an *optional* Cargo dep behind the `updater`
  feature flag (see `src-tauri/Cargo.toml`).
- The Rust plugin is registered in `src-tauri/src/lib.rs` only when the
  `updater` feature is on.
- `@tauri-apps/plugin-updater` is in `package.json` and the React side
  has `<UpdateBanner>` (`src/components/UpdateBanner.tsx`) wired into
  the top of `<AppShell>` in `src/App.tsx`.
- The banner polls `check()` on mount and every hour; failures are
  silent so default builds never see "plugin not registered" toasts.

## What you need to provision before turning it on

1. **A Tauri signing keypair.**
   ```sh
   npx @tauri-apps/cli signer generate -w ~/.tauri/dataforseo.key
   ```
   The CLI prints a private key (keep secret — store as the
   `TAURI_PRIVATE_KEY` GitHub secret) and a public key.

2. **A signed-release pipeline.** Extend the existing
   `dataforseo-app-ci.yml` workflow with a release job that builds for
   macOS / Windows / Linux, signs the bundles using `TAURI_PRIVATE_KEY`,
   and publishes them to GitHub Releases. The standard pattern is
   documented at <https://v2.tauri.app/distribute/sign/>.

3. **An update feed.** The simplest option is a generated `latest.json`
   uploaded to each GitHub release; the URL pattern is:

   ```
   https://github.com/<owner>/<repo>/releases/latest/download/latest.json
   ```

## How to enable

1. Add the public key from step 1 plus the feed URL to `tauri.conf.json`:

   ```jsonc
   {
     "plugins": {
       "updater": {
         "active": true,
         "endpoints": [
           "https://github.com/<owner>/<repo>/releases/latest/download/latest.json"
         ],
         "pubkey": "<public key from step 1>"
       }
     }
   }
   ```

2. Build with the feature on:

   ```sh
   cargo tauri build --features updater
   ```

3. Cut a signed release. The `<UpdateBanner>` will surface it inside
   the running app within an hour (or immediately on next launch).

## Capabilities

The plugin needs the `updater:default` permission. Add it to your
`src-tauri/capabilities/default.json` (create the file if it doesn't
exist):

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capability set",
  "windows": ["main"],
  "permissions": ["updater:default"]
}
```

## Local-only builds

Default `cargo tauri build` (no feature flag) is unchanged: the updater
dep isn't compiled in, the banner is dormant, and the app won't try to
phone home. This is how OSS / forked builds should ship.

[tauri-plugin-updater]: https://v2.tauri.app/plugin/updater/
