---
name: question-maker
description: Create or update quiz questions for quiz-game packs in `data/packs/*.json`. Invoke when user wants to create new packs, add new questions or update existing ones to existing packs.
---

# Question Maker

Generate quiz questions for this Jeopardy-style game using raw source data `data/questions.md`. 

> **Note:** This skill has three concern areas — (1) JSON schema & structure, (2) content & difficulty rules, (3) media handling. Each is covered in a dedicated section below.


## General Rules

- Schema types - `src/lib/types.ts`
- 6 categories per pack. Try to cover a broad range of topics within the pack theme. Avoid overlap between categories.
- 5 questions per category. Values: 100, 200, 300, 400, 500. Difficulty rises with value. Try to pick different question types within each category. Try to avoid same answer questions in the same category.
- Pack `id` = kebab-case slug. File: `data/packs/<id>.json`.
- Answers should contain question part, not just answer. E.g. for "Кто такой Иблис?" answer should be "**Иблис** — джин, который отказался поклониться Адаму и был проклят Аллахом" instead of just "Джин, проклятый Аллахом".
- Markdown allowed in `question` and `answer` (rendered by `src/components/Markdown.tsx`). Use `**bold**` for emphasis.
- Use `string[]` form only when the question exceeds 80 characters or contains natural sentence breaks. Otherwise use a plain string.
- Audio: file at `public/audio/<file>.mp3`, referenced as `/audio/<file>.mp3` in JSON. For Qur'an ayah audio invoke `download-ayah-audio` skill.
- Russian wording for most text (no english), arabic words transliterated and original in parentheses, e.g. "**Акбар** (*أَكْبَر*)" for clarity and learning.
- Match existing pack tone/language. 

## Creation Workflow

1. Read source data file `data/questions.md`. If the file is missing or empty, notify the user and stop.
2. Read target pack file (if exists) and `src/lib/types.ts`.
3. Confirm pack id/name and 6 categories with user.
4. For each category, run interactive question pick (see below).
5. Draft questions, assign values and add answers. Verify facts. Reject filler.
6. Confirm category draft with user.
7. Write/Edit JSON. 2-space indent, trailing newline.
8. Mark used questions in source file with `[x]`.
9. Run `npx tsc --noEmit` and validate JSON parses if schema doubt.

### Interactive question pick

Present avaialable categories with remaining / total questions count. When user picks a category, present available `[ ]` questions to the user as a **numbered text list** :

```
**Category N: <name>** (X items). Pick 5 numbers (easy → hard, 100/200/300/400/500):

1. <short title of question 1>
2. <short title of question 2>
...
```

Rules:
- Preserve **original numbering** across turns. If the user picked #5, do not renumber remaining items — just omit #5 from the next list.
- Default mode: per-value picking. User replies with one number, you assign it to the next unset value (100 → 200 → 300 → 400 → 500). Show remaining items after each pick.
- Speed mode: if user replies with 5 numbers in one line (e.g. `7 1 11 12 13`), assign in order to 100/200/300/400/500.
- "suggest your version" → propose 5 items with brief answers ordered easy→hard, wait for approval.
- Skip irrelevant items in the source section (e.g. a stray sahaba question inside the Пророки section).
- After each pick, confirm with the chosen answer (1 line) so the user can correct mid-flow. Keep a running draft summary at the end of the category.
- If the user says "I picked X but meant Y" — the source list often gets miscounted by the user; swap to what they actually wanted, re-render the running draft, and continue.
- After 5 picks for a category, show the final draft (value → question → answer) and ask to move to the next category.
- Total categories - 6.

### Category rules

Коран, Суры, Аяты:
- Answer should contain surah name and number and ayah number, e.g. "Сура Аль-Фатиха (1:1)".
- Add additional context or explanation if useful. E.g. for the question "Кто построил стену, которая защищает людей от племен Яджудж и Маджудж?" add context about Zulkarnain story.

Суры, аяты:
- If question requires audio (usually it has surah-ayah num in parentheses), use `download-ayah-audio` skill to get Qur'an recitation for the ayah. E.g. "Какая сура содержит этот аят (113-2)" Reference audio in question JSON.

Слова из Корана:
- If question contains arabic word, include it in the question and answer, e.g. "Как переводится слово **акбар** (*أَكْبَر*)?" — "Величайший". This helps learning and avoids ambiguity.
- Source word should be wrapped in bold `**word**`, e.g. "Как переводится слово **акбар** (*أَكْبَر*)?"
- Answer format: word on first line in bold with translation, usage examples on subsequent lines as `string[]`:
  ```json
  "question": "Как переводится слово **куль** (*قُلْ*)?",
  "answer": [
    "**Скажи** - куль (*قُلْ*)",
    "Сура Аль-Ихляс, Аль-Кафирун, Аль-Фаляк и Ан-Нас начинаются с этого слова"
  ]
  ```
- Add some examples of usage to the answer from the Qur'an if useful. Don't use arabic phrases/sentences.

Хадисы (fill-in-blank style):
- If question has `...` placeholder (e.g. `«Поистине, дела оцениваются по...»`), answer should repeat the full sentence with the missing part in **bold**, not just `...**намерениям**`:
  ```json
  "answer": [
    "«Поистине, дела оцениваются по **намерениям**».",
    "###### Передал Умар ибн аль-Хаттаб (Сахих аль-Бухари, 1)"
  ]
  ```
- For multi-blank hadiths, repeat the whole structure and bold all the answered blanks.

99 имен Аллаха:
- Use formatting h3 and bold, e.g. `### **Аль-Гафур**`

Common rules:
- If question is about single word, term or concept, wrap it with `**bold**` in both question and answer, e.g. "Значение слова **ислам**?" — "**Ислам** — покорность, подчинение Аллаху".
- If answer based on a hadith, include source reference on a new line prefixed with `######` (h6 — rendered as light gray subtle text). Use `string[]` form:
  ```json
  "answer": [
    "...**молчит**.",
    "###### Передал Абу Хурайра (Бухари 6018, Муслим 47)"
  ]
  ```
- Arabic words should be wrapped in italic `*word*` e.g. *أَكْبَر*.
- If image will be useful for the question, suggest user to upload it to `public/` and reference in question JSON, e.g. `"image": "/images/kaaba.jpg"`.
- If question explicitly mention picture, e.g. "Какая это сура? (picture 103)", try to find a relevant image in `public/images/` and reference it in question JSON. If no relevant image, ask user to upload one and reference it.
- For long question/answer lines (except first one) use `####` - 5-12 words or `#####` - 12+ words.  
- For short answers with description - put answer as bold in one line, and rest on the next lines, e.g. "Как называется второй призыв к молитве?" - 
```
"answer": [
  "**Икамат**",
  "##### Второй призыв, объявляющий о непосредственном начале молитвы"
]
```

## Output format

Valid JSON with Russian wording. No comments. No trailing commas.

## Anti-patterns

- Trick wording. Ambiguous answers. Multiple correct answers without listing all.
- Values outside 100–500 grid.
- Mixing languages within one pack.
- Media paths pointing to files not on disk.
