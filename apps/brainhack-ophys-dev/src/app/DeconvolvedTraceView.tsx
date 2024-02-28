import { FunctionComponent, useMemo } from "react";
import { ROIsData } from './GetData'
import Plot from 'react-plotly.js';

type Props = {
    rois: ROIsData
    height: number
    selectedRois: number[]
}



const DeconvolvedTraceComponent: FunctionComponent<Props> = ({rois, height, selectedRois}) => {

    // constructor(props) {
    //     super(props);
    //     this.state = {data: [], layout: {}, frames: [], config: {}};
    //   }
    
    if(rois.validate() !== true) { 
        console.log('variable series length data')
        return
    }
    const heightPadding = 1
    const data: object[] = []
    // TODO this should use entries and ROI IDs may be incomplete list
    useMemo(() => {
        const heightPadding = 1
        const data: object[] = []
        let i = 0;
        for (const [id, arr] of rois.trace) {
            const offset = heightPadding * i
            data.push({
                y: arr.map((x: number) => x + offset),
                x: rois.time,
                mode: 'lines',
                name: 'ROI #' + id,
            })
            i++
        }
    }, [selectedRois]);
    
    const xAxisLabel = 'Time (s)'
    const yAxisLabel = 'ROI id'
    const defRange = 10  // seconds
    const totalLength = rois.time[rois.time.length - 1] - rois.time[0]
    const range = [rois.time[0], rois.time[0] + Math.min(defRange, totalLength)];
    return (
        <Plot
            data={data}
            layout={{
                height,
                xaxis: {
                    title: xAxisLabel,
                    range: range,
                },
                yaxis: {
                    title: yAxisLabel,
                    visible: false,
                    showticklabels: false
                },
                margin: {
                    l: 50,
                    r: 10,
                    t: 10,
                    b: 50
                },
                showlegend: true
            }}
            useResizeHandler={true}
            style={{width: '100%'}}
        />
    )
}

export {DeconvolvedTraceComponent, ROIsData}