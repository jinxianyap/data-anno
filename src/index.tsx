import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import configureStore from './configureStore';
import { Provider } from 'react-redux';

export const store = configureStore();

ReactDOM.render(
    (<Provider store={store}>
        <App/>
    </Provider>),
    document.getElementById('root') || document.createElement('div') // fix for testing purposes
);

serviceWorker.unregister();
