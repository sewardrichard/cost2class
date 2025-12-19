export const calculateAnnualFee = (item) => {
    const price = parseFloat(item.price) || 0;
    const qty = parseFloat(item.qty) || 1;
    const baseAmount = price * qty;

    switch (item.frequency) {
        case 'Monthly':
            return baseAmount * 12;
        case 'Per Term':
            return baseAmount * 4;
        case 'Annually':
        case 'Once-off':
        default:
            return baseAmount;
    }
};

export const calculateCategoryTotal = (items, useNormalization = false) => {
    return items.reduce((sum, item) => {
        if (useNormalization) {
            return sum + calculateAnnualFee(item);
        }
        return sum + (item.price * item.qty);
    }, 0);
};

export const calculateCategorySpent = (items, useNormalization = false) => {
    return items
        .filter(item => item.checked)
        .reduce((sum, item) => {
            if (useNormalization) {
                return sum + calculateAnnualFee(item);
            }
            return sum + (item.price * item.qty);
        }, 0);
};

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
    }).format(amount).replace('ZAR', 'R');
};
