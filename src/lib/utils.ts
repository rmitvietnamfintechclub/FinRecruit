import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Local part of an email (e.g. student ID prefix); not stored on Candidate. */
export function emailLocalPart(email: string): string {
  const i = email.indexOf('@');
  return i === -1 ? email : email.slice(0, i);
}
