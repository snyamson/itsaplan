# Deploy on Coolify

[Coolify](https://coolify.io) runs the stack from the Docker images published to GHCR on each
release and generates the secrets itself. Nothing is built on your server, so the setup is a
pasted compose file and two domains.

## 1. Create the service

**New Resource → Docker Compose Empty**, then pick the server to deploy on.

Paste the whole of one file into **Docker Compose file** and press **Save**:

| Edition             | File                                                                       |
| ------------------- | -------------------------------------------------------------------------- |
| Pro (recommended)   | [`docker-compose.coolify-pro.yml`](../docker-compose.coolify-pro.yml)       |
| Community           | [`docker-compose.coolify-images.yml`](../docker-compose.coolify-images.yml) |

Without a license key the Pro images run as Community does. To unlock the Pro features later,
enter the key in god mode, under **License**. The stack stays the same, with no move to
another compose file.

## 2. Set the domains

The stack serves two origins: the api and the web app. Coolify generates a domain for each on
the first deploy. To use your own, edit the domain of the `api` and the `web` service:

| Service | Example                    |
| ------- | -------------------------- |
| api     | `https://api.example.com`  |
| web     | `https://plan.example.com` |

Coolify turns those into `SERVICE_URL_API` and `SERVICE_URL_WEB`, which the compose file
reads as the api's `API_URL` / `APP_URL` and as the api origin web hands to the browser.
Changing a domain later takes a redeploy, which is how Coolify applies an environment change.

## 3. Deploy

Press **Deploy**. Postgres, RustFS, api, worker, bot, and web come up together; the
one-shot `migrate` service applies the migrations first, and api, worker and bot start once
it exits. The first account registered becomes the instance admin.

Secrets (database password, auth secret, encryption key, worker token, object store credentials)
are generated on the first deploy and stay stable across later ones — nothing to fill in by
hand. Optional variables from `.env.example` — legal document URLs, telemetry opt-out,
worker tuning — go in **Environment Variables**.

## Upgrade

Press **Redeploy**. Coolify pulls the newest images, and the `migrate` service backs up the
database into the `db-backups` volume and applies the new migrations before the apps start.

## Build from source

Use this to run a branch instead of a release. The server builds the images itself, which
takes longer and needs more memory than pulling them.

1. **New Resource → Public Repository**, then pick the server. Enter
   `https://github.com/croffasia/itsaplan.git` and press **Check repository**.
2. Set **Build Pack** to `Docker Compose`, **Base Directory** to `/`, and **Docker Compose
   Location** to `/docker-compose.coolify.yml`, then press **Continue**.
3. In **Configuration → Git Source**, set **Branch**, leave **Commit SHA** as `HEAD`, and press
   **Save**:

   | Branch    | What you get                                                                                       |
   | --------- | -------------------------------------------------------------------------------------------------- |
   | `release` | released versions only. A mirror branch the release workflow moves to each published release.     |
   | `main`    | the latest features, the moment they merge. Expect breaking changes between releases.              |

4. Set the domains in **Configuration → General**. Here each field needs the container port
   after the host: **Domains for api** `https://api.example.com:3000`, **Domains for web**
   `https://plan.example.com:3001`. Then press **Deploy**.

To keep a Public Repository resource and pull the published images instead of building, set
**Custom build command** in **Configuration → General** to `docker compose pull` and redeploy.

## 6. Offsite backups

The three Coolify compose files carry a `backup` service. Each night it dumps the database
and copies the RustFS attachments volume to a Cloudflare R2 bucket with
[restic](https://restic.net), which encrypts the data on the server before upload. It keeps 7
daily, 4 weekly and 6 monthly snapshots. The first backup runs when the service starts.

Create an R2 bucket (for example `snyamson-desk-backup`) and an API token with
**Object Read & Write** on that bucket, then set these in **Environment Variables**. The
stack does not deploy while one of the first four is missing.

| Variable               | Value                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `RESTIC_REPOSITORY`    | `s3:https://<account-id>.r2.cloudflarestorage.com/<bucket>`                            |
| `RESTIC_PASSWORD`      | Encrypts the backups. Keep a copy outside this stack: without it they cannot be read.  |
| `R2_ACCESS_KEY_ID`     | Access key ID of the R2 token                                                          |
| `R2_SECRET_ACCESS_KEY` | Secret access key of the R2 token                                                      |
| `BACKUP_HOUR_UTC`      | Hour of the nightly backup, 0–23. Default `3`                                          |

The attachments volume is copied while RustFS is running. Each object is its own file, so a
nightly copy is consistent per file, but an upload in progress at that moment can be missing
or partial in that night's snapshot.

The `backup` container turns unhealthy when no backup has succeeded for two days, so
Coolify shows a failing backup. Restoring is described in
[self-hosting.md](self-hosting.md#restoring-from-an-offsite-backup).

## 7. Deploy checks

Before the stack starts, Coolify refuses to deploy while a required variable is empty and
prints which one, as it does for the backup variables above. The `backup` service also stops
with a message when `RESTIC_REPOSITORY` still contains a `<placeholder>`.

After a deploy, `scripts/smoke-test.sh <web-url> <api-url>` requests the sign-in page, the api
root and the auth endpoint from outside and exits non-zero when one of them does not answer.
It retries for a few minutes, so it can run right after a redeploy. The **Desk smoke test**
workflow runs it every 30 minutes and can be called from a deploy workflow. Set the repository
variables `DESK_WEB_URL` and `DESK_API_URL` to the public URLs; without them the workflow
is skipped.

To run the same stack outside Coolify, see [self-hosting.md](self-hosting.md) or
[railway.md](railway.md).
