# CloudFront Setup — One Distribution, Three Hotels

## 1. S3 Bucket
Create one bucket: `your-booking-app-bucket`
Block all public access — CloudFront will be the only origin.

Final structure inside the bucket:
```
/index.html
/hotel-config.json          ← dev fallback (same as MovNext or whichever is default)
/hotel-configs/
  MovNext.json
  HotelDos.json
  HotelTres.json
/main.abc123.js             ← hashed Angular chunks
/styles.abc123.css
... (rest of Angular build)
```

## 2. CloudFront Distribution

### Origin
- Origin domain: `your-booking-app-bucket.s3.your-region.amazonaws.com`
- Origin access: use **Origin Access Control (OAC)** — not public S3

### Alternate domain names (CNAMEs)
Add all three:
```
reservas.migranhotel.com
reservas.hoteldos.com
reservas.hoteltres.com
```

### SSL Certificate (ACM)
Request one certificate in **us-east-1** (required for CloudFront) covering all three domains.
Use a **SAN cert** (multiple names on one cert) — free with ACM:
```
reservas.migranhotel.com
reservas.hoteldos.com
reservas.hoteltres.com
```
Validate via DNS (add the CNAME records ACM gives you in each domain's DNS).

### Default root object
Set to: `index.html`

### Error pages
Add a custom error response:
- HTTP error code: `403`
- Response page path: `/index.html`
- HTTP response code: `200`

Also add the same for `404`.
This is critical — without it Angular Router deep links return a 403 from S3.

### Cache behaviors
| Path pattern        | Cache policy           | Notes                        |
|---------------------|------------------------|------------------------------|
| `/hotel-configs/*`  | CachingDisabled        | Always fresh                 |
| `/hotel-config.json`| CachingDisabled        | Always fresh                 |
| `/index.html`       | CachingDisabled        | Always fresh                 |
| `*` (default)       | CachingOptimized       | Hashed JS/CSS — long cache   |

## 3. DNS — for each hotel domain
In each hotel's DNS provider, add a CNAME:

```
reservas.migranhotel.com  CNAME  d1234abcd.cloudfront.net
reservas.hoteldos.com     CNAME  d1234abcd.cloudfront.net
reservas.hoteltres.com    CNAME  d1234abcd.cloudfront.net
```

All three point at the same CloudFront distribution URL.

## 4. S3 Bucket Policy (allow CloudFront OAC)
After creating the OAC in CloudFront, attach this policy to the bucket
(CloudFront console will generate the exact ARNs for you):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-booking-app-bucket/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/EXXXXXXXXXXXXX"
        }
      }
    }
  ]
}
```

## 5. Angular angular.json — include hotel-configs in build assets
In `angular.json` under `projects > your-app > architect > build > options > assets`:
```json
"assets": [
  "src/favicon.ico",
  "src/assets",
  "src/hotel-config.json",
  {
    "glob": "**/*",
    "input": "src/hotel-configs",
    "output": "/hotel-configs"
  }
]
```

## Summary of what each hotel visitor experiences
1. User hits `reservas.migranhotel.com`
2. DNS resolves to CloudFront → serves `index.html`
3. Angular boots → `main.ts` reads `window.location.hostname`
4. Matches `"reservas.migranhotel.com"` → fetches `/hotel-configs/MovNext.json`
5. `HotelConfigService.current` is populated
6. App renders with MovNext branding, logo, color, and API URL