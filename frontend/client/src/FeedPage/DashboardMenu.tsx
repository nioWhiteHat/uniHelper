import { Link, Outlet } from "react-router-dom";
import { useLogout } from "../useLogout";
import BurgerButton from "./BurgerButton";
import { useState } from "react";
interface DashboardMenuProps {
    MenuIsOpen: boolean;
    SetMenuIsOpen: (isOpen: boolean) => void;
}
interface BurgerButtonProps {
    MenuIsOpen: boolean;
    SetMenuIsOpen: (isOpen: boolean) => void;
    
}

/*const DashboardMenu = ({ MenuIsOpen, SetMenuIsOpen }: DashboardMenuProps) => {
  
    const logout = useLogout(); 

    return (
        <div className="DashboardMenu">
            <div className="DashboardClose" onClick={() => SetMenuIsOpen(false)}> x </div>
            <div className="DashboardOptionsContainer">
       
                <div className="DashboardOption">
                    <Link to='/MyAccount'> My account </Link>
                </div>
                <div className="DashboardOption">
                    <Link to='/Friends'> Find a friend </Link>
                </div>
                <div className="DashboardOption">
                    <Link to='/Messages'> Messages </Link>
                </div>
                <div className="DashboardOption">
                    <Link to='/FeedPage'> Feed </Link>
                </div>
                
              
                <div className="DashboardOption" onClick={logout}>
                    log out
                </div>

            </div>
        </div>
    );
};*/

const DashboardMenuTesting = ({ children }: { children: React.ReactNode })=>{
    const [IsOpen,SetIsOpen] = useState<boolean>(false)
    const logout = useLogout(); 

    return (
        <>
        {IsOpen?(
        <div className="DashboardMenuContainer">
            <div className="DashboardMenu">
                <div className="DashboardClose" onClick={() => SetIsOpen(false)}> x </div>
                <div className="DashboardOptionsContainer">
        
                    <div className="DashboardOption">
                        <Link to='/MyAccount'> My account </Link>
                    </div>
                    <div className="DashboardOption">
                        <Link to='/Friends'> Find a friend </Link>
                    </div>
                    <div className="DashboardOption">
                        <Link to='/Messages'> Messages </Link>
                    </div>
                    <div className="DashboardOption">
                        <Link to='/FeedPage'> Feed </Link>
                    </div>
                    
                
                    <div className="DashboardOption" onClick={logout}>
                        log out
                    </div>

                </div>
            </div>
        </div>):(
        <>
        <BurgerButtonTesting MenuIsOpen={IsOpen} SetMenuIsOpen={SetIsOpen}/>
        </>)}
        <Outlet/>
        
    </>
    );
}

const BurgerButtonTesting = ({ MenuIsOpen, SetMenuIsOpen }: BurgerButtonProps) => {
    return (
        
        <button className={!MenuIsOpen ? "burger-btn" : "burger-btn hidden"} onClick={() => SetMenuIsOpen(true)} aria-label="Menu">
            <span className="burger-line"></span>
            <span className="burger-line"></span>
            <span className="burger-line"></span>
            
        </button>
    );
};
export default DashboardMenuTesting;