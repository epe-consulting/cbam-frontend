import { Box, CircularProgress, Typography } from '@mui/material';
import { DynamicQuestionStep } from './DynamicQuestionStep';
import type { QuestionWithOptions } from '../hooks/useQuestionsByStep';

const T = {
  font: { body: "'DM Sans', system-ui, sans-serif" },
  color: { forest: '#0B4F3E', muted: '#6B8F82' },
};

export interface QuestionStepWrapperProps {
  questions: QuestionWithOptions[];
  loading: boolean;
  error: string | null;
  getAnswer: (questionId: number) => string;
  setAnswer: (questionId: number, valueText: string) => void | Promise<void>;
  onOptionSelect?: (questionCode: string, optionCode: string) => void;
  onValueChange?: (questionCode: string, valueText: string) => void;
  onBack: () => void;
  onNext: () => void;
  title?: React.ReactNode;
}

export function QuestionStepWrapper({
  questions,
  loading,
  error,
  getAnswer,
  setAnswer,
  onOptionSelect,
  onValueChange,
  onBack,
  onNext,
  title,
}: QuestionStepWrapperProps) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={120}>
        <CircularProgress sx={{ color: T.color.forest }} />
      </Box>
    );
  }
  if (error) {
    return (
      <Typography sx={{ mb: 2, fontFamily: T.font.body, color: '#C0392B' }}>
        {error}
      </Typography>
    );
  }
  if (!questions || questions.length === 0) {
    return (
      <Typography sx={{ fontFamily: T.font.body, color: T.color.muted }}>
        No questions available for this step.
      </Typography>
    );
  }
  return (
    <>
      {title}
      <DynamicQuestionStep
        questions={questions}
        loading={false}
        error={null}
        getAnswer={getAnswer}
        setAnswer={setAnswer}
        onOptionSelect={onOptionSelect}
        onValueChange={onValueChange}
        onBack={onBack}
        onNext={onNext}
      />
    </>
  );
}