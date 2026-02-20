"use server";

export async function greet(name: string) {
  // This runs on the server. process.pid is only available in Node.js.
  return {
    message: `Hello, ${name}!`,
    servedAt: new Date().toISOString(),
    pid: process.pid,
  };
}

export type CreatePostState = {
  error: string | null;
  created: { title: string; body: string } | null;
};

export async function createPost(
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  // Fake delay so the pending state is clearly visible
  await new Promise((r) => setTimeout(r, 1000));

  const title = formData.get("title")?.toString().trim() ?? "";
  const body = formData.get("body")?.toString().trim() ?? "";

  if (!title) return { error: "Title is required", created: null };
  if (!body) return { error: "Body is required", created: null };

  // Pretend we saved to a DB and return the created post
  return { error: null, created: { title, body } };
}
