/**
 * A single playable item in the radio.
 *
 * `kind` is deliberately generic: today every track is a song streamed from
 * GeetGanga, but the same shape will carry audiobook chapters and book
 * summaries later (the player only needs an audio URL + title).
 */
export type RadioTrackKind = "song" | "audiobook" | "book_summary";

export interface RadioTrack {
  id: string;
  title: string;
  title_native: string;
  language_name: string;
  language_code: string;
  genre: string;
  duration_seconds: number;
  audio_url: string;
  source_url: string;
  kind: RadioTrackKind;
  /** Reserved for audiobooks / summaries. */
  author?: string;
  description?: string;
  cover_image_url?: string;
}

export interface RadioStation {
  id: string;
  name_mr: string;
  name_hi: string;
  name_en: string;
  description_mr: string;
  description_hi: string;
  description_en: string;
  tracks: RadioTrack[];
}

export interface RadioSource {
  name: string;
  homepage: string;
  category_url: string;
  license: string;
  license_url: string;
}

export interface RadioData {
  generated_at: string;
  source: RadioSource;
  stations: RadioStation[];
}
