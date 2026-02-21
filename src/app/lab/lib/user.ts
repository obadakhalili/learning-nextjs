import { cache } from "react";

export const getUser = cache(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    id: "123",
    name: "John Doe",
  };
});
