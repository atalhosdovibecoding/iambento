import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { loadDotenv } from "./env.mjs";

loadDotenv();

const DEFAULT_SOURCE_DIR = "C:\\Users\\brend\\Downloads\\nichohot ben";
const sourceDir = process.argv[2] || DEFAULT_SOURCE_DIR;
const bucket = process.env.SUPABASE_MEMBER_BUCKET || "member-content";
const storageRoot = "nichohot-ben";
const tmpDir = path.join(process.cwd(), "tmp", "private-content-import");

const imageExts = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const videoExts = new Set([".mp4", ".mov", ".webm", ".m4v"]);

const imageTitles = [
  "Destaque privado",
  "Espelho reservado",
  "Registro exclusivo",
  "Close private",
  "Sequencia reservada",
  "Bastidor quente",
  "Momento privado",
  "Arquivo exclusivo",
  "Private extra",
  "Ultimo registro"
];

const videoTitles = ["Video privado 01", "Video privado 02", "Video private extra"];

function getContentType(ext, type) {
  if (type === "video") {
    if (ext === ".mp4") return "video/mp4";
    if (ext === ".webm") return "video/webm";
    return "video/quicktime";
  }

  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function ffprobe(filePath) {
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=width,height,duration", "-show_entries", "format=duration", "-of", "json", filePath],
    { encoding: "utf8" }
  );

  if (result.status !== 0) return {};

  try {
    const parsed = JSON.parse(result.stdout);
    const stream = parsed.streams?.find((item) => item.width && item.height) || {};
    return {
      width: Number(stream.width || 0),
      height: Number(stream.height || 0),
      duration: Number(stream.duration || parsed.format?.duration || 0)
    };
  } catch {
    return {};
  }
}

async function listMedia(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMedia(fullPath)));
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    const type = imageExts.has(ext) ? "image" : videoExts.has(ext) ? "video" : null;
    if (!type) continue;

    const stat = await fs.stat(fullPath);
    const meta = ffprobe(fullPath);
    files.push({
      fullPath,
      ext,
      type,
      bytes: stat.size,
      width: meta.width || 0,
      height: meta.height || 0,
      duration: meta.duration || 0
    });
  }

  return files;
}

function createThumbnail(source, destination, type) {
  const args =
    type === "video"
      ? ["-y", "-ss", "00:00:01", "-i", source, "-frames:v", "1", "-vf", "scale=900:-2", "-q:v", "3", destination]
      : ["-y", "-i", source, "-frames:v", "1", "-vf", "scale=900:-2", "-q:v", "3", destination];

  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(`Falha ao gerar thumbnail de ${path.basename(source)}: ${result.stderr || result.stdout}`);
  }
}

function transcodeVideoToMp4(source, destination) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      source,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      destination
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    throw new Error(`Falha ao converter video ${path.basename(source)}: ${result.stderr || result.stdout}`);
  }
}

function orderContent(files) {
  const images = files
    .filter((item) => item.type === "image")
    .sort((a, b) => b.width * b.height - a.width * a.height || b.bytes - a.bytes);
  const videos = files
    .filter((item) => item.type === "video")
    .sort((a, b) => b.duration - a.duration || b.bytes - a.bytes);

  const ordered = [];
  ordered.push(...images.slice(0, 2));
  if (videos[0]) ordered.push(videos[0]);
  ordered.push(...images.slice(2, 6));
  if (videos[1]) ordered.push(videos[1]);
  ordered.push(...images.slice(6));
  ordered.push(...videos.slice(2));

  return ordered;
}

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

await fs.mkdir(tmpDir, { recursive: true });

const files = orderContent(await listMedia(sourceDir));

if (!files.length) {
  throw new Error(`Nenhuma midia encontrada em ${sourceDir}`);
}

const importedPaths = [];
let imageIndex = 0;
let videoIndex = 0;

for (const [index, item] of files.entries()) {
  const number = String(index + 1).padStart(2, "0");
  const originalSlug = slugify(path.basename(item.fullPath, item.ext)) || `conteudo-${number}`;
  const storageExt = item.type === "video" ? ".mp4" : item.ext.toLowerCase();
  const storagePath = `${storageRoot}/originals/${number}-${originalSlug}${storageExt}`;
  const thumbnailPath = `${storageRoot}/thumbs/${number}-${originalSlug}.jpg`;
  const thumbnailLocalPath = path.join(tmpDir, `${number}-${originalSlug}.jpg`);
  const uploadSourcePath =
    item.type === "video" ? path.join(tmpDir, `${number}-${originalSlug}.mp4`) : item.fullPath;
  const title =
    item.type === "video"
      ? videoTitles[videoIndex++] || `Video privado ${String(videoIndex).padStart(2, "0")}`
      : imageTitles[imageIndex++] || `Registro privado ${String(imageIndex).padStart(2, "0")}`;
  const description =
    item.type === "video"
      ? "Video exclusivo liberado para membros do private."
      : "Registro exclusivo liberado para membros do private.";

  createThumbnail(item.fullPath, thumbnailLocalPath, item.type);

  if (item.type === "video") {
    transcodeVideoToMp4(item.fullPath, uploadSourcePath);
  }

  const originalBytes = await fs.readFile(uploadSourcePath);
  const thumbnailBytes = await fs.readFile(thumbnailLocalPath);

  const originalUpload = await supabase.storage.from(bucket).upload(storagePath, originalBytes, {
    contentType: getContentType(storageExt, item.type),
    upsert: true
  });

  if (originalUpload.error) throw originalUpload.error;

  const thumbnailUpload = await supabase.storage.from(bucket).upload(thumbnailPath, thumbnailBytes, {
    contentType: "image/jpeg",
    upsert: true
  });

  if (thumbnailUpload.error) throw thumbnailUpload.error;

  const upsert = await supabase.from("content_items").upsert(
    {
      title,
      description,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      content_type: item.type,
      sort_order: (index + 1) * 10,
      active: true
    },
    { onConflict: "storage_path" }
  );

  if (upsert.error) throw upsert.error;

  importedPaths.push(storagePath);
  console.log(`Importado ${number}: ${title} -> ${storagePath}`);
}

const deactivateOld = await supabase.from("content_items").update({ active: false }).not("storage_path", "like", `${storageRoot}/%`);
if (deactivateOld.error) throw deactivateOld.error;

const { data: activeItems, error: activeError } = await supabase
  .from("content_items")
  .select("title,content_type,storage_path,thumbnail_path,sort_order,active")
  .eq("active", true)
  .order("sort_order", { ascending: true });

if (activeError) throw activeError;

console.log(`\nImportacao concluida: ${importedPaths.length} itens ativos.`);
console.log(JSON.stringify(activeItems, null, 2));
