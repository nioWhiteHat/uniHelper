import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { API_URL } from "../config";


interface MyIdContextType {
    id: number;
  
}


const MyIdContext = createContext<MyIdContextType>({
    id: 0,

});

export const useMyId = () => useContext(MyIdContext);

export const MyIdProvider = ({ children }: { children: ReactNode }) => {

    const token = localStorage.getItem("token")
    
    const [id, setID] = useState<number>(0);
    useEffect(()=>{
        fetch(`${API_URL}/getID`,{
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response=>response.json())
        .then((data)=>{
            setID(data)
        })
        .catch(()=>{
            console.log("no id fetched")
        })

    },[token])
   
    return (
        
        <MyIdContext.Provider value={{ id }}>
            {children}
        </MyIdContext.Provider>
    );
}