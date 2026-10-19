import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Image storage on AWS S3. Browsers upload directly to the bucket with a
// short-lived presigned PUT URL, so files never pass through the app server.
// S3_ENDPOINT makes it work with S3-compatible services (R2, MinIO) too.

function readConfig() {
  const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET } = process.env;
  if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !S3_BUCKET) return null;

  const endpoint = process.env.S3_ENDPOINT || undefined;
  const publicBaseUrl = (
    process.env.S3_PUBLIC_URL ||
    (endpoint
      ? `${endpoint}/${S3_BUCKET}`
      : `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`)
  ).replace(/\/+$/, "");

  return {
    bucket: S3_BUCKET,
    publicBaseUrl,
    client: new S3Client({
      region: AWS_REGION,
      endpoint,
      forcePathStyle: Boolean(endpoint),
      credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
    }),
  };
}

let config: ReturnType<typeof readConfig> | undefined;
function getConfig() {
  config ??= readConfig();
  return config;
}

export function isStorageConfigured() {
  return getConfig() !== null;
}

// Keys created by actions/uploads.ts: sites/<websiteId>/<uuid>.<ext>
const UPLOAD_KEY = /^sites\/[a-z0-9]+\/[0-9a-f-]{36}\.(jpg|png|webp|gif|avif)$/;

/** True if the URL is exactly an uploaded image in our bucket. */
export function isStoredImageUrl(url: string) {
  const base = getConfig()?.publicBaseUrl;
  if (!base || !url.startsWith(`${base}/`)) return false;
  return UPLOAD_KEY.test(url.slice(base.length + 1));
}

export async function createUploadUrl({
  key,
  contentType,
  size,
}: {
  key: string;
  contentType: string;
  size: number;
}) {
  const storage = getConfig();
  if (!storage) throw new Error("Storage is not configured");

  // Content type and length are part of the signature, so the browser
  // can't upload a different kind or size of file with this URL.
  const command = new PutObjectCommand({
    Bucket: storage.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
    CacheControl: "public, max-age=31536000, immutable",
  });
  const uploadUrl = await getSignedUrl(storage.client, command, { expiresIn: 60 });

  return { uploadUrl, publicUrl: `${storage.publicBaseUrl}/${key}` };
}
