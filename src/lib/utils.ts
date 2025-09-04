import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Student } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getPrice = (student: Student) => {
    let price = 40; // Base price
    if(student.transport === 'Yes') {
        price += student.transportArea === 'Inside Limit' ? 20 : 40;
    }
    return price;
}
