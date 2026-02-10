import { useState } from "react";
import DashboardMenu from "../FeedPage/DashboardMenu";
import BurgerButton from "../FeedPage/BurgerButton";
import PersonalAccount from "./PersonalAccount";
const PersonalAccountLayout = () => {
  const [DashboardOpen, setDashboardOpen] = useState(false);

  return (
    <>
      
      <PersonalAccount />
    </>
  );
};

export default PersonalAccountLayout;
