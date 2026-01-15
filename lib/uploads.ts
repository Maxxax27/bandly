import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export type AttachmentType = "image" | "audio" | "document";

export type AttachmentMeta = {
  type: AttachmentType;
  url: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
};

function detectType(file: File): AttachmentType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

export async function uploadPostAttachment(params: {
  uid: string;
  postId: string;
  file: File;
}): Promise<AttachmentMeta> {
  const { uid, postId, file } = params;

  const type = detectType(file);
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `posts/${uid}/${postId}/${Date.now()}_${safeName}`;

  const r = ref(storage, path);
  await uploadBytes(r, file, {
    contentType: file.type || "application/octet-stream",
  });

  const url = await getDownloadURL(r);

  return {
    type,
    url,
    path,
    name: file.name,
    size: file.size,
    contentType: file.type || "application/octet-stream",
  };
}
