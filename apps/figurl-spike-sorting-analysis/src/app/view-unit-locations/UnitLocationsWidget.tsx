/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from 'react';
import { computeElectrodeLocations, defaultColors, ElectrodeColors } from '../view-average-waveforms';
import { getUnitColor, idToNum, useSelectedUnitIds } from '@fi-sci/context-unit-selection';
import useWheelZoom from '../view-average-waveforms/WaveformWidget/sharedDrawnComponents/useWheelZoom';
import {
  AffineTransform,
  applyAffineTransform,
  applyAffineTransformInv,
  detAffineTransform,
} from '../view-average-waveforms/WaveformWidget/sharedDrawnComponents/AffineTransform';
import {
  BaseCanvas,
  RectangularRegion,
  Vec2,
  Vec4,
  pointInRect,
  rectangularRegionsIntersect,
  transformPoint,
} from '../figurl-canvas';
import { useDragSelectLayer } from '../drag-select';

export const defaultMaxPixelRadius = 25;
const circle = 2 * Math.PI;

export type Electrode = {
  id: number | string;
  label: string;
  x: number;
  y: number;
};

export type PixelSpaceElectrode = {
  e: Electrode;
  pixelX: number;
  pixelY: number;
};

export type LayoutMode = 'geom' | 'vertical';

interface WidgetProps {
  electrodes: Electrode[];
  width: number;
  height: number;
  units: {
    unitId: string | number;
    x: number;
    y: number;
  }[];
  colors?: ElectrodeColors;
  showLabels?: boolean;
  maxElectrodePixelRadius?: number;
  offsetLabels?: boolean;
  disableAutoRotate?: boolean;
  onlyShowSelected?: boolean;
}

const defaultElectrodeLayerProps = {
  showLabels: true,
  maxElectrodePixelRadius: defaultMaxPixelRadius,
};

const emptyDrawData = {};

const markerRadius = 8;

