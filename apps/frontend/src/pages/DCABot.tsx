/**
 * This file is deprecated.
 * The new DCA Bot page is located at: apps/frontend/src/pages/app/DCABot.tsx
 * 
 * This file is kept as a placeholder to prevent import errors.
 * All DCA Bot functionality has been moved to the new page.
 */

import { Navigate } from 'react-router-dom';

const DCABot = () => {
  // Redirect to the new DCA Bot page
  return <Navigate to="/app/dcabot" replace />;
};

export default DCABot;
