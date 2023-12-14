import { useTimeSelection } from '@fi-sci/context-time-selection';
import React, { FunctionComponent, useCallback, useMemo, useState } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';

type Props = {
  width: number;
  height: number;
  hideVisibleTimeRange?: boolean;
};

const a0 = 6;
const a1 = 3;
const b0 = 15;

export const timeSelectionBarHeight = 20;

const TimeSelectionBar: FunctionComponent<Props> = ({ width, height, hideVisibleTimeRange }) => {
  const {
    currentTimeSec,
    setCurrentTime,
    startTimeSec,
    endTimeSec,
    visibleStartTimeSec,
    visibleEndTimeSec,
    setVisibleTimeRange,
  } = useTimeSelection();

  const fracToPixel = useMemo(
    () => (frac: number) => {
      return frac * width;
    },
    [width]
  );

  const pixelToFrac = useMemo(
    () => (pix: number) => {
      return pix / width;
    },
    [width]
  );

  const { x0, x1, x2, y1, y2 } = useMemo(() => {
    const t1 = startTimeSec ?? 0;
    const t2 = endTimeSec ?? 1;
    if (t2 <= t1) {
      return {
        x0: 0,
        x1: undefined,
        x2: undefined,
        y1: undefined,
        y2: undefined,
      };
    }
    const x0 = currentTimeSec !== undefined ? fracToPixel((currentTimeSec - t1) / (t2 - t1)) : 0;
    const x1 = visibleStartTimeSec !== undefined ? fracToPixel((visibleStartTimeSec - t1) / (t2 - t1)) : undefined;
    const x2 = visibleEndTimeSec !== undefined ? fracToPixel((visibleEndTimeSec - t1) / (t2 - t1)) : undefined;
    let y1 = x1;
    let y2 = x2;
    if (x1 !== undefined && x2 !== undefined) {
      if (x2 - x1 < b0) {
        const center = (x1 + x2) / 2;
        y1 = center - b0 / 2;
        y2 = center + b0 / 2;
      }
    }
    return { x0, x1, x2, y1, y2 };
  }, [startTimeSec, endTimeSec, currentTimeSec, visibleStartTimeSec, visibleEndTimeSec, fracToPixel]);

  const [isDragging, setIsDragging] = useState(false);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return;
      const boundingRect = e.currentTarget.getBoundingClientRect();
      const p = {
        x: e.clientX - boundingRect.x,
        y: e.clientY - boundingRect.y,
      };
      const frac = pixelToFrac(p.x);
      const t1 = startTimeSec ?? 0;
      const t2 = endTimeSec ?? 1;
      const t = t1 + frac * (t2 - t1);
      // setCurrentTime(t, {autoScrollVisibleTimeRange: true})
      setCurrentTime(t);
      const diam =
        visibleStartTimeSec !== undefined && visibleEndTimeSec !== undefined
          ? visibleEndTimeSec - visibleStartTimeSec
          : undefined;
      const v1 = diam !== undefined ? Math.max(t - diam / 2, t1) : undefined;
      const v2 = diam !== undefined && v1 !== undefined ? v1 + diam : undefined;
      if (v1 !== undefined && v2 !== undefined) {
        setVisibleTimeRange(v1, v2);
      }
    },
    [
      isDragging,
      pixelToFrac,
      startTimeSec,
      endTimeSec,
      setCurrentTime,
      visibleStartTimeSec,
      visibleEndTimeSec,
      setVisibleTimeRange,
    ]
  );

  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  const handleDrag = useCallback((evt: DraggableEvent, ui: DraggableData) => {
    setIsDragging(true);
  }, []);

  const handleDragStop = useCallback(
    (evt: DraggableEvent, ui: DraggableData) => {
      const deltaX = ui.x;
      const t1 = startTimeSec ?? 0;
      const t2 = endTimeSec ?? 1;
      const previousTLeft = visibleStartTimeSec !== undefined ? visibleStartTimeSec : t1;
      const previousXLeft = fracToPixel((previousTLeft - t1) / (t2 - t1));
      const newXLeft = previousXLeft + deltaX;
      const newFracLeft = pixelToFrac(newXLeft);
      const newTLeft = t1 + newFracLeft * (t2 - t1);
      const newTRight = newTLeft + (visibleEndTimeSec ?? 1) - (visibleStartTimeSec ?? 0);
      const newCurrentT = currentTimeSec !== undefined ? currentTimeSec - previousTLeft + newTLeft : undefined;
      if (newCurrentT !== undefined && newTLeft <= newCurrentT && newCurrentT <= newTRight) {
        // setCurrentTime(newCurrentT, {autoScrollVisibleTimeRange: false})
        setCurrentTime(newCurrentT);
      }
      setVisibleTimeRange(newTLeft, newTRight);
      setDragPosition({ x: 0, y: 0 });
      setIsDragging(false);
    },
    [
      setCurrentTime,
      fracToPixel,
      startTimeSec,
      endTimeSec,
      pixelToFrac,
      visibleStartTimeSec,
      visibleEndTimeSec,
      setVisibleTimeRange,
      currentTimeSec,
    ]
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        backgroundColor: 'white',
        userSelect: 'none',
      }}
      onMouseUp={handleMouseUp}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: a0,
          width,
          height: height - a0 * 2,
          backgroundColor: 'lightgray',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x0 - 1,
          top: 0,
          width: 3,
          height: height,
          backgroundColor: 'red',
        }}
      />
      {x1 !== undefined && x2 !== undefined && y1 !== undefined && y2 !== undefined && !hideVisibleTimeRange && (
        <Draggable
          axis="x"
          onDrag={(evt: DraggableEvent, ui: DraggableData) => handleDrag(evt, ui)}
          onStop={(evt: DraggableEvent, ui: DraggableData) => handleDragStop(evt, ui)}
          position={dragPosition}
        >
          <div
            style={{
              position: 'absolute',
              left: y1,
              top: a1,
              width: y2 - y1 + 1,
              height: height - a1 * 2,
              backgroundColor: 'black',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: x1 - y1,
                top: 0,
                width: x2 - x1 + 1,
                height: height - a1 * 2,
                backgroundColor: 'gray',
              }}
            />
          </div>
        </Draggable>
      )}
    </div>
  );
};

export default TimeSelectionBar;
