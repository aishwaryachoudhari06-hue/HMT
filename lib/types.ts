export const GOALS = ["Fat Loss / Caloric Deficit","Muscle Mass (Bulking)","Athletic Performance / Explosiveness","Strength Peak","General Health"] as const;
export const DIETS = ["High Protein","Deficit","Surplus","Pure Veg / Vegan","Intermittent Fasting"] as const;
export const LEVELS = ["Beginner","Intermediate","Advanced"] as const;
export const GENDERS = ["Male","Female","Non-binary","Prefer not to say"] as const;
export const INJURIES = ["Lower Back Pain","Rotator Cuff","Bad Knees/ACL","Asthma"] as const;

export type UserProfile = {
  name: string; age: number; gender: string; height: number; weight: number; targetWeight: number;
  goal: string; daysPerWeek: number; sessionMinutes: number; experienceLevel: string;
  injuries: string[]; diet: string;
};
export type Msg = { role: "user" | "assistant"; content: string };
