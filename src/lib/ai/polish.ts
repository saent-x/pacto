// TODO: real polish via AiPlanningAdapter.plan() — pass the draft through a
// system prompt like "Rewrite the following memory post to be vivid and concise.
// Return only the rewritten text." and extract result.text from the llama.rn
// completion. Requires a downloaded LLM pack (getAiModelStorageStatus check).
export async function polishDraft(text: string): Promise<string> {
  if (!text.trim()) return text;
  return text;
}
