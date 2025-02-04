import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { SetupScreen } from './components/SetupScreen';
import { PokerTable } from './components/PokerTable';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gray-900">
        {gameStarted ? (
          <PokerTable />
        ) : (
          <SetupScreen onComplete={() => setGameStarted(true)} />
        )}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
    </Provider>
  );
};

export default App;
