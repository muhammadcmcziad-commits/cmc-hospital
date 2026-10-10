import React, { useState } from 'react';
import { HospitalProvider, useHospital } from './context/HospitalContext';
import { Header } from './components/common/Header';
import { LoginScreen } from './components/auth/LoginScreen';
import { NurseDashboard } from './components/nurse/NurseDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LogShiftModal } from './components/nurse/LogShiftModal';
import { PrintRosterModal } from './components/print/PrintRosterModal';

const HospitalAppContent: React.FC = () => {
  const { currentRole, currentNurse } = useHospital();
  
  const [isLogShiftOpen, setIsLogShiftOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // If user is not logged in, show Login Screen
  if (!currentRole) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white transition-colors duration-200">
      {/* Top Navigation Header */}
      <Header
        onOpenLogShift={() => setIsLogShiftOpen(true)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
      />

      {/* Main Role Content */}
      <main className="flex-1 pb-16">
        {currentRole === 'admin' ? (
          <AdminDashboard onOpenPrintModal={() => setIsPrintModalOpen(true)} />
        ) : (
          <NurseDashboard />
        )}
      </main>

      {/* Global Modals */}
      <LogShiftModal
        isOpen={isLogShiftOpen}
        onClose={() => setIsLogShiftOpen(false)}
      />

      <PrintRosterModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <HospitalProvider>
      <HospitalAppContent />
    </HospitalProvider>
  );
}
