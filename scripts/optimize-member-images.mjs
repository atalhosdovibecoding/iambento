import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { loadDotenv } from "./env.mjs";

loadDotenv();

const bucket = process.env.SUPABASE_MEMBER_BUCKET || "member-content";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL e SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY sao obrigatorios.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function runFfmpeg(source, destination, size, quality) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      source,
      "-frames:v",
      "1",
      "-vf",
      `scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease`,
      "-c:v",
      "libwebp",
      "-q:v",
      String(quality),
      "-compression_level",
      "5",
      destination
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || `Falha ao otimizar ${path.basename(source)}`);
  }
}

async function uploadWebp(storagePath, localPath) {
  const bytes = await fs.readFile(localPath);
  const { error } = await supabase.storage.from(bucket).upload(storagePath, bytes, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true
  });

  if (error) throw error;
  return bytes.length;
}

const { data: items, error: itemsError } = await supabase
  .from("content_items")
  .select("id,title,storage_path,thumbnail_path,content_type")
  .eq("active", true)
  .eq("content_type", "image")
  .order("sort_order", { ascending: true });

if (itemsError) throw itemsError;

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bento-member-images-"));
let originalTotal = 0;
let optimizedTotal = 0;

try {
  for (const [index, item] of (items || []).entries()) {
    const number = String(index + 1).padStart(2, "0");
    const originalFile = path.join(tempDir, `${number}-source`);
    const optimizedFile = path.join(tempDir, `${number}-optimized.webp`);
    const thumbnailFile = path.join(tempDir, `${number}-thumbnail.webp`);

    const { data: sourceBlob, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(item.storage_path);

    if (downloadError || !sourceBlob) {
      throw downloadError || new Error(`Falha ao baixar ${item.storage_path}`);
    }

    const sourceBytes = Buffer.from(await sourceBlob.arrayBuffer());
    originalTotal += sourceBytes.length;
    await fs.writeFile(originalFile, sourceBytes);

    runFfmpeg(originalFile, optimizedFile, { width: 1600, height: 1600 }, 82);
    runFfmpeg(originalFile, thumbnailFile, { width: 720, height: 900 }, 74);

    const optimizedPath = `optimized/${item.id}.webp`;
    const thumbnailPath = `optimized/thumbs/${item.id}.webp`;
    const optimizedBytes = await uploadWebp(optimizedPath, optimizedFile);
    await uploadWebp(thumbnailPath, thumbnailFile);
    optimizedTotal += optimizedBytes;

    const { error: updateError } = await supabase
      .from("content_items")
      .update({
        storage_path: optimizedPath,
        thumbnail_path: thumbnailPath
      })
      .eq("id", item.id);

    if (updateError) throw updateError;

    console.log(
      `${number}/${items.length} ${item.title}: ${(sourceBytes.length / 1048576).toFixed(2)} MB -> ${(optimizedBytes / 1024).toFixed(0)} KB`
    );
  }
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

console.log(
  `\nImagens otimizadas: ${(originalTotal / 1048576).toFixed(2)} MB -> ${(optimizedTotal / 1048576).toFixed(2)} MB`
);
