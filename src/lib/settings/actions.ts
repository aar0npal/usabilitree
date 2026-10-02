"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verify, hash } from "@/lib/auth/hash";
import { getCurrentUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/react";

export async function updateUserSettings({
  email,
  currentPassword,
  newPassword,
}: {
  email: string;
  currentPassword?: string;
  newPassword?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const [existingUser] = await db.select().from(users).where(eq(users.id, user.id));

    if (!existingUser) {
      throw new Error("User not found");
    }

    // Only allow password change if user has a password set
    if (newPassword && !existingUser.hashedPassword) {
      throw new Error("Cannot set password for OAuth accounts");
    }

    // If changing password, verify current password
    if (newPassword) {
      const isValid =
        !!currentPassword && (await verify(existingUser.hashedPassword!, currentPassword));
      if (!isValid) {
        throw new Error("Current password is incorrect");
      }
    }

    const updateData: Partial<typeof users.$inferInsert> = {
      email,
      updatedAt: new Date(),
    };

    if (newPassword) {
      updateData.hashedPassword = await hash(newPassword);
    }

    await db.update(users).set(updateData).where(eq(users.id, user.id));

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    Sentry.captureException(error);
    return { error: (error as Error).message };
  }
}

export async function deleteUserAccount() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    await db.delete(users).where(eq(users.id, user.id));
    return { success: true };
  } catch (error) {
    Sentry.captureException(error);
    return { error: (error as Error).message };
  }
}
