import React from 'react';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import store from './store';
import SourceProject from './components/SourceProject';

function App() {
  return (
    <Provider store={store}>
      <Toaster
        position="bottom-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            border: '1px solid #ccc',
            background: '#000',
            color: '#fff',
          },
        }}
      />
      <SourceProject />
    </Provider>
  );
}

export default App;
