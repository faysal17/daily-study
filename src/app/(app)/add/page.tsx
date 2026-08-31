import { redirect } from "next/navigation";

// The Add / Assign screen was merged into /tasks (the "Plan" tab). Scheduling
// now happens inline on each main-task and topic card. This stub keeps old
// bookmarks and links working.
export default function AddRedirect() {
  redirect("/tasks");
}
