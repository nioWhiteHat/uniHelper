import { Link } from "react-router-dom";

interface DashboardMenuProps {
    MenuIsOpen: boolean;
    SetMenuIsOpen: (isOpen: boolean) => void;
}

const DashboardMenu = ({ MenuIsOpen, SetMenuIsOpen }: DashboardMenuProps) => {
    return (
        <div className="DashboardMenu">
            <div className="DashboardClose" onClick={() => SetMenuIsOpen(false)}> x </div>
            <div className="DashboardOptionsContainer">
                <div className="DashboardOption">
                    <Link to = '/MyAccount'> My account </Link>
                </div>
                <div className="DashboardOption">
                    <Link to = '/FindFriend'> Find a friend </Link>
                </div>
                <div className="DashboardOption">
                    <Link to = '/Messages'> Messages </Link>
                </div>
                
            </div>
        </div>
    );
};
export default DashboardMenu;