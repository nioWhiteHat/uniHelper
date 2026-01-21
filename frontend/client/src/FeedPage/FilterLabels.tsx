import { use, useEffect, useState } from "react";
import { API_URL } from "../config";
interface FilterLabelsProps {
    InterestLabels: Array<number>;
    LessonLabels: Array<number>;
    SetInterestLabels: (labels: Array<number>) => void;
    SetLessonLabels: (labels: Array<number>) => void;
}

const FilterLabels = ({ InterestLabels, LessonLabels, SetInterestLabels, SetLessonLabels }: FilterLabelsProps) => {
    const [availableInterestLabels, setAvailableInterestLabels] = useState<Array<{ id: number; name: string }>>([]);
    const [availableLessonLabels, setAvailableLessonLabels] = useState<Array<{ id: number; name: string, semester: number }>>([]);
    
    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch(`${API_URL}/interests`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => setAvailableInterestLabels(data))
        .catch(error => console.error('Error fetching interest labels:', error));
        fetch(`${API_URL}/lessons`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => setAvailableLessonLabels(data))
        .catch(error => console.error('Error fetching lesson labels:', error));
    }, []);

    const HandleFilterAdditionOrDeletion = (label: number, type: 'interest' | 'lesson') => {
        if (type === 'interest') {
            if (InterestLabels.includes(label)) {
                // FIX: Use 'id' (the value), not 'i' (the index)
                SetInterestLabels(InterestLabels.filter((id) => id !== label)); 
            } else {
                SetInterestLabels([...InterestLabels, label]);
            }
        } else {
            if (LessonLabels.includes(label)) {
                // FIX: Use 'id' (the value), not 'i' (the index)
                SetLessonLabels(LessonLabels.filter((id) => id !== label));
            } else {
                SetLessonLabels([...LessonLabels, label]);
            }
        }
    };
    return (
        <div className="FilterLabelsContainer">
            <div className="InterestLabelsSection">
                <h3>Interest Labels</h3>
                <div className="LabelsList">
                    {availableInterestLabels.map(label => (
                        <button
                            key={label.id}
                            onClick={() => HandleFilterAdditionOrDeletion(label.id, 'interest')}
                            className={InterestLabels.includes(label.id) ? "active" : ""}
                        >
                            {label.name}
                        </button>
                    ))}
                </div>
            </div>
            <div className="LessonLabelsSection">
                <h3>Lesson Labels</h3>
                <div className="LabelsList">
                    {availableLessonLabels.map(label => (
                        <button
                            key={label.id}
                            onClick={() => HandleFilterAdditionOrDeletion(label.id, 'lesson')}
                            className={LessonLabels.includes(label.id) ? "active" : ""}
                        >
                            {label.name} ({label.semester})
                        </button>
                    ))}
                </div>
            </div>
        </div>);
};

export default FilterLabels;