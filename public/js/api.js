const STORAGE_KEY = 'Cost2Class_Data_v1';

export const fetchData = async () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        // Return default structure if empty
        return {
            uniform: [],
            stationery: [],
            admin: [],
            fees: []
        };
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
    }
};

export const saveData = async (data) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
};
