"use server";

export async function greet(name: string) {
  // This runs on the server. process.pid is only available in Node.js.
  return {
    message: `Hello, ${name}!`,
    servedAt: new Date().toISOString(),
    pid: process.pid,
  };
}
