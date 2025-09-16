import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Helper function to create page URLs
export const createPageUrl = (pageName, params = '') => {
  const baseUrl = `/${pageName}`;
  return params ? `${baseUrl}?${params}` : baseUrl;
};

// Component to handle URL case normalization and redirects
const URLRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    
    // Skip redirect for Checkout page to avoid losing parameters
    if (currentPath === '/Checkout' || currentPath.toLowerCase() === '/checkout') {
      return;
    }
    
    // Handle specific redirect cases
    const redirectMap = {
      '/contact': '/Contact',
      '/about': '/About',
      '/faq': '/FAQ',
      '/blog': '/Blog',
      '/programs': '/Programs',
      '/events': '/Events',
      '/home': '/Home',
      '/dashboard': '/Dashboard',
      '/profile': '/Profile',
      '/schools': '/Schools',
      '/tutors': '/Tutors',
    };

    // Check for direct redirects first
    if (redirectMap[currentPath]) {
      navigate(redirectMap[currentPath] + location.search, { replace: true });
      return;
    }

    // Normalize path by capitalizing first letter of each segment
    const normalizedPath = currentPath.split('/').map((segment, index) => {
      if (index === 0) return segment; // Keep empty first segment
      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    }).join('/');

    // If the path has changed after normalization, redirect
    if (currentPath !== normalizedPath) {
      navigate(normalizedPath + location.search, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return null;
};

export default URLRedirect;