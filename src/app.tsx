import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { FlashcardArray, useFlashcardArray } from "react-quizlet-flashcard";
import "react-quizlet-flashcard/dist/index.css";
import type {
  level1_question,
  level1_round,
  level2_round,
  level3_round,
  nerve_type,
  study_entry,
} from "./types";

type level_id = "level_1" | "level_2" | "level_3";

type view_state =
  | "level_select"
  | "level_title"
  | "level1_question"
  | "level1_summary"
  | "level2_card"
  | "level2_summary"
  | "level3_card"
  | "level3_summary"
  | "level3_unavailable";

const type_labels: Record<nerve_type, string> = {
  sensory: "Sensory",
  motor: "Motor",
  both: "Both",
};

const level_labels: Record<level_id, { title: string; subtitle: string }> = {
  level_1: { title: "Level 1", subtitle: "Multiple Choice" },
  level_2: { title: "Level 2", subtitle: "Flash Cards" },
  level_3: { title: "Level 3", subtitle: "Swallowing Roles" },
};

function App() {
  const [entries, set_entries] = useState<study_entry[]>([]);
  const [load_error, set_load_error] = useState<string | null>(null);
  const [is_loading, set_is_loading] = useState(true);

  const [current_view, set_current_view] = useState<view_state>("level_select");
  const [current_level, set_current_level] = useState<level_id | null>(null);

  const [level1_round, set_level1_round] = useState<level1_round | null>(null);
  const [level1_index, set_level1_index] = useState(0);
  const [level1_correct, set_level1_correct] = useState(0);
  const [level1_wrong, set_level1_wrong] = useState(0);
  const [level1_failed, set_level1_failed] = useState<study_entry[]>([]);
  const [level1_selected_name, set_level1_selected_name] = useState<
    string | null
  >(null);
  const [level1_selected_type, set_level1_selected_type] =
    useState<nerve_type | null>(null);

  const [level2_round, set_level2_round] = useState<level2_round | null>(null);
  const [level2_correct, set_level2_correct] = useState(0);
  const [level2_wrong, set_level2_wrong] = useState(0);
  const [level2_failed, set_level2_failed] = useState<study_entry[]>([]);

  const [level3_round, set_level3_round] = useState<level3_round | null>(null);
  const [level3_correct, set_level3_correct] = useState(0);
  const [level3_wrong, set_level3_wrong] = useState(0);
  const [level3_failed, set_level3_failed] = useState<study_entry[]>([]);
  const [level3_message, set_level3_message] = useState<string>("");

  useEffect(() => {
    const load_data = async () => {
      try {
        const data = await invoke<study_entry[]>("load_entries");
        set_entries(data);
      } catch (error) {
        set_load_error(String(error));
      } finally {
        set_is_loading(false);
      }
    };

    load_data();
  }, []);

  const current_level_label = useMemo(() => {
    if (!current_level) {
      return null;
    }
    return level_labels[current_level];
  }, [current_level]);

  const open_level_title = (level: level_id) => {
    set_current_level(level);
    set_current_view("level_title");
  };

  const reset_to_select = () => {
    set_current_view("level_select");
    set_current_level(null);
  };

  const start_level1 = async (source_entries: study_entry[]) => {
    const round = await invoke<level1_round>("build_level1_round_command", {
      entries: source_entries,
    });
    set_level1_round(round);
    set_level1_index(0);
    set_level1_correct(0);
    set_level1_wrong(0);
    set_level1_failed([]);
    set_level1_selected_name(null);
    set_level1_selected_type(null);
    set_current_view("level1_question");
  };

  const start_level2 = async (source_entries: study_entry[]) => {
    const round = await invoke<level2_round>("build_level2_round_command", {
      entries: source_entries,
    });
    set_level2_round(round);
    set_level2_correct(0);
    set_level2_wrong(0);
    set_level2_failed([]);
    set_current_view("level2_card");
  };

  const start_level3 = async (source_entries: study_entry[]) => {
    try {
      const round = await invoke<level3_round>("build_level3_round_command", {
        entries: source_entries,
      });
      set_level3_round(round);
      set_level3_correct(0);
      set_level3_wrong(0);
      set_level3_failed([]);
      set_current_view("level3_card");
    } catch (error) {
      set_level3_message(String(error));
      set_current_view("level3_unavailable");
    }
  };

  const handle_level_start = async () => {
    if (!current_level) {
      return;
    }

    if (current_level === "level_1") {
      await start_level1(entries);
      return;
    }

    if (current_level === "level_2") {
      await start_level2(entries);
      return;
    }

    await start_level3(entries);
  };

  const current_level1_question = level1_round?.questions[level1_index] ?? null;
  const level1_total = level1_round?.questions.length ?? 0;

  const submit_level1_answer = () => {
    if (
      !current_level1_question ||
      !level1_selected_name ||
      !level1_selected_type
    ) {
      return;
    }

    const is_correct =
      level1_selected_name === current_level1_question.entry.name &&
      level1_selected_type === current_level1_question.entry.type;

    if (is_correct) {
      set_level1_correct((value) => value + 1);
    } else {
      set_level1_wrong((value) => value + 1);
      set_level1_failed((value) => [...value, current_level1_question.entry]);
    }

    const next_index = level1_index + 1;
    if (level1_round && next_index < level1_round.questions.length) {
      set_level1_index(next_index);
      set_level1_selected_name(null);
      set_level1_selected_type(null);
    } else {
      set_current_view("level1_summary");
    }
  };

  const level2_total = level2_round?.entries.length ?? 0;

  const handle_level2_score = (
    entry: study_entry,
    is_correct: boolean,
    is_last: boolean,
  ) => {
    if (is_correct) {
      set_level2_correct((value) => value + 1);
    } else {
      set_level2_wrong((value) => value + 1);
      set_level2_failed((value) => [...value, entry]);
    }

    if (is_last) {
      set_current_view("level2_summary");
    }
  };

  const level3_total = level3_round?.entries.length ?? 0;

  const handle_level3_score = (
    entry: study_entry,
    is_correct: boolean,
    is_last: boolean,
  ) => {
    if (is_correct) {
      set_level3_correct((value) => value + 1);
    } else {
      set_level3_wrong((value) => value + 1);
      set_level3_failed((value) => [...value, entry]);
    }

    if (is_last) {
      set_current_view("level3_summary");
    }
  };

  let content = null;

  if (is_loading) {
    content = (
      <div className="header">
        <h1 className="title">Loading Study Guide</h1>
        <p className="subtitle">Fetching entries from the CSV.</p>
      </div>
    );
  } else if (load_error) {
    content = (
      <div className="header">
        <h1 className="title">Unable to Load CSV</h1>
        <p className="subtitle">{load_error}</p>
        <div className="button_row section">
          <button
            className="button button--primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  } else if (entries.length === 0) {
    content = (
      <div className="header">
        <h1 className="title">No Entries Found</h1>
        <p className="subtitle">Add study entries to the CSV and restart.</p>
      </div>
    );
  } else if (current_view === "level_select") {
    content = <LevelSelect on_select_level={open_level_title} />;
  } else if (current_view === "level_title" && current_level_label) {
    content = (
      <LevelTitle
        title={current_level_label.title}
        subtitle={current_level_label.subtitle}
        on_start={handle_level_start}
        on_back={reset_to_select}
      />
    );
  } else if (current_view === "level1_question" && current_level1_question) {
    content = (
      <Level1Question
        question={current_level1_question}
        question_index={level1_index}
        total={level1_total}
        selected_name={level1_selected_name}
        selected_type={level1_selected_type}
        on_select_name={set_level1_selected_name}
        on_select_type={set_level1_selected_type}
        on_submit={submit_level1_answer}
      />
    );
  } else if (current_view === "level1_summary") {
    content = (
      <Level1Summary
        correct={level1_correct}
        wrong={level1_wrong}
        total={level1_total}
        has_failed={level1_failed.length > 0}
        on_retry={() => start_level1(level1_failed)}
        on_next={() => open_level_title("level_2")}
      />
    );
  } else if (current_view === "level2_card" && level2_round) {
    content = (
      <Level2Card
        entries={level2_round.entries}
        on_score={handle_level2_score}
      />
    );
  } else if (current_view === "level2_summary") {
    content = (
      <Level2Summary
        correct={level2_correct}
        wrong={level2_wrong}
        total={level2_total}
        has_failed={level2_failed.length > 0}
        on_retry={() => start_level2(level2_failed)}
        on_restart={reset_to_select}
        on_next={() => open_level_title("level_3")}
      />
    );
  } else if (current_view === "level3_card" && level3_round) {
    content = (
      <Level3Card
        entries={level3_round.entries}
        on_score={handle_level3_score}
      />
    );
  } else if (current_view === "level3_summary") {
    content = (
      <Level3Summary
        correct={level3_correct}
        wrong={level3_wrong}
        total={level3_total}
        has_failed={level3_failed.length > 0}
        on_retry={() => start_level3(level3_failed)}
        on_restart={reset_to_select}
      />
    );
  } else if (current_view === "level3_unavailable") {
    content = (
      <div className="header">
        <div className="level_badge">Level 3 Unavailable</div>
        <h1 className="title">Swallowing Roles Missing</h1>
        <p className="subtitle">
          {level3_message ||
            "No entries have a role in swallowing. Add roles to the CSV to unlock Level 3."}
        </p>
        <div className="button_row section">
          <button className="button button--primary" onClick={reset_to_select}>
            Back to Levels
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app_shell">
      <div className="panel">{content}</div>
    </div>
  );
}

type level_select_props = {
  on_select_level: (level: level_id) => void;
};

function LevelSelect({ on_select_level }: level_select_props) {
  return (
    <div className="fade_in">
      <div className="header">
        <div className="level_badge">Cranial Nerve Study Guide</div>
        <h1 className="title">Choose Your Level</h1>
        <p className="subtitle">
          Build accuracy, speed, and confidence across all three modes.
        </p>
      </div>
      <div className="button_row">
        <button
          className="button button--primary"
          onClick={() => on_select_level("level_1")}
        >
          Level 1
        </button>
        <button
          className="button button--ghost"
          onClick={() => on_select_level("level_2")}
        >
          Level 2
        </button>
        <button
          className="button button--subtle"
          onClick={() => on_select_level("level_3")}
        >
          Level 3
        </button>
      </div>
    </div>
  );
}

type level_title_props = {
  title: string;
  subtitle: string;
  on_start: () => void;
  on_back: () => void;
};

function LevelTitle({ title, subtitle, on_start, on_back }: level_title_props) {
  return (
    <div className="fade_in">
      <div className="header">
        <div className="level_badge">{title}</div>
        <h1 className="title">{subtitle}</h1>
        <p className="subtitle">Stay focused. Every response matters.</p>
      </div>
      <div className="button_row">
        <button className="button button--primary" onClick={on_start}>
          Start
        </button>
        <button className="button button--ghost" onClick={on_back}>
          Back
        </button>
      </div>
    </div>
  );
}

type level1_question_props = {
  question: level1_question;
  question_index: number;
  total: number;
  selected_name: string | null;
  selected_type: nerve_type | null;
  on_select_name: (value: string) => void;
  on_select_type: (value: nerve_type) => void;
  on_submit: () => void;
};

function Level1Question({
  question,
  question_index,
  total,
  selected_name,
  selected_type,
  on_select_name,
  on_select_type,
  on_submit,
}: level1_question_props) {
  return (
    <div className="fade_in">
      <div className="header">
        <div className="level_badge">Level 1 Question</div>
        <h1 className="title">Match the Function</h1>
        <p className="subtitle">
          Choose the nerve name and type that match this function.
        </p>
      </div>
      <div className="card">
        <div className="counter">
          Question {question_index + 1} of {total}
        </div>
        <p className="card_prompt">{question.entry.function}</p>
        <div className="section">
          <div className="option_grid">
            {question.name_options.map((option, index) => (
              <button
                key={`${option}-${index}`}
                className={
                  option === selected_name
                    ? "option_button option_button--selected"
                    : "option_button"
                }
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={() => on_select_name(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="section">
          <div className="option_grid">
            {(Object.keys(type_labels) as nerve_type[]).map(
              (type_option, index) => (
                <button
                  key={type_option}
                  className={
                    type_option === selected_type
                      ? "option_button option_button--selected"
                      : "option_button"
                  }
                  style={{ animationDelay: `${(index + 4) * 60}ms` }}
                  onClick={() => on_select_type(type_option)}
                >
                  {type_labels[type_option]}
                </button>
              ),
            )}
          </div>
        </div>
        <div className="button_row section">
          <button
            className="button button--primary"
            onClick={on_submit}
            disabled={!selected_name || !selected_type}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

type level1_summary_props = {
  correct: number;
  wrong: number;
  total: number;
  has_failed: boolean;
  on_retry: () => void;
  on_next: () => void;
};

function Level1Summary({
  correct,
  wrong,
  total,
  has_failed,
  on_retry,
  on_next,
}: level1_summary_props) {
  return (
    <div className="fade_in">
      <div className="header">
        <div className="level_badge">Level 1 Complete</div>
        <h1 className="title">Summary</h1>
        <p className="subtitle">Review your score and decide your next move.</p>
      </div>
      <div className="summary_grid">
        <div className="summary_tile">
          <strong>{correct}</strong>
          <div>Correct</div>
        </div>
        <div className="summary_tile">
          <strong>{wrong}</strong>
          <div>Wrong</div>
        </div>
        <div className="summary_tile">
          <strong>{total}</strong>
          <div>Total</div>
        </div>
      </div>
      <div className="button_row section">
        <button className="button button--primary" onClick={on_next}>
          Next Level
        </button>
        {has_failed && (
          <button className="button button--ghost" onClick={on_retry}>
            Retry Failed
          </button>
        )}
      </div>
    </div>
  );
}

type level2_card_props = {
  entries: study_entry[];
  on_score: (entry: study_entry, is_correct: boolean, is_last: boolean) => void;
};

function Level2Card({ entries, on_score }: level2_card_props) {
  const deck = useMemo(
    () =>
      entries.map((entry) => ({
        id: entry.order,
        className: "deck_card",
        front: {
          html: (
            <div className="deck_face">
              <div className="deck_title">{entry.name}</div>
            </div>
          ),
        },
        back: {
          html: (
            <div className="deck_face">
              <div className="deck_label">Type</div>
              <div className="deck_value">{type_labels[entry.type]}</div>
              <div className="deck_label">Function</div>
              <div className="deck_value deck_value--body">
                {entry.function}
              </div>
            </div>
          ),
        },
      })),
    [entries],
  );

  const flip_array_hook = useFlashcardArray({
    deckLength: deck.length,
    showControls: false,
    showCount: false,
    showProgressBar: true,
  });

  const current_index = flip_array_hook.currentCard;
  const current_entry = entries[current_index];
  const is_flipped = flip_array_hook.flipHook.state === "back";

  const handle_score = (is_correct: boolean) => {
    if (!current_entry || !is_flipped) {
      return;
    }

    const is_last = current_index + 1 >= entries.length;
    on_score(current_entry, is_correct, is_last);

    if (!is_last) {
      flip_array_hook.nextCard();
      flip_array_hook.flipHook.resetCardState();
    }
  };

  return (
    <div className="fade_in">
      <div className="header">
        <div className="level_badge">Level 2 Flash Card</div>
        <h1 className="title">Recall the Details</h1>
        <p className="subtitle">
          Click the card to reveal the type and function.
        </p>
      </div>
      <div className="flashcard_host">
        <div className="flashcard_meta">
          Card {current_index + 1} of {entries.length}
        </div>
        <FlashcardArray deck={deck} flipArrayHook={flip_array_hook} />
        <div className="button_row section">
          <button
            className="button button--ghost"
            onClick={() => handle_score(true)}
            disabled={!is_flipped}
          >
            Correct
          </button>
          <button
            className="button button--subtle"
            onClick={() => handle_score(false)}
            disabled={!is_flipped}
          >
            Incorrect
          </button>
        </div>
        {!is_flipped && (
          <p className="flip_hint">Click the card to unlock scoring.</p>
        )}
      </div>
    </div>
  );
}

type level2_summary_props = {
  correct: number;
  wrong: number;
  total: number;
  has_failed: boolean;
  on_retry: () => void;
  on_restart: () => void;
  on_next: () => void;
};

function Level2Summary({
  correct,
  wrong,
  total,
  has_failed,
  on_retry,
  on_restart,
  on_next,
}: level2_summary_props) {
  return (
    <div className="fade_in">
      <div className="header">
        <div className="level_badge">Level 2 Complete</div>
        <h1 className="title">Summary</h1>
        <p className="subtitle">Review your results and move to Level 3.</p>
      </div>
      <div className="summary_grid">
        <div className="summary_tile">
          <strong>{correct}</strong>
          <div>Correct</div>
        </div>
        <div className="summary_tile">
          <strong>{wrong}</strong>
          <div>Wrong</div>
        </div>
        <div className="summary_tile">
          <strong>{total}</strong>
          <div>Total</div>
        </div>
      </div>
      <div className="button_row section">
        <button className="button button--primary" onClick={on_next}>
          Next Level
        </button>
        <button className="button button--ghost" onClick={on_restart}>
          Restart Game
        </button>
        {has_failed && (
          <button className="button button--subtle" onClick={on_retry}>
            Retry Failed
          </button>
        )}
      </div>
    </div>
  );
}

type level3_card_props = {
  entries: study_entry[];
  on_score: (entry: study_entry, is_correct: boolean, is_last: boolean) => void;
};

function Level3Card({ entries, on_score }: level3_card_props) {
  const deck = useMemo(
    () =>
      entries.map((entry) => ({
        id: entry.order,
        className: "deck_card",
        front: {
          html: (
            <div className="deck_face">
              <div className="deck_label">Swallowing Role</div>
              <div className="deck_value deck_value--body">
                {entry.role_in_swallowing}
              </div>
            </div>
          ),
        },
        back: {
          html: (
            <div className="deck_face">
              <div className="deck_label">Nerve</div>
              <div className="deck_title">{entry.name}</div>
            </div>
          ),
        },
      })),
    [entries],
  );

  const flip_array_hook = useFlashcardArray({
    deckLength: deck.length,
    showControls: false,
    showCount: false,
    showProgressBar: true,
  });

  const current_index = flip_array_hook.currentCard;
  const current_entry = entries[current_index];
  const is_flipped = flip_array_hook.flipHook.state === "back";

  const handle_score = (is_correct: boolean) => {
    if (!current_entry || !is_flipped) {
      return;
    }

    const is_last = current_index + 1 >= entries.length;
    on_score(current_entry, is_correct, is_last);

    if (!is_last) {
      flip_array_hook.nextCard();
      flip_array_hook.flipHook.resetCardState();
    }
  };

  return (
    <div className="fade_in">
      <div className="header">
        <div className="level_badge">Level 3 Swallowing Roles</div>
        <h1 className="title">Name the Nerve</h1>
        <p className="subtitle">
          Click the card to reveal the nerve tied to this role.
        </p>
      </div>
      <div className="flashcard_host">
        <div className="flashcard_meta">
          Card {current_index + 1} of {entries.length}
        </div>
        <FlashcardArray deck={deck} flipArrayHook={flip_array_hook} />
        <div className="button_row section">
          <button
            className="button button--ghost"
            onClick={() => handle_score(true)}
            disabled={!is_flipped}
          >
            Correct
          </button>
          <button
            className="button button--subtle"
            onClick={() => handle_score(false)}
            disabled={!is_flipped}
          >
            Incorrect
          </button>
        </div>
        {!is_flipped && (
          <p className="flip_hint">Click the card to unlock scoring.</p>
        )}
      </div>
    </div>
  );
}

type level3_summary_props = {
  correct: number;
  wrong: number;
  total: number;
  has_failed: boolean;
  on_retry: () => void;
  on_restart: () => void;
};

function Level3Summary({
  correct,
  wrong,
  total,
  has_failed,
  on_retry,
  on_restart,
}: level3_summary_props) {
  return (
    <div className="fade_in">
      <div className="header">
        <div className="level_badge">Level 3 Complete</div>
        <h1 className="title">Summary</h1>
        <p className="subtitle">Lock in the swallowing roles or restart.</p>
      </div>
      <div className="summary_grid">
        <div className="summary_tile">
          <strong>{correct}</strong>
          <div>Correct</div>
        </div>
        <div className="summary_tile">
          <strong>{wrong}</strong>
          <div>Wrong</div>
        </div>
        <div className="summary_tile">
          <strong>{total}</strong>
          <div>Total</div>
        </div>
      </div>
      <div className="button_row section">
        <button className="button button--primary" onClick={on_restart}>
          Restart Game
        </button>
        {has_failed && (
          <button className="button button--ghost" onClick={on_retry}>
            Retry Failed
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
