import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import App from './App';
import { RouteFallback } from './components/RouteFallback';

const Home = lazy(() => import('./pages/Home.tsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const Arrays = lazy(() => import('./pages/Arrays.tsx'));
const ArrayDetail = lazy(() => import('./pages/ArrayDetail.tsx'));
const Bridge = lazy(() => import('./pages/Bridge.tsx'));
const Yield = lazy(() => import('./pages/Yield.tsx'));
const About = lazy(() => import('./pages/About.tsx'));

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Suspense fallback={<RouteFallback />}><Home /></Suspense> },
      {
        path: 'dashboard',
        element: <Suspense fallback={<RouteFallback />}><Dashboard /></Suspense>,
      },
      {
        path: 'arrays',
        element: <Suspense fallback={<RouteFallback />}><Arrays /></Suspense>,
      },
      {
        path: 'arrays/:id',
        element: <Suspense fallback={<RouteFallback />}><ArrayDetail /></Suspense>,
      },
      {
        path: 'bridge',
        element: <Suspense fallback={<RouteFallback />}><Bridge /></Suspense>,
      },
      {
        path: 'yield',
        element: <Suspense fallback={<RouteFallback />}><Yield /></Suspense>,
      },
      {
        path: 'about',
        element: <Suspense fallback={<RouteFallback />}><About /></Suspense>,
      },
    ],
  },
]);
