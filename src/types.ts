export type nerve_type = "sensory" | "motor" | "both";

export type study_entry = {
  name: string;
  type: nerve_type;
  function: string;
  role_in_swallowing: string;
  order: number;
};

export type level1_question = {
  entry: study_entry;
  name_options: string[];
};

export type level1_round = {
  questions: level1_question[];
};

export type level2_round = {
  entries: study_entry[];
};

export type level3_round = {
  entries: study_entry[];
};

export type level_summary = {
  correct: number;
  wrong: number;
  total: number;
};
