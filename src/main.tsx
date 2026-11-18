import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App'
import { store } from '@/store/progress'
import { FirebaseSync } from '@/components/FirebaseSync'
import { AuthGate } from '@/components/AuthGate'
import 'antd/dist/reset.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <FirebaseSync>
        <AuthGate>
          <App />
        </AuthGate>
      </FirebaseSync>
    </Provider>
  </React.StrictMode>,
)
