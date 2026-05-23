import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export function clamp(value: number, min: number, max: number) {
  return Number.isNaN(value) ? min : Math.min(Math.max(value, min), max);
}

export function maskStudentName(studentId: string): string {
  return `Слушатель #${studentId.slice(-5).toUpperCase()}`;
}
