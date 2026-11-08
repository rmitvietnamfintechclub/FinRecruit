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
      const preview = session.row.cloneNode(true) as HTMLDivElement;
      delete preview.dataset.questionId;
      preview.dataset.questionDragPreview = '';
      preview.setAttribute('aria-hidden', 'true');
      preview.inert = true;

      // 👇 UI KHI ĐANG KÉO (DRAG PREVIEW) 👇
      preview.className = cn(
        preview.className,
        'border-[#0D1742] bg-[#F7F8FC] ring-4 ring-[#0D1742]/10 z-50'
      );

      Object.assign(preview.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: '0',
        zIndex: '60',
        pointerEvents: 'none',
        boxShadow: '0 20px 40px -10px rgba(13, 23, 66, 0.15)',
        transform: 'scale(1.01)', // Phóng to nhẹ để nổi bật
        transition: 'transform 0.15s ease-out',
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
      className="relative space-y-4"
    >
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      {orderedQuestions.map((question, index) => (
        <div
          key={question.id}
          data-question-id={question.id}
          className={cn(
            'grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors sm:gap-4 sm:p-5',
            drag?.id === question.id &&
              'border-dashed border-gray-400 bg-gray-50/60 *:opacity-0', // Giấu thẻ gốc khi đang kéo bản sao
            !drag && 'hover:border-gray-300 hover:shadow-md'
          )}
        >
          {/* DRAG HANDLE */}
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
            className="inline-flex h-9 w-8 cursor-grab touch-none select-none items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0D1742] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D1742]/50 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={`Reorder question ${index + 1}`}
            title="Drag to reorder · Use Up/Down arrow keys"
          >
            <GripVertical className="h-5 w-5" aria-hidden />
          </button>

          {/* NUMBER BADGE */}
          <span
            data-question-number
            className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#0D1742] px-2 text-xs font-black text-[#DCB968] shadow-sm"
          >
            Q{index + 1}
          </span>

          {/* TEXTAREA INPUT */}
          <Textarea
            value={question.text}
            disabled={disabled}
            placeholder="Type your interview question here..."
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
            className="min-h-20 resize-y rounded-xl border-gray-200 bg-gray-50/50 p-3 text-sm font-medium text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus-visible:border-[#0D1742] focus-visible:bg-white focus-visible:ring-[#0D1742]"
          />

          {/* DELETE BUTTON */}
          <button
            type="button"
            disabled={disabled || drag !== null}
            onClick={() =>
              onChange(questions.filter((item) => item.id !== question.id))
            }
            className="self-start rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-[#B82649]/10 hover:text-[#B82649] disabled:opacity-30"
            aria-label={`Remove question ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
