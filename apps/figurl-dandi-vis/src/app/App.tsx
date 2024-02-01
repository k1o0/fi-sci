/* eslint-disable @typescript-eslint/no-explicit-any */
import { getFigureData } from "@fi-sci/figurl-interface"
import { useWindowDimensions } from "@fi-sci/misc"
import { useEffect, useReducer, useState } from "react"
import { isViewData } from "./types"
import SpikeTrainsView from "./SpikeTrainsView/SpikeTrainsView"
import { SetupTimeSelection } from "@fi-sci/context-time-selection"
import TuningCurves2DNh5View from "./TuningCurves2DNh5View/TuningCurves2DNh5View"
import { UnitSelectionContext, defaultUnitSelection, unitSelectionReducer } from "@fi-sci/context-unit-selection"

function App() {
  const [data, setData] = useState<any>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const {width, height} = useWindowDimensions()

  useEffect(() => {
    getFigureData().then((data: any) => {
      if (!data) {
        setErrorMessage('No data in return from getFigureData()')
        return
      }
      setData(data)
    }).catch((err: any) => {
      setErrorMessage(`Error getting figure data`)
      console.error(`Error getting figure data`, err)
    })
  }, [])

  const [unitSelection, unitSelectionDispatch] = useReducer(unitSelectionReducer, defaultUnitSelection);

  if (errorMessage) {
    return <div style={{color: 'red'}}>{errorMessage}</div>
  }

  if (!data) {
    return <div>Waiting for figure data...</div>
  }

  console.log('Got data', data)

  if (!isViewData(data)) {
    return <div>Invalid figure data</div>
  }

  if (data.type === 'spike_trains_nh5') {
    return (
      <SetupTimeSelection>
        <SpikeTrainsView
          nh5FileUri={data.nh5_file}
          width={width}
          height={height}
        />
      </SetupTimeSelection>
    )
  }
  else if (data.type == 'tuning_curves_2d_nh5') {
    return (
      <UnitSelectionContext.Provider value={{ unitSelection, unitSelectionDispatch }}>
        <TuningCurves2DNh5View
          nh5FileUri={data.nh5_file}
          width={width}
          height={height}
        />
      </UnitSelectionContext.Provider>
    )
  }
  else {
    return <div>Unsupported figure type: {data.type}</div>
  }
}

export default App;