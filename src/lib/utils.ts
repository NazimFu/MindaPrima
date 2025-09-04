
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Student, Prices } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getPrice = (student: Student, prices: Prices) => {
    const numSubjects = student.subjects.split(',').map(s => s.trim()).filter(Boolean).length;
    const levelPrices = prices[student.level];

    let tuitionFee = 0;
    if (levelPrices && levelPrices[numSubjects.toString()]) {
        tuitionFee = levelPrices[numSubjects.toString()];
    }

    let transportFee = 0;
    if (student.transport === 'Yes') {
        transportFee = student.transportArea === 'Inside Limit' ? prices.transportInbound : prices.transportOutbound;
    }
    
    return tuitionFee + transportFee;
}
