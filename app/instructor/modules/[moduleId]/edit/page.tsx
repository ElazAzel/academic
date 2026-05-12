import { redirect } from "next/navigation";

export default async function RedirectToCourses() {
  redirect("/instructor/courses");
}
