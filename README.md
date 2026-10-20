# Website Builder (Micro SaaS)

Users sign up with email and password, build a landing page in a visual
drag-and-drop editor, publish it, and get it served on their own subdomain.
They can also point their own domain at it via DNS.

**Stack:** Next.js 16 (App Router, Cache Components), Prisma 7 + PostgreSQL,
Better Auth, Puck (visual editor), AWS S3 (images), Tailwind CSS 4.

## Getting started

```bash
cp .env.example .env        # fill in DATABASE_URL and BETTER_AUTH_SECRET
npm install                 # also runs `prisma generate`
npx prisma migrate deploy   # create the tables
npm run dev
```

Open http://localhost:3000, create an account, and edit your page under
**Redigera sidan**. Published sites are served on
`http://<subdomain>.localhost:3000`. Browsers resolve `*.localhost` to your
machine without any extra setup.

## How it works

| Area | Where |
| --- | --- |
| Auth (email + password) | `lib/auth.ts`, `actions/auth.ts`, `app/(auth)/` |
| Tenants: one website per user, created at sign-up | `lib/websites.ts` |
| Host routing for subdomains and custom domains | `proxy.ts`, `lib/domains.ts` |
| Public site, rendered by hostname | `app/sites/[host]/page.tsx` |
| Page editor (Puck) and its blocks | `app/dashboard/editor/`, `lib/page/config.tsx`, `components/page-blocks/` |
| Server-side validation of page data | `lib/page/sanitize.ts` |
| Image uploads (presigned S3 PUT) | `lib/storage.ts`, `actions/uploads.ts` |

- **Multitenancy:** every website has a unique `subdomain` and an optional
  unique `customDomain`. `proxy.ts` looks at the `Host` header. The platform
  domain (`ROOT_DOMAIN`) serves the app. Any other host is rewritten to
  `/sites/<hostname>`, which loads the matching published website. Dashboard
  queries and Server Actions always look up the website by the signed-in
  user, never by an id sent from the browser.
- **Page data** is stored as Puck JSON in `Website.data`. Everything the
  editor sends is rebuilt from the config on the server before it is saved:
  unknown blocks and props are dropped, links are limited to
  http(s)/mailto/tel/#anchors, rich text HTML is sanitized, and images must
  come from our bucket.
- **Caching:** public pages are cached per hostname and expired when the
  owner publishes or changes the site's addresses.

## Hosting without your own domain

Subdomain sites need a wildcard domain (`*.ROOT_DOMAIN`). On a free
`*.vercel.app` address you can't create subdomains, so set:

```
ROOT_DOMAIN="your-project.vercel.app"
BETTER_AUTH_URL="https://your-project.vercel.app"
SITE_ROUTING="path"
```

Sites are then served on `https://your-project.vercel.app/s/<subdomain>`.
Switch back to `SITE_ROUTING="subdomain"` once you have a domain. Users
keep the same addresses, only the URL format changes.

## Custom domains

The customer creates a DNS record that points at the platform:

| Customer domain | Record |
| --- | --- |
| `www.theirdomain.com` | `CNAME` → `CUSTOM_DOMAIN_TARGET` (defaults to `ROOT_DOMAIN`) |
| `theirdomain.com` (apex) | `ALIAS`/`ANAME`, or an `A` record to the platform's IP |

They then enter the domain under **Adress** in the dashboard. The
**Kontrollera DNS** button checks that the record resolves correctly.

HTTPS for customer domains depends on where the app is hosted:

- **Vercel:** add each customer domain to the project (dashboard or
  Domains API). Vercel then issues the certificates.
- **Own server with Caddy:** use on-demand TLS and let Caddy ask the app
  whether a domain belongs to a website before it issues a certificate:

  ```caddy
  {
    on_demand_tls {
      ask http://localhost:3000/api/domains/verify
    }
  }

  https:// {
    tls { on_demand }
    reverse_proxy localhost:3000
  }
  ```

The platform's own subdomains (`*.ROOT_DOMAIN`) need a wildcard DNS record
and a wildcard certificate.

## Image storage (AWS S3)

Uploads are disabled until `AWS_REGION`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY` and `S3_BUCKET` are set. Browsers upload directly to
the bucket using presigned URLs, so the bucket needs:

1. **CORS** that allows `PUT` from the app's origin:

   ```json
   [
     {
       "AllowedOrigins": ["https://your-app-domain.com"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

2. **Public read** for uploaded images (or put CloudFront in front of the
   bucket and set `S3_PUBLIC_URL`):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::YOUR_BUCKET/sites/*"
       }
     ]
   }
   ```

3. **An IAM user** for the app that only has `s3:PutObject` on
   `arn:aws:s3:::YOUR_BUCKET/sites/*`.

`S3_ENDPOINT` lets you use an S3-compatible service instead, such as
Cloudflare R2 or MinIO.
