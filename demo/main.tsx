import { createRoot } from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';
import './fonts.css';

// Reuse the game directly; the static demo does not need an RSC/Worker server.
createRoot(document.getElementById('root')!).render(<Home />);
