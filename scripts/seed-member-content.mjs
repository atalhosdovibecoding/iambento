import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadDotenv } from "./env.mjs";

loadDotenv();

const bucket = process.env.SUPABASE_MEMBER_BUCKET || "member-content";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const files = [
  ["public/images/real/bathroom-black.jpg", "previews/bathroom-black.jpg", "image/jpeg"],
  ["public/images/real/gym-white.png", "previews/gym-white.png", "image/png"],
  ["public/images/real/locker-black.png", "previews/locker-black.png", "image/png"],
  ["public/images/real/bed-selfie.png", "previews/bed-selfie.png", "image/png"],
  ["public/images/real/bed-close.png", "previews/bed-close.png", "image/png"],
  ["public/images/real/bathroom-green.png", "previews/bathroom-green.png", "image/png"]
];

for (const [source, destination, contentType] of files) {
  const bytes = await fs.readFile(path.join(process.cwd(), source));
  const { error } = await supabase.storage
    .from(bucket)
    .upload(destination, bytes, {
      contentType,
      upsert: true
    });

  if (error) {
    throw error;
  }

  console.log(`Uploaded ${destination}`);
}
