import { Prisma } from "@prisma/client";

function isKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function isMissingColumnError(error: unknown) {
  return isKnownRequestError(error) && error.code === "P2022";
}

export async function withMissingColumnFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (isMissingColumnError(error)) {
      return fallback();
    }
    throw error;
  }
}
