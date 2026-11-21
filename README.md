# CFA-resources

Rootfs mirror and index for [Coding for Android](https://github.com/AROAN110/Coding-for-Android).

This repository is the default download source the app uses on first launch. It contains nothing but a static index and the container image itself.

## Layout

| File | Purpose |
|------|---------|
| `index.json` | Repository index; the app reads this first to find the current rootfs |
| `alpine-rootfs-preinstalled.tar.gz` | The container image referenced by the index |

## index.json format

```json
{
  "version": 1,
  "updated": "2026-11-14",
  "rootfs": [
    {
      "name": "alpine-rootfs-preinstalled.tar.gz",
      "version": "3.24.2",
      "arch": "aarch64",
      "size": 6785879,
      "sha256": "3a8a561e4accc4b638e80d8b1bb0973f8127d162c386be72922a4b562cfe761c"
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

- Alpine rootfs 3.24.2 (preinstalled: bash/coreutils/findutils/grep/sed/gawk/util-linux), aarch64, 6,785,879 bytes
- SHA-256: `3a8a561e4accc4b638e80d8b1bb0973f8127d162c386be72922a4b562cfe761c`

## Note on availability

GitHub is not reachable from every network. If the app cannot reach this repository, it falls back to asking the user for an alternative repository URL and an optional HTTP proxy -- see the app README.
