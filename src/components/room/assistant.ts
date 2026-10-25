export interface AssistantNote {
  title: string;
  description: string;
  category: string;
  href: string;
  pubDate: string;
}

export function normalizeAssistantQuery(value: string) {
  return value.trim().toLocaleLowerCase('zh-CN').split(/\s+/).filter(Boolean);
}

export function searchAssistantNotes(notes: AssistantNote[], query: string) {
  const terms = normalizeAssistantQuery(query);
  if (!terms.length) return notes.slice(0, 3);
  return notes.filter((note) => {
    const haystack =
      `${note.title} ${note.description} ${note.category}`.toLocaleLowerCase(
        'zh-CN',
      );
    return terms.every((term) => haystack.includes(term));
  });
}

export function randomAssistantNote(
  notes: AssistantNote[],
  random: () => number = Math.random,
) {
  if (!notes.length) return null;
  return notes[
    Math.min(notes.length - 1, Math.floor(random() * notes.length))
  ]!;
}
