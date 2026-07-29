/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LoadingScreen } from './components/LoadingScreen';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ServicesPage } from './pages/ServicesPage';
import { PlansPage } from './pages/PlansPage';
import { RegisterPage } from './pages/RegisterPage';
import { PayFeePage } from './pages/PayFeePage';
import { TrainersPage } from './pages/TrainersPage';
import { GalleryPage } from './pages/GalleryPage';
import { ContactPage } from './pages/ContactPage';
import { LegalPage } from './pages/LegalPage';
import { RegistrationSuccessPage } from './pages/RegistrationSuccessPage';
import { FeePaymentSuccessPage } from './pages/FeePaymentSuccessPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);
  // Current Path State
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Query Params State
  const [params, setParams] = useState<Record<string, string>>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const p: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      p[key] = value;
    });
    return p;
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      const searchParams = new URLSearchParams(window.location.search);
      const p: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        p[key] = value;
      });
      setParams(p);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (path: string, newParams?: Record<string, string>) => {
    setCurrentPath(path);
    if (newParams) {
      setParams(newParams);
      const queryString = new URLSearchParams(newParams).toString();
      window.history.pushState({}, '', queryString ? `${path}?${queryString}` : path);
    } else {
      setParams({});
      window.history.pushState({}, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isAdminRoute = currentPath.startsWith('/admin');

  const renderPage = () => {
    if (isAdminRoute) {
      return <AdminPage currentPath={currentPath} onNavigate={handleNavigate} />;
    }

    switch (currentPath) {
      case '/':
        return <HomePage onNavigate={handleNavigate} />;
      case '/about':
        return <AboutPage onNavigate={handleNavigate} />;
      case '/services':
        return <ServicesPage onNavigate={handleNavigate} />;
      case '/plans':
        return <PlansPage onNavigate={handleNavigate} />;
      case '/register':
        return <RegisterPage initialPlanId={params.plan} onNavigate={handleNavigate} />;
      case '/registration-success':
        return (
          <RegistrationSuccessPage
            data={{
              registrationReferenceNumber: params.registrationRef,
              fullName: params.fullName,
              selectedPlan: params.selectedPlan,
              status: params.status,
            }}
            onNavigate={handleNavigate}
          />
        );
      case '/pay-fee':

        return (
          <PayFeePage
            initialRegistrationRef={params.registrationRef}
            initialRoll={params.roll}
            onNavigate={handleNavigate}
          />
        );
      case '/fee-payment-success':
        return (
          <FeePaymentSuccessPage
            data={{
              feeReferenceNumber: params.feeReferenceNumber,
              registrationReferenceNumber: params.registrationReferenceNumber,
              rollNumber: params.rollNumber,
              memberName: params.memberName,
              amountSubmitted: params.amountSubmitted,
              paymentStatus: params.paymentStatus || 'Pending Verification',
              currentFee: params.currentFee,
              previousBalance: params.previousBalance,
              discount: params.discount,
              totalPayable: params.totalPayable,
              amountPaid: params.amountPaid || params.amountSubmitted,
              remainingBalance: params.remainingBalance,
            }}
            onNavigate={handleNavigate}
          />
        );
      case '/trainers':
        return <TrainersPage onNavigate={handleNavigate} />;
      case '/gallery':
        return <GalleryPage />;
      case '/contact':
        return <ContactPage />;
      case '/terms':
        return <LegalPage type="terms" />;
      case '/privacy':
        return <LegalPage type="privacy" />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  if (initialLoading) {
    return <LoadingScreen fullScreen message="Loading AB Gym Portal..." />;
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Sticky Top Navbar for Public Pages */}
      {!isAdminRoute && <Navbar currentPath={currentPath} onNavigate={handleNavigate} />}

      {/* Main Page View Area */}
      <main className="flex-1">{renderPage()}</main>

      {/* Footer for Public Pages */}
      {!isAdminRoute && <Footer onNavigate={handleNavigate} />}
    </div>
  );
}
