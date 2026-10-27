import { createRoot } from 'react-dom/client'
import { io } from 'socket.io-client'
import './index.css'
import init from './init.jsx'

const app = async () => {
  const socket = io()
  const root = createRoot(document.querySelector('#root'))
  root.render(await init(socket))
}

app()
