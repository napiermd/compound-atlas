import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings — CompoundAtlas" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      weightUnit: true,
      tempUnit: true,
      createdAt: true,
      _count: { select: { stacks: true, cycles: true } },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Settings</h1>
      <SettingsForm user={JSON.parse(JSON.stringify(user))} />
    </div>
  );
}
