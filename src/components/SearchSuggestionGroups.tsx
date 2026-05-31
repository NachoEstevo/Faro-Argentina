"use client";

import type { SearchSuggestion } from "@/lib/data/searchSuggestions";
import {
  formatSuggestionCount,
  formatSuggestionGroupCount,
  groupSearchSuggestions,
  suggestionCardDetail,
  suggestionKindLabel,
} from "./SearchSuggestionGroups.helpers";
import styles from "./SearchSuggestionGroups.module.css";

interface Props {
  suggestions: SearchSuggestion[];
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

export default function SearchSuggestionGroups({
  suggestions,
  onSelectSuggestion,
  title = "Coincidencias",
  description = "",
  compact = false,
  className = "",
}: Props) {
  if (suggestions.length === 0) return null;

  const groups = groupSearchSuggestions(suggestions);

  return (
    <section
      className={`${styles.panel} ${compact ? styles.compact : ""} ${className}`}
      aria-label="Sugerencias de búsqueda"
    >
      <div className={styles.header}>
        <span>{title}</span>
        {description ? <small>{description}</small> : null}
      </div>
      <div className={styles.groups}>
        {groups.map((group) => (
          <section key={group.key} className={styles.group}>
            <div className={styles.groupHead}>
              <span className={styles.groupTitle}>{group.label}</span>
              <small>{formatSuggestionGroupCount(group.suggestions.length)}</small>
            </div>
            <div className={styles.grid}>
              {group.suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={styles.button}
                  onClick={() => onSelectSuggestion(suggestion)}
                >
                  <strong className={styles.match}>{suggestion.label}</strong>
                  <span className={styles.meta}>
                    <span className={styles.badge}>{suggestionKindLabel(suggestion)}</span>
                    <span>{suggestionCardDetail(suggestion)}</span>
                  </span>
                  {typeof suggestion.matchCount === "number" && (
                    <em className={styles.count}>{formatSuggestionCount(suggestion.matchCount)}</em>
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
