# CFA-resources

Rootfs mirror and index for [Coding for Android](https://github.com/AROAN110/Coding-for-Android).

This repository is the default download source the app uses on first launch. It contains nothing but a static index and the container image itself.

## Layout

| File | Purpose |
|------|---------|
| `index.json` | Repository index; the app reads this first to find the current rootfs |
| `alpine-minirootfs-*`.tar.gz` | The container image referenced by the index |

## index.json format

```json
{
  "version": 1,
  "updated": "2026-11-14",
  "rootfs": [
    {
      "name": "alpine-minirootfs-3.24.2-a1rch64.tar.gz",
      "version": "3.24.2",
      "arch": "aarch64",
      "size": 4028030,
      "sha256": "9bf70a7f..."
    }
  ]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | File name of the rootfs, must match the actual file in this repo |
| `size` | recommended | Byte count. The app verifies the download against it (+20% tolerance); omit to skip the check |
| `sha256` | optional | Currently informational only; the app does not verify it yet |
| `version` / `arch` | optional | Informational only |

The **first entry** of the `rootfs` array is treated as the current release. To publish a new version, put the new tarball here and insert its entry at the top of the array -- the app always picks the first one, so no app update is needed.

## Current contents

- Alpine minirootfs 3.24.2, aarch64, 4,028,030 bytes, 515 entries
- SHA-256: `9bf70a7f18ea44094cbb5f70c58f9af129c8214745743db0e68e5502cc2ce773`

## Note on availability

GitHub is not reachable from every network. If the app cannot reach this repository, it falls back to asking the user for an alternative repository URL and an optional HTTP proxy -- see the app README.
