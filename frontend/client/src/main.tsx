import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter,Navigate,RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import SignIn from './account/SignIn.tsx'
import SignUp from './account/SignUp.tsx'
import FeedPage from './FeedPage/FeedLayout.tsx'
import PersonalAccount from './UsersAccountsView/PersonalAccount.tsx'
const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/signin" replace />
  },
  
  // 2. Your actual Sign In page
  {
    path: '/signin',
    element: <SignIn /> // Eventually replace <App/> with <SignIn/>
  },

  // 3. Your Sign Up page
  {
    path: '/SignUp',
    element: <SignUp /> // Eventually replace <App/> with <SignUp/>
  },
  {
    path :'/FeedPage',
    element: <FeedPage/>
  },
  {
    path: '/MyAccount',
    element: <PersonalAccount/>
  }



])
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
