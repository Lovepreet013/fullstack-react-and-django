export type Gender = "male" | "female" | "other";
export type Hobby = "sports" | "dancing" | "playing" | "others";

export interface Person {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  gender: Gender;
  hobbies: Hobby[];
}
