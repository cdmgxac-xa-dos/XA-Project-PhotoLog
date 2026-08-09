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

function resizeImage(file, maxDimension, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
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
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) { reject(new Error("Image compression failed.")); return; }
          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the captured photo."));
    };
    img.src = objectUrl;
  });
}

async function compressImage(file) {
  return resizeImage(file, 1600, 0.75);
}

async function compressThumbnail(file) {
  return resizeImage(file, 400, 0.7);
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
  const originalPath = storagePathFor(projectId, "original");

  const { error: uploadError } = await supabase.storage
    .from("project-photos")
    .upload(imagePath, compressed, { contentType: "image/jpeg" });
  if (uploadError) throw uploadError;

  const { error: thumbError } = await supabase.storage
    .from("project-photos")
    .upload(thumbnailPath, thumbnail, { contentType: "image/jpeg" });
  if (thumbError) throw thumbError;

  // Untouched capture, kept for future AI/documentation use per the
  // v1.1 spec's Image Handling section -- not shown anywhere in the UI
  // today, just preserved alongside the two display-sized copies.
  const { error: originalError } = await supabase.storage
    .from("project-photos")
    .upload(originalPath, file, { contentType: file.type || "image/jpeg" });
  if (originalError) throw originalError;

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
      original_image_path: originalPath,
    })
    .select("id, photo_id")
    .single();
  if (error) throw error;
  return data;
}

export async function getPhotoUrl(path) {
  const { data, error } = await supabase.storage
    .from("project-photos")
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function getPhotoThumbUrls(paths) {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from("project-photos")
    .createSignedUrls(paths, 3600);
  if (error) throw error;
  const map = {};
  data.forEach((entry, i) => {
    if (entry.signedUrl) map[paths[i]] = entry.signedUrl;
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
