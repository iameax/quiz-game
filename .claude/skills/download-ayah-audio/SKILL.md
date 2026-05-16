---
name: download-ayah-audio
description: Download a single ayah recitation MP3 by surah and ayah number. Use when the user asks to fetch, add, or download Qur'an ayah audio for the quiz-game project. Saves to `public/audio/husary_{surah}_{ayah}.mp3`.
---

# Download Ayah Audio

Fetches one ayah MP3 from everyayah.com (Husary Muallim 128kbps reciter) and saves it to `public/audio/` using the project's existing naming convention.

## Inputs

- `surah` — integer 1–114
- `ayah` — integer ≥ 1

## Source

- Base: `https://everyayah.com/data/Husary_Muallim_128kbps/`
- File: `{surah:03d}{ayah:03d}.mp3` (zero-padded to 3 digits each)
- Example: surah 113 ayah 2 → `https://everyayah.com/data/Husary_Muallim_128kbps/113002.mp3`

## Destination

- Path: `public/audio/husary_{surah}_{ayah}.mp3` (no zero-padding)
- Example: `public/audio/husary_113_2.mp3`

## Steps

1. Validate surah ∈ [1,114] and ayah ≥ 1.
2. Build source URL with zero-padded surah/ayah (printf `%03d%03d`).
3. Build dest path with raw (non-padded) surah/ayah.
4. Skip if dest already exists unless user said overwrite.
5. Download with `curl`:
   ```bash
   S=$(printf '%03d' "$surah")
   A=$(printf '%03d' "$ayah")
   curl -fsSL -o "public/audio/husary_${surah}_${ayah}.mp3" \
     "https://everyayah.com/data/Husary_Muallim_128kbps/${S}${A}.mp3"
   ```
   - `-f` fail on HTTP errors (catches 404 for invalid ayah).
   - `-L` follow redirects.
6. Verify file size > 0 and report saved path.

## Errors

- `curl: (22) ... 404` → ayah does not exist for that surah. Surface the exact ayah pair to user.
- Network failure → retry once, then report.

## Multiple ayat

If user requests a range (e.g. surah 113 ayat 1–5), loop sequentially. Do not parallelize — everyayah.com is a small host.

## Alternate reciters

Default is Husary Muallim 128kbps. If user names another reciter, swap the path segment (e.g. `Husary_128kbps`, `Alafasy_128kbps`, `Abdul_Basit_Murattal_192kbps`) and update the dest filename prefix accordingly (`alafasy_{surah}_{ayah}.mp3`).
