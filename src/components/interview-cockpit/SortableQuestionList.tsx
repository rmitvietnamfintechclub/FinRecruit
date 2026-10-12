'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type DraftInterviewQuestion = {
  id: string;
  text: string;
};

type DragOrder = {
  id: string;
  fromIndex: number;
  toIndex: number;
};

type DragSession = DragOrder & {
  pointerId: number;
  startY: number;
  clientY: number;
  offsetY: number;
  height: number;
  captureTarget: HTMLDivElement;
  row: HTMLDivElement;
  scrollContainer: HTMLElement | null;
  started: boolean;
};

function moveQuestion(
  questions: DraftInterviewQuestion[],
  fromIndex: number,
  toIndex: number
) {
  const reordered = [...questions];
  const [question] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, question);
  return reordered;
}

export function SortableQuestionList({
  questions,
  disabled,
  onChange,
  onDraggingChange,
}: {
  questions: DraftInterviewQuestion[];
  disabled: boolean;
  onChange: (questions: DraftInterviewQuestion[]) => void;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const [drag, setDrag] = useState<DragOrder | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const previousTopsRef = useRef(new Map<string, number>());
  const orderedQuestions = drag
    ? moveQuestion(questions, drag.fromIndex, drag.toIndex)
    : questions;

  // Stable row IDs keep each textarea, its value and the captured pointer
  // attached to the same question while the surrounding rows change places.
  useLayoutEffect(() => {
    const rows =
      listRef.current?.querySelectorAll<HTMLDivElement>('[data-question-id]');
    if (!rows) return;
    const nextTops = new Map<string, number>();
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    rows.forEach((row) => {
      const id = row.dataset.questionId!;
      const top = row.offsetTop;
      const previousTop = previousTopsRef.current.get(id);
      nextTops.set(id, top);

      if (previousTop !== undefined && previousTop !== top) {
        row.getAnimations().forEach((animation) => animation.cancel());
        if (!reduceMotion && id !== drag?.id) {
          row.animate(
            [
              { transform: `translateY(${previousTop - top}px)` },
              { transform: 'translateY(0)' },
            ],
            { duration: 180, easing: 'ease-out' }
          );
        }
      }
    });
    previousTopsRef.current = nextTops;
  }, [orderedQuestions, drag?.id]);

  const resetDrag = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }
    previewRef.current?.remove();
    previewRef.current = null;
    if (session?.captureTarget.hasPointerCapture(session.pointerId)) {
      session.captureTarget.releasePointerCapture(session.pointerId);
    }
    setDrag(null);
    onDraggingChange(false);
  }, [onDraggingChange]);

  useEffect(() => {
    const cancel = () => {
      if (!sessionRef.current) return;
      setAnnouncement('Reordering cancelled. Question order is unchanged.');
      resetDrag();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', cancel);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      previewRef.current?.remove();
    };
  }, [resetDrag]);

  const updateDragPosition = () => {
    const session = sessionRef.current;
    const list = listRef.current;
    const preview = previewRef.current;
    if (!session?.started || !list || !preview) return;

    preview.style.top = `${session.clientY - session.offsetY}px`;
    const centerY = session.clientY - session.offsetY + session.height / 2;
    const listTop = list.getBoundingClientRect().top;
    const rows = list.querySelectorAll<HTMLDivElement>('[data-question-id]');
    let toIndex = 0;
    rows.forEach((row) => {
      if (row.dataset.questionId === session.id) return;
      // Layout offsets ignore the displacement animation, so a moving row
      // cannot repeatedly reverse the target order under a stationary pointer.
      if (centerY > listTop + row.offsetTop + row.offsetHeight / 2) {
        toIndex += 1;
      }
    });

    if (session.toIndex !== toIndex) {
      session.toIndex = toIndex;
      setDrag({
        id: session.id,
        fromIndex: session.fromIndex,
        toIndex,
      });
      const number = preview.querySelector('[data-question-number]');
      if (number) number.textContent = `Q${toIndex + 1}`;
      setAnnouncement(`Question moved to position ${toIndex + 1}.`);
    }
  };

  const autoScroll = () => {
    const session = sessionRef.current;
    if (!session?.started) return;
    const edge = 64;
    const bounds = session.scrollContainer?.getBoundingClientRect();
    const top = bounds?.top ?? 0;
    const bottom = bounds?.bottom ?? window.innerHeight;
    const distance =
      session.clientY < top + edge
        ? -Math.ceil(((top + edge - session.clientY) / edge) * 16)
        : session.clientY > bottom - edge
          ? Math.ceil(((session.clientY - bottom + edge) / edge) * 16)
          : 0;
    if (distance) {
      if (session.scrollContainer) {
        session.scrollContainer.scrollBy(0, distance);
      } else {
        window.scrollBy(0, distance);
      }
      updateDragPosition();
    }
    scrollFrameRef.current = window.requestAnimationFrame(autoScroll);
  };

  const startPointer = (
    event: PointerEvent<HTMLButtonElement>,
    question: DraftInterviewQuestion,
    index: number
  ) => {
    if (
      disabled ||
      questions.length < 2 ||
      sessionRef.current ||
      !event.isPrimary ||
      event.button !== 0
    )
      return;
    const row =
      event.currentTarget.closest<HTMLDivElement>('[data-question-id]');
    const list = listRef.current;
    if (!row || !list) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    // Capture on the list, which stays in the DOM when individual rows move.
    list.setPointerCapture(event.pointerId);
    const rect = row.getBoundingClientRect();
    let scrollContainer: HTMLElement | null = row.parentElement;
    while (
      scrollContainer &&
      !/^(auto|scroll)$/.test(
        window.getComputedStyle(scrollContainer).overflowY
      )
    ) {
      scrollContainer = scrollContainer.parentElement;
    }
    sessionRef.current = {
      id: question.id,
      fromIndex: index,
      toIndex: index,
      pointerId: event.pointerId,
      startY: event.clientY,
      clientY: event.clientY,
      offsetY: event.clientY - rect.top,
      height: rect.height,
      row,
      scrollContainer,
      captureTarget: list,
      started: false,
    };
  };

  const movePointer = (event: PointerEvent<HTMLDivElement>) => {
    const session = sessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    session.clientY = event.clientY;
    if (!session.started) {
      if (Math.abs(event.clientY - session.startY) < 4) return;
      session.started = true;
      const rect = session.row.getBoundingClientRect();
      // Copy the whole rendered card, including its current textarea value.
      // The original card becomes a placeholder at the live insertion point.
      const preview = session.row.cloneNode(true) as HTMLDivElement;
      delete preview.dataset.questionId;
      preview.dataset.questionDragPreview = '';
      preview.setAttribute('aria-hidden', 'true');
      preview.inert = true;
      preview.className = cn(
        preview.className,
        'border-blue-500 bg-card ring-2 ring-blue-200 dark:ring-blue-900'
      );
      Object.assign(preview.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: '0',
        zIndex: '60',
        pointerEvents: 'none',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.22)',
      });
      preview.querySelectorAll('[data-question-handle]').forEach((handle) => {
        handle.removeAttribute('data-question-handle');
      });
      document.body.append(preview);
      previewRef.current = preview;
      setDrag({
        id: session.id,
        fromIndex: session.fromIndex,
        toIndex: session.toIndex,
      });
      onDraggingChange(true);
      setAnnouncement(`Reordering question ${session.fromIndex + 1}.`);
      scrollFrameRef.current = window.requestAnimationFrame(autoScroll);
    }
    updateDragPosition();
  };

  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
    const session = sessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (session.started) {
      onChange(moveQuestion(questions, session.fromIndex, session.toIndex));
      setAnnouncement(`Question moved to position ${session.toIndex + 1}.`);
    }
    resetDrag();
  };

  const focusHandle = (id: string) => {
    window.requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLButtonElement>(`[data-question-handle="${id}"]`)
        ?.focus({ preventScroll: true });
    });
  };

  return (
    <div
      ref={listRef}
      onPointerMove={movePointer}
      onPointerUp={finishPointer}
      onPointerCancel={resetDrag}
      onLostPointerCapture={resetDrag}
      className="relative space-y-3"
    >
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      {orderedQuestions.map((question, index) => (
        <div
          key={question.id}
          data-question-id={question.id}
          className={cn(
            'grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-start gap-2 rounded-2xl border border-border bg-card p-3 sm:gap-3 sm:p-4',
            drag?.id === question.id &&
              'border-dashed border-blue-400 bg-blue-50/60 [&>*]:opacity-0 dark:bg-blue-950/20'
          )}
        >
          <button
            type="button"
            disabled={disabled || questions.length < 2}
            onPointerDown={(event) => startPointer(event, question, index)}
            onKeyDown={(event) => {
              if (disabled || drag) return;
              const toIndex =
                event.key === 'ArrowUp'
                  ? index - 1
                  : event.key === 'ArrowDown'
                    ? index + 1
                    : index;
              if (toIndex === index) return;
              event.preventDefault();
              if (toIndex < 0 || toIndex >= questions.length) return;
              onChange(moveQuestion(questions, index, toIndex));
              setAnnouncement(`Question moved to position ${toIndex + 1}.`);
              focusHandle(question.id);
            }}
            data-question-handle={question.id}
            className="inline-flex h-9 w-8 cursor-grab touch-none select-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Reorder question ${index + 1}`}
            aria-describedby="question-reorder-help"
            title="Drag to reorder · Use Up/Down arrow keys"
          >
            <GripVertical className="h-5 w-5" aria-hidden />
          </button>
          <span
            data-question-number
            className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-extrabold text-blue-700"
          >
            Q{index + 1}
          </span>
          <Textarea
            value={question.text}
            disabled={disabled}
            aria-label={`Question ${index + 1}`}
            onChange={(event) =>
              onChange(
                questions.map((item) =>
                  item.id === question.id
                    ? { ...item, text: event.target.value }
                    : item
                )
              )
            }
            className="min-h-20"
          />
          <button
            type="button"
            disabled={disabled || drag !== null}
            onClick={() =>
              onChange(questions.filter((item) => item.id !== question.id))
            }
            className="self-start rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/60"
            aria-label={`Remove question ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
