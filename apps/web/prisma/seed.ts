import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import type { CompoundCategory, LegalStatus } from "@prisma/client";

const db = new PrismaClient();

interface SideEffect {
  name: string;
  severity?: string;
  frequency?: string;
  notes?: string;
}

interface Interaction {
  target: string;
  type: string;
  severity?: string;
  description?: string;
}

interface Mechanism {
  pathway: string;
  description?: string;
}

interface CompoundYaml {
  slug: string;
  name: string;
  aliases?: string[];
  category: string;
  subcategory?: string;
  legalStatus?: string;
  description?: string;
  halfLife?: string;
  onset?: string;
  duration?: string;
  routeOfAdmin?: string[];
  mechanismShort?: string;
  dosing?: {
    min?: number;
    typical?: number;
    max?: number;
    unit?: string;
    frequency?: string;
    notes?: string;
  };
  sideEffects?: SideEffect[];
  interactions?: Interaction[];
  mechanisms?: Mechanism[];
}

async function main() {
  const compoundDataDir = path.resolve(
    __dirname,
    "../../../packages/compound-data/compounds"
  );

  if (!fs.existsSync(compoundDataDir)) {
    console.error(`Compound data directory not found: ${compoundDataDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(compoundDataDir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

  console.log(`Seeding ${files.length} compound(s)...\n`);

  for (const file of files) {
    const raw = fs.readFileSync(path.join(compoundDataDir, file), "utf-8");
    const data = yaml.load(raw) as CompoundYaml;

    if (!data.slug || !data.name || !data.category) {
      console.warn(`  ⚠ Skipping ${file}: missing required fields`);
      continue;
    }

    // Upsert the compound (without relations first)
    const compound = await db.compound.upsert({
      where: { slug: data.slug },
      update: {
        name: data.name,
        aliases: data.aliases ?? [],
        subcategory: data.subcategory ?? null,
        description: data.description ?? null,
        legalStatus: (data.legalStatus as LegalStatus) ?? "LEGAL",
        halfLife: data.halfLife ?? null,
        onset: data.onset ?? null,
        duration: data.duration ?? null,
        routeOfAdmin: data.routeOfAdmin ?? [],
        mechanismShort: data.mechanismShort ?? null,
        doseMin: data.dosing?.min ?? null,
        doseTypical: data.dosing?.typical ?? null,
        doseMax: data.dosing?.max ?? null,
        doseUnit: data.dosing?.unit ?? null,
        doseFrequency: data.dosing?.frequency ?? null,
      },
      create: {
        slug: data.slug,
        name: data.name,
        aliases: data.aliases ?? [],
        category: data.category as CompoundCategory,
        subcategory: data.subcategory ?? null,
        description: data.description ?? null,
        legalStatus: (data.legalStatus as LegalStatus) ?? "LEGAL",
        halfLife: data.halfLife ?? null,
        onset: data.onset ?? null,
        duration: data.duration ?? null,
        routeOfAdmin: data.routeOfAdmin ?? [],
        mechanismShort: data.mechanismShort ?? null,
        doseMin: data.dosing?.min ?? null,
        doseTypical: data.dosing?.typical ?? null,
        doseMax: data.dosing?.max ?? null,
        doseUnit: data.dosing?.unit ?? null,
        doseFrequency: data.dosing?.frequency ?? null,
      },
    });

    // Delete and recreate nested relations to stay in sync with YAML
    await db.compoundSideEffect.deleteMany({ where: { compoundId: compound.id } });
    if (data.sideEffects?.length) {
      await db.compoundSideEffect.createMany({
        data: data.sideEffects.map((se) => ({
          compoundId: compound.id,
          name: se.name,
          severity: se.severity ?? null,
          frequency: se.frequency ?? null,
          notes: se.notes ?? null,
        })),
      });
    }

    await db.compoundMechanism.deleteMany({ where: { compoundId: compound.id } });
    if (data.mechanisms?.length) {
      await db.compoundMechanism.createMany({
        data: data.mechanisms.map((m) => ({
          compoundId: compound.id,
          pathway: m.pathway,
          description: m.description ?? null,
        })),
      });
    }

    console.log(`  ✓ ${data.name}`);
  }

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