const UnitLocationsWidget = (props: WidgetProps) => {
  const { width, height, electrodes, units, disableAutoRotate, onlyShowSelected } = props;
  // const { selectedElectrodeIds } = useSelectedElectrodes()
  const { selectedUnitIds, unitIdSelectionDispatch } = useSelectedUnitIds();
  const { affineTransform, handleWheel } = useWheelZoom(width, height, {
    shift: true,
    alt: false,
  });

  const selectedUnitIdsSet = useMemo(() => new Set([...selectedUnitIds]), [selectedUnitIds]);

  const filteredUnits = units
    .filter((u) => (onlyShowSelected ? selectedUnitIdsSet.has(u.unitId) : true))
    .filter((u) => {
      if (u.x === null || u.y === null) {
        console.warn(`Unit ${u.unitId} has location null.`);
        return false;
      }
      return true;
    })
    .sort((u1, u2) => {
      // sort so that selected units are on top
      if (selectedUnitIdsSet.has(u1.unitId) && !selectedUnitIdsSet.has(u2.unitId)) return 1;
      if (!selectedUnitIdsSet.has(u1.unitId) && selectedUnitIdsSet.has(u2.unitId)) return -1;
      return idToNum(u1.unitId) - idToNum(u2.unitId);
    });

  const maxElectrodePixelRadius = props.maxElectrodePixelRadius || defaultElectrodeLayerProps.maxElectrodePixelRadius;
  const colors = props.colors ?? defaultColors;
  const showLabels = props.showLabels ?? false;
  const offsetLabels = props.offsetLabels ?? false;

  const {
    convertedElectrodes: pixelElectrodes,
    pixelRadius,
    transform,
  } = useMemo(
    () => computeElectrodeLocations(width, height, electrodes, 'geom', maxElectrodePixelRadius, { disableAutoRotate }),
    [electrodes, height, maxElectrodePixelRadius, width, disableAutoRotate]
  );

  const radiusScale = Math.sqrt(detAffineTransform(affineTransform));

  const paintElectrodes = useCallback(
    (ctxt: CanvasRenderingContext2D, props: any) => {
      const pixelRadius2 = pixelRadius * radiusScale;
      // set up fills
      const electrodesWithColors = pixelElectrodes.map((e) => {
        // const selected = (selectedElectrodeIds || []).includes(e.e.id)
        const selected = false;
        const hovered = false;
        const dragged = false;
        const color = selected
          ? dragged
            ? colors.draggedSelected
            : hovered
            ? colors.selectedHover
            : colors.selected
          : dragged
          ? colors.dragged
          : hovered
          ? colors.hover
          : colors.base;
        return {
          ...e,
          color: color,
          textColor: selected || (hovered && !dragged) ? colors.textDark : colors.textLight,
        };
      });

      ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);
      // Draw fills
      // all-colors-at-once style: involves a lot fewer strokes & state resets but probably not enough to matter
      // (or to justify the extra complication of breaking out the electrodes into subgroups)
      // electrodesWithColors.sort((a, b) => { return a.color.localeCompare(b.color) })
      // let lastColor = ''
      // electrodesWithColors.forEach(e => {
      //     if (lastColor !== e.color) {
      //         ctxt.fill()
      //         lastColor = e.color
      //         ctxt.fillStyle = e.color
      //         ctxt.beginPath()
      //     }
      // })
      electrodesWithColors.forEach((e) => {
        const pt = applyAffineTransform(affineTransform, {
          x: e.pixelX,
          y: e.pixelY,
        });
        ctxt.fillStyle = e.color;
        ctxt.beginPath();
        ctxt.ellipse(pt.x, pt.y, pixelRadius2, pixelRadius2, 0, 0, circle);
        ctxt.fill();
      });

      // Draw borders
      ctxt.strokeStyle = defaultColors.border;
      pixelElectrodes.forEach((e) => {
        const pt = applyAffineTransform(affineTransform, {
          x: e.pixelX,
          y: e.pixelY,
        });
        ctxt.beginPath();
        ctxt.ellipse(pt.x, pt.y, pixelRadius2, pixelRadius2, 0, 0, circle);
        ctxt.stroke();
      });

      // draw electrode labels
      if (showLabels) {
        ctxt.font = `${pixelRadius2}px Arial`;
        ctxt.textAlign = offsetLabels ? 'right' : 'center';
        ctxt.textBaseline = 'middle';
        const xOffset = offsetLabels ? 1.4 * pixelRadius2 : 0;
        electrodesWithColors.forEach((e) => {
          const pt = applyAffineTransform(affineTransform, {
            x: e.pixelX,
            y: e.pixelY,
          });
          ctxt.fillStyle = offsetLabels ? colors.textDark : e.textColor;
          ctxt.fillText(`${e.e.label}`, pt.x - xOffset, pt.y);
        });
      }
    },
    [colors, offsetLabels, pixelElectrodes, pixelRadius, showLabels, affineTransform, radiusScale]
  );

  const paintUnits = useCallback(
    (ctxt: CanvasRenderingContext2D, props: any) => {
      // const markerRadius2 = markerRadius * radiusScale
      const markerRadius2 = markerRadius;
      ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);
      const drawUnit = (x: number, y: number, color: string) => {
        ctxt.fillStyle = color;
        ctxt.strokeStyle = 'black';
        ctxt.beginPath();
        ctxt.ellipse(x, y, markerRadius2, markerRadius2, 0, 0, circle);
        ctxt.fill();
        ctxt.stroke();
      };
      for (const unit of filteredUnits) {
        const pt0 = transformPoint(transform, [unit.x, unit.y]);
        const pt = applyAffineTransform(affineTransform, {
          x: pt0[0],
          y: pt0[1],
        });
        const col =
          selectedUnitIds.size === 0 || selectedUnitIds.has(unit.unitId)
            ? getUnitColor(unit.unitId)
            : 'rgb(220, 220, 220)';
        drawUnit(pt.x, pt.y, col);
      }
    },
    [transform, filteredUnits, selectedUnitIds, affineTransform]
  );

  const electrodeGeometryCanvas = useMemo(() => {
    return <BaseCanvas width={width} height={height} draw={paintElectrodes} drawData={emptyDrawData} />;
  }, [width, height, paintElectrodes]);

  const unitsCanvas = useMemo(() => {
    return <BaseCanvas width={width} height={height} draw={paintUnits} drawData={emptyDrawData} />;
  }, [width, height, paintUnits]);

  const handleSelectRect = useCallback(
    (r: Vec4, { ctrlKey }: { ctrlKey: boolean }) => {
      const r2 = applyAffineTransformToRectInv(affineTransform, r);
      const det = detAffineTransform(affineTransform);
      const radius2 = markerRadius / Math.sqrt(det);
      const ids: (number | string)[] = [];
      for (const unit of filteredUnits) {
        const pt = transformPoint(transform, [unit.x, unit.y]);
        if (
          rectangularRegionsIntersect(
            rectangularRegion([pt[0] - radius2, pt[1] - radius2, radius2 * 2, radius2 * 2]),
            rectangularRegion(r2)
          )
        ) {
          rectangularRegion([pt[0] - radius2, pt[1] - radius2, radius2 * 2, radius2 * 2]);
          ids.push(unit.unitId);
        }
      }
      if (ctrlKey) {
        for (const id of ids) {
          unitIdSelectionDispatch({
            type: 'TOGGLE_UNIT',
            targetUnit: id,
          });
        }
      } else {
        unitIdSelectionDispatch({
          type: 'SET_SELECTION',
          incomingSelectedUnitIds: ids,
        });
      }
    },
    [transform, unitIdSelectionDispatch, filteredUnits, affineTransform]
  );

  const handleClickPoint = useCallback(
    (x: Vec2, { ctrlKey }: { ctrlKey: boolean }) => {
      let somethingFound = false;
      for (const unit of filteredUnits) {
        const pt = transformPoint(transform, [unit.x, unit.y]);
        if (
          pointInRect(
            x,
            rectangularRegion([pt[0] - markerRadius, pt[1] - markerRadius, markerRadius * 2, markerRadius * 2])
          )
        ) {
          somethingFound = true;
          if (ctrlKey) {
            unitIdSelectionDispatch({
              type: 'TOGGLE_UNIT',
              targetUnit: unit.unitId,
            });
          } else {
            unitIdSelectionDispatch({
              type: 'SET_SELECTION',
              incomingSelectedUnitIds: [unit.unitId],
            });
          }
        }
      }
      if (!somethingFound) {
        unitIdSelectionDispatch({
          type: 'SET_SELECTION',
          incomingSelectedUnitIds: [],
        });
      }
    },
    [transform, unitIdSelectionDispatch, filteredUnits]
  );

  const { onMouseMove, onMouseDown, onMouseUp, paintDragSelectLayer } = useDragSelectLayer(
    width,
    height,
    handleSelectRect,
    handleClickPoint
  );
  const dragSelectCanvas = useMemo(() => {
    return <BaseCanvas width={width} height={height} draw={paintDragSelectLayer} drawData={emptyDrawData} />;
  }, [width, height, paintDragSelectLayer]);

  return width > 0 && height > 0 ? (
    <div
      style={{ width, height, position: 'relative' }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseDown={onMouseDown}
      onWheel={handleWheel}
    >
      {electrodeGeometryCanvas}
      {unitsCanvas}
      {dragSelectCanvas}
    </div>
  ) : (
    <div />
  );
};

const rectangularRegion = (r: Vec4): RectangularRegion => {
  return {
    xmin: r[0],
    ymin: r[1],
    xmax: r[0] + r[2],
    ymax: r[1] + r[3],
  };
};

// const applyAffineTransformToRect = (T: AffineTransform, r: Vec4): Vec4 => {
//     const p00 = applyAffineTransform(T, {x: r[0], y: r[1]})
//     const p11 = applyAffineTransform(T, {x: r[0] + r[2], y: r[1] + r[3]})
//     return [p00.x, p00.y, p11.x - p00.x, p11.y - p00.y]
// }

const applyAffineTransformToRectInv = (T: AffineTransform, r: Vec4): Vec4 => {
  const p00 = applyAffineTransformInv(T, { x: r[0], y: r[1] });
  const p11 = applyAffineTransformInv(T, { x: r[0] + r[2], y: r[1] + r[3] });
  return [p00.x, p00.y, p11.x - p00.x, p11.y - p00.y];
};

export default UnitLocationsWidget;
