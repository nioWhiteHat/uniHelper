
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./index.css";
import { GoogleOAuthProvider } from '@react-oauth/google';
import SignIn from "./account/SignIn.tsx";
import SignUp from "./account/SignUp.tsx";
import FeedPage from "./FeedPage/FeedLayout.tsx";
import PersonalAccountLayout from "./UsersAccountsView/PersonalAccountLayout.tsx";
import FriendsPage from "./Friends/FriendPage.tsx";
import ViewStudentAccount from "./UsersAccountsView/ViewStudentAccount.tsx";
import ProtectedLayout from "./ProtectedLayout.tsx";
import MessageInbox from "./Messages/MessageInbox.tsx";
import { MyIdProvider } from "./context/me.tsx";
import OpenChat from "./Messages/OpenChat.tsx";
import DashboardMenuTesting from "./FeedPage/DashboardMenu.tsx";

const router = createBrowserRouter([
  {
    path: "/signin",
    element: <SignIn />,
  },
  {
    path: "/SignUp",
    element: <SignUp />,
  },

  
  {
    element: <ProtectedLayout />,
    children: [
      
      
      {
        path: "/",
        element: <Navigate to="/FeedPage" replace />,
      },
      {
        path: "/FeedPage",
        element: <FeedPage />,
      },
      {
        path: "/MyAccount",
        element: <PersonalAccountLayout />,
      },
      {
        path: "/Friends",
        element: <FriendsPage />,
      },
      {
        path: "/UserProfile/:id",
        element: <ViewStudentAccount />,
      },
      {
        path: "/Messages",
        element: <MessageInbox />,
        children: [
          
          {
            path: ":chatId",
            element: <OpenChat />,
          },
        ],
      },
      {
        path: '/Chat/:chatId', 
        element: <OpenChat />  
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId="166943264625-em1456pb12r7ebvof9548b35os24obch.apps.googleusercontent.com">
    <MyIdProvider>
      <RouterProvider router={router} />
    </MyIdProvider>
  </GoogleOAuthProvider>
    
  
    
  
);
