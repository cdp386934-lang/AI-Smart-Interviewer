import { useMemo } from 'react';
import { useInterviewStore } from '../store/interviewStore';

export function useInterview() {
  const store = useInterviewStore();

  return useMemo(() => ({
    ...store,
    progress: store.interviewState ? `${store.interviewState.questionIndex}/${store.interviewState.totalQuestions}` : '0/0',
  }), [store]);
}
