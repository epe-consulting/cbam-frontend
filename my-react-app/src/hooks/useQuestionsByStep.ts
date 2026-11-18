import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getQuestionsByStep,
  getQuestionOptions,
  type Question,
  type QuestionOption,
} from '../api/questions';
import { tr } from '../i18n';

export interface QuestionWithOptions extends Question {
  options: QuestionOption[];
}

function mergeAndSortQuestions(questions: Question[]): Question[] {
  const byId = new Map<number, Question>();
  questions.forEach((q) => byId.set(q.id, q));
  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Dedupe by question code (first occurrence wins) so the same step never shows the same question twice. */
function dedupeByCode<T extends { code: string }>(list: T[]): T[] {
  return list.filter((q, i, arr) => arr.findIndex((x) => x.code === q.code) === i);
}

export function useQuestionsByStep(stepCode: string | string[] | null) {
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Texts come localized from the backend (Accept-Language); refetch when the language changes.
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const lastStepKeyRef = useRef<string | null>(null);

  /**
   * `silent` keeps the current questions on screen while reloading (language switch): showing the
   * loading state would unmount the step and lose answers the user has not saved yet.
   */
  const fetchQuestions = useCallback(async (codeOrCodes: string | string[], silent = false) => {
    const codes = Array.isArray(codeOrCodes) ? codeOrCodes : [codeOrCodes];
    if (codes.length === 0) {
      setQuestions([]);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const lists = await Promise.all(codes.map((code) => getQuestionsByStep(code)));
      const merged = mergeAndSortQuestions(lists.flat());
      const withOptions: QuestionWithOptions[] = await Promise.all(
        merged.map(async (q) => {
          const needsOptions =
            q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTI_CHOICE';
          const options = needsOptions ? await getQuestionOptions(q.id) : [];
          return { ...q, options };
        })
      );
      setQuestions(dedupeByCode(withOptions));
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('err.questions'));
      if (!silent) setQuestions([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const stepKey = stepCode == null ? null : (Array.isArray(stepCode) ? stepCode.join('|') : stepCode);

  useEffect(() => {
    if (stepCode) {
      // Same step, only the language changed -> reload without the loading state.
      const silent = lastStepKeyRef.current === stepKey;
      lastStepKeyRef.current = stepKey;
      fetchQuestions(stepCode, silent);
    } else {
      lastStepKeyRef.current = null;
      setQuestions([]);
      setError(null);
    }
    // stepKey tracks the content of stepCode (arrays may be recreated on every render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, language, fetchQuestions]);

  return {
    questions,
    loading,
    error,
    refetch: () => stepCode && fetchQuestions(stepCode),
  };
}
