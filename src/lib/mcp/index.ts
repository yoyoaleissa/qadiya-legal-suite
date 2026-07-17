import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyCases from "./tools/list-my-cases";
import getCase from "./tools/get-case";
import listMyTasks from "./tools/list-my-tasks";
import listClients from "./tools/list-clients";
import createTask from "./tools/create-task";
import searchKnowledge from "./tools/search-knowledge";

// OAuth issuer must be the direct Supabase host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "qadiya-os-mcp",
  title: "Qadiya OS",
  version: "0.1.0",
  instructions:
    "Kuwait legal practice management tools. All reads and writes are scoped by RLS to the signed-in user's firm. Use list_my_cases / get_case to inspect matters, list_my_tasks and create_task to manage work, list_clients for the client roster, and search_legal_knowledge for firm legal references.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyCases, getCase, listMyTasks, listClients, createTask, searchKnowledge],
});
