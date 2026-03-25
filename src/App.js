import React from 'react';
import { Provider } from 'react-redux';
import store from './store';
import SourceProject from './components/SourceProject';

function App() {
  return (
    <Provider store={store}>
      <SourceProject />
    </Provider>
  );
}

export default App;
