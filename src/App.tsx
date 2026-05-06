import { InterviewPage } from './pages/Interview';
import { LandingPage } from './pages/Landing';

export default function App() {
  const path = window.location.pathname;
  if (path === '/interview') return <InterviewPage />;
  return <LandingPage />;
}
