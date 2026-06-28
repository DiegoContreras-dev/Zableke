import "server-only";
import { Client } from "minio";

let _client: Client | null = null;

export function getMinioClient(): Client {
  if (!_client) {
    _client = new Client({
      endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
      port: parseInt(process.env.MINIO_PORT ?? "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ROOT_USER,
      secretKey: process.env.MINIO_ROOT_PASSWORD
    });
  }
  return _client;
}

export const MINIO_BUCKET = process.env.MINIO_BUCKET ?? "config";
