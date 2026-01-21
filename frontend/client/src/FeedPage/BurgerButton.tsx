import 'NavBar.css';
interface BurgerButtonProps {
    MenuIsOpen: boolean;
    SetMenuIsOpen: (isOpen: boolean) => void;
    
}
const BurgerButton = ({ MenuIsOpen, SetMenuIsOpen }: BurgerButtonProps) => {
    return (
        
        <button className={!MenuIsOpen ? "burger-btn" : "burger-btn hidden"} onClick={() => SetMenuIsOpen(true)} aria-label="Menu">
            <span className="burger-line"></span>
            <span className="burger-line"></span>
            <span className="burger-line"></span>
        </button>
    );
};
export default BurgerButton;