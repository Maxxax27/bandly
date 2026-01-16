import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const incCommentCount1 = onDocumentCreated(
  "posts/{postId}/comments/{commentId}",
  async (event) => {
    const postId = event.params.postId;
    await db.doc(`posts/${postId}`).update({
      commentCount: admin.firestore.FieldValue.increment(1),
      lastCommentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

export const decCommentCount1 = onDocumentDeleted(
  "posts/{postId}/comments/{commentId}",
  async (event) => {
    const postId = event.params.postId;
    await db.doc(`posts/${postId}`).update({
      commentCount: admin.firestore.FieldValue.increment(-1),
    });
  }
);
