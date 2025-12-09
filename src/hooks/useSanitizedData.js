import { useMemo } from 'react';

/**
 * Hook to sanitize data fetched from Firestore.
 * Ensures all records have necessary fields to prevent crashes.
 * 
 * @param {Array} data - Raw data array from Firestore
 * @param {string} type - Type of data ('transactions', 'accounts', etc.)
 * @returns {Array} - Sanitized data array
 */
const useSanitizedData = (data, type) => {
    return useMemo(() => {
        if (!data || !Array.isArray(data)) return [];

        return data.map(item => {
            const sanitized = { ...item };

            if (type === 'transactions') {
                // Legacy Data Protection: Ensure accountId exists
                if (!sanitized.accountId) {
                    sanitized.accountId = 'legacy_cash';
                }

                // Ensure splits array exists
                if (!sanitized.splits) {
                    sanitized.splits = [];
                }

                // Ensure tags is an array
                if (!sanitized.tags) {
                    sanitized.tags = [];
                }
            }

            return sanitized;
        });
    }, [data, type]);
};

export default useSanitizedData;
