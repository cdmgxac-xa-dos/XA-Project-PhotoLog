import { supabase } from "./supabaseClient.js";

// XA Project PhotoLog data layer — identical to xadOS-app's
// src/lib/projectPhotoLog.js (same table, same bucket, kept in sync
// manually since this is a separate small codebase, not a shared package).

export const SCOPE_OF_WORK_OPTIONS = [
  "Doors and Windows",
  "Glass Railings",
  "Aluminum Louvers",
  "Others",
];

export const PHOTO_CATEGORY_OPTIONS = [
  "Photo Update",
  "Safety Concern",
  "Punchlist",
  "Others",
];

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => resolve({ img, objectUrl });
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the captured photo."));
    };
    img.src = objectUrl;
  });
}

function drawToCanvas(img, maxDimension) {
  let { width, height } = img;
  if (width > height && width > maxDimension) {
    height = Math.round((height * maxDimension) / width);
    width = maxDimension;
  } else if (height > maxDimension) {
    width = Math.round((width * maxDimension) / height);
    height = maxDimension;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image compression failed."))),
      "image/jpeg",
      quality
    );
  });
}

// Steps quality down (and dimension, if needed) until the encoded blob
// fits under targetBytes -- "compress on the worker's phone before
// uploading" per the locked storage-budget decision, rather than a fixed
// quality that can wildly over- or under-shoot depending on the photo.
async function compressToTarget(file, { maxDimension, targetBytes, startQuality, minQuality }) {
  const { img, objectUrl } = await loadImage(file);
  try {
    const canvas = drawToCanvas(img, maxDimension);
    let quality = startQuality;
    let blob = await canvasToBlob(canvas, quality);
    while (blob.size > targetBytes && quality > minQuality) {
      quality = Math.max(minQuality, quality - 0.12);
      blob = await canvasToBlob(canvas, quality);
    }
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// Locked targets (see PhotoLog v1.1 storage-budget decision): main image
// ~400-600KB, thumbnail ~50KB. No separate uncompressed original is
// uploaded -- keeps a 200-photo/day project to a few GB/month instead of
// tens of GB.
async function compressImage(file) {
  return compressToTarget(file, { maxDimension: 1280, targetBytes: 600 * 1024, startQuality: 0.75, minQuality: 0.4 });
}

async function compressThumbnail(file) {
  return compressToTarget(file, { maxDimension: 320, targetBytes: 50 * 1024, startQuality: 0.6, minQuality: 0.3 });
}

function storagePathFor(projectId, suffix) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${projectId}/${year}/${month}/${Date.now()}_${suffix}.jpg`;
}

export async function submitPhotoUpdate(projectId, { floorLevel, unitNumber, scopeOfWork, photoCategory, remarks, file }) {
  const [compressed, thumbnail] = await Promise.all([
    compressImage(file),
    compressThumbnail(file),
  ]);

  const imagePath = storagePathFor(projectId, "photo");
  const thumbnailPath = storagePathFor(projectId, "thumb");

  const { error: uploadError } = await supabase.storage
    .from("project-photos")
    .upload(imagePath, compressed, { contentType: "image/jpeg" });
  if (uploadError) throw uploadError;

  const { error: thumbError } = await supabase.storage
    .from("project-photos")
    .upload(thumbnailPath, thumbnail, { contentType: "image/jpeg" });
  if (thumbError) throw thumbError;

  // No uncompressed original is uploaded -- reversed from the v1.1 spec's
  // Image Handling section per the locked storage-budget decision (a
  // 3-8MB original per photo would multiply monthly storage several
  // times over at real project volume). original_image_path stays null;
  // the column remains for a possible future opt-in high-quality upload.
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("project_photo_updates")
    .insert({
      project_id: projectId,
      user_id: user.id,
      floor_level: floorLevel || null,
      unit_number: unitNumber || null,
      scope_of_work: scopeOfWork,
      photo_category: photoCategory,
      remarks: remarks || null,
      image_path: imagePath,
      thumbnail_path: thumbnailPath,
    })
    .select("id, photo_id")
    .single();
  if (error) throw error;
  return data;
}

// Signed URLs are cached in memory (path -> url) for their lifetime, so
// revisiting the same photo within a session reuses the identical URL
// string instead of minting a new signed token -- which in turn lets the
// browser's own HTTP cache (and the service worker's runtime cache, see
// public/sw.js) actually serve repeat thumbnail views from disk instead
// of re-downloading. 24h is long enough to cover a full shift/day.
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;
const signedUrlCache = new Map();

function cachedSignedUrl(path) {
  const entry = signedUrlCache.get(path);
  return entry && entry.expiresAt > Date.now() ? entry.url : null;
}

function rememberSignedUrl(path, url) {
  signedUrlCache.set(path, { url, expiresAt: Date.now() + (SIGNED_URL_TTL_SECONDS - 300) * 1000 });
}

export async function getPhotoUrl(path) {
  const cached = cachedSignedUrl(path);
  if (cached) return cached;
  const { data, error } = await supabase.storage
    .from("project-photos")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  rememberSignedUrl(path, data.signedUrl);
  return data.signedUrl;
}

export async function getPhotoThumbUrls(paths) {
  const map = {};
  const toFetch = [];
  paths.forEach((p) => {
    const cached = cachedSignedUrl(p);
    if (cached) map[p] = cached; else toFetch.push(p);
  });
  if (toFetch.length === 0) return map;

  const { data, error } = await supabase.storage
    .from("project-photos")
    .createSignedUrls(toFetch, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  data.forEach((entry, i) => {
    if (entry.signedUrl) {
      map[toFetch[i]] = entry.signedUrl;
      rememberSignedUrl(toFetch[i], entry.signedUrl);
    }
  });
  return map;
}

const PHOTO_UPDATE_COLUMNS = `
  id, photo_id, project_id, floor_level, unit_number, scope_of_work, photo_category,
  remarks, image_path, thumbnail_path, original_image_path, created_at, user_id,
  submitted_by:user_id ( employee_code, roles ( role_name ), employee:employee_id ( full_name ) )
`;

// Feed, Home, Dashboard, and the report Browser all read through here.
// filters: { dateFrom, dateTo, floorLevel, unitNumber, scopeOfWork[],
// photoCategory[], submittedBy, limit }. Always scoped to visible
// (feed_visibility) rows -- there's no "show hidden" UI yet.
export async function listPhotoUpdates(projectId, filters = {}) {
  let query = supabase
    .from("project_photo_updates")
    .select(PHOTO_UPDATE_COLUMNS)
    .eq("project_id", projectId)
    .eq("feed_visibility", true)
    .order("created_at", { ascending: false });

  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
  if (filters.floorLevel) query = query.ilike("floor_level", `%${filters.floorLevel}%`);
  if (filters.unitNumber) query = query.ilike("unit_number", `%${filters.unitNumber}%`);
  if (filters.scopeOfWork?.length) query = query.overlaps("scope_of_work", filters.scopeOfWork);
  if (filters.photoCategory?.length) query = query.overlaps("photo_category", filters.photoCategory);
  if (filters.submittedBy) query = query.eq("user_id", filters.submittedBy);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getPhotoById(id) {
  const { data, error } = await supabase
    .from("project_photo_updates")
    .select(PHOTO_UPDATE_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
