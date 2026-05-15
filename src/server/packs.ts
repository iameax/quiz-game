import { z } from "zod";
import fs from "fs";
import path from "path";
import type { Pack } from "@/lib/types";

const QuestionSchema = z.object({
  value: z.number().int().positive(),
  question: z.string().min(1),
  answer: z.string().min(1),
  image: z.string().optional(),
  audio: z.string().optional(),
});

const CategorySchema = z.object({
  name: z.string().min(1),
  questions: z.array(QuestionSchema).min(1),
});

const PackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  categories: z.array(CategorySchema).min(1),
});

export function validatePack(input: unknown): Pack {
  return PackSchema.parse(input);
}

export function loadPacksFromDir(dir: string): Pack[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  return files.map(f => {
    const content = fs.readFileSync(path.join(dir, f), "utf8");
    return validatePack(JSON.parse(content));
  });
}
