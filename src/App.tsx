import { Route, Routes } from 'react-router-dom';
import { InterviewPage } from '@/pages/Interview';
import { LandingPage } from '@/pages/Landing';
import { OptimizePage } from '@/pages/Optimize';
import { ReportPage } from '@/pages/Report';
import { UploadPage } from '@/pages/Upload';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
      <Route path="/optimize" element={<ProtectedRoute><OptimizePage /></ProtectedRoute>} />
      <Route path="/interview" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
      <Route path="/report/:id" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
      <Route path="*" element={<div className="p-6">Not Found</div>} />
    </Routes>
  );
}
