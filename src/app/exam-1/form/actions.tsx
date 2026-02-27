"use server";

export interface FormState {
  errors?: Record<string, string>;
  success?: string;
}

export async function submitForm(
  formState: FormState,
  formData: FormData,
): Promise<FormState> {
  const title = formData.get("title");
  const body = formData.get("body");

  const errors: Record<string, string> = {};

  if (!title || typeof title !== "string" || title.trim() === "") {
    errors.title = "Title is required";
  }

  if (!body || typeof body !== "string" || body.trim() === "") {
    errors.body = "Body is required";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return { success: "Form submitted successfully!" };
}
