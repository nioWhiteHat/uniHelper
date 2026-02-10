import { useState } from "react";
import type { Account } from "../Friends/FriendPage";

const CreateGroupChat = ()=>{
    const [myFriends, setMyFriends] = useState<Account[]>([]);
    const [loadingFriends, setLoadingFriends] = useState<boolean>(false);
}