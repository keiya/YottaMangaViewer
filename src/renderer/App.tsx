import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';
import DragAndDrop from './DragAndDrop';'./DragAndDrop'
import React from 'react';

const Hello = () => {
  const reducer = (state:any, action:any) => {
    switch (action.type) {
      case 'SET_DROP_DEPTH':
        return { ...state, dropDepth: action.dropDepth }
      case 'SET_IN_DROP_ZONE':
        return { ...state, inDropZone: action.inDropZone };
      case 'ADD_FILE_TO_LIST':
        return { ...state, fileList: state.fileList.concat(action.files) };
      default:
        return state;
    }
  };
  const [data, dispatch] = React.useReducer(
    reducer, { dropDepth: 0, inDropZone: false, fileList: [] }
  )
  return (
    <div id="wrapper">
      <div id="images">
        <div id="image-left">

        </div>
        <div id="image-right">
          
        </div>
      </div>
      <DragAndDrop data={data} dispatch={dispatch} />
      <ol className="dropped-files">
    {data.fileList.map((f:any) => {
      return (
        <li key={f.name}>{f.name}</li>
      )
    })}
  </ol>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
